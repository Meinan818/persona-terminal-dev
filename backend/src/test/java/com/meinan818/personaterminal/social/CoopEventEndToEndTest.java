package com.meinan818.personaterminal.social;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * D22 的端到端验收：**两个合成账号**在真实 HTTP + 真实数据库（隔离库）上跑完
 * 「操作 → 通知 → 接收」，并覆盖重复请求与越权两个边界。
 *
 * <p>为什么不能只靠单元测试：{@code CoopEventServiceUnitTest} 用的是 mock mapper，
 * 断言的是"Service 被调用了"；而这里走的是 JWT 鉴权 → 关系校验 → 落库 →
 * 收件人拉通知列表的完整链路，收件人拿到的是真实写进 social_notifications 的行。
 *
 * <p>链路：A、B 各自注册 → A 向 B 发起 COOP → B 接受（真实 linked bond）→
 * A 广播互动事件 → B 拉通知能看到（fromId=A、payload.kind=coop_event、event_id 一致）
 * → A 重发同一事件不产生第二条 → 无羁绊的 C 广播被拒。
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class CoopEventEndToEndTest {

    @Autowired
    private TestRestTemplate rest;

    private record Session(String token, String id, String name) {}

    /** 注册一个合成账号（UserID 唯一，避免同一库重复跑时撞唯一性） */
    private Session register(String namePrefix) {
        String email = namePrefix + "-" + UUID.randomUUID() + "@example.com";
        String name = namePrefix + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        ResponseEntity<Map> res = rest.postForEntity("/api/velvet/register",
                Map.of("email", email, "password", "pw-123456", "name", name), Map.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<?, ?> body = res.getBody();
        Map<?, ?> record = (Map<?, ?>) body.get("record");
        return new Session((String) body.get("token"), (String) record.get("id"), name);
    }

    private HttpHeaders bearer(String token) {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        h.setBearerAuth(token);
        return h;
    }

    private ResponseEntity<Map> post(String path, String token, Map<String, Object> body) {
        return rest.exchange(path, HttpMethod.POST, new HttpEntity<>(body, bearer(token)), Map.class);
    }

    /** A 向 B 发起并让 B 接受，返回 linked 的 bond id */
    private String linkCoop(Session a, Session b) {
        Map<String, Object> propose = new HashMap<>();
        propose.put("targetUserId", b.name());
        propose.put("arcanaId", "the_fool");
        propose.put("orientation", "upright");
        propose.put("intimacyLevel", 1);
        propose.put("skillAttribute", "kindness");
        propose.put("message", "端到端测试");
        ResponseEntity<Map> proposed = post("/api/social/coop/bonds/propose", a.token(), propose);
        assertThat(proposed.getStatusCode()).isEqualTo(HttpStatus.OK);
        String bondId = String.valueOf(proposed.getBody().get("id"));
        assertThat(bondId).isNotBlank();

        Map<String, Object> accept = new HashMap<>();
        accept.put("arcanaId", "the_magician");
        accept.put("orientation", "upright");
        accept.put("intimacyLevel", 1);
        accept.put("skillAttribute", "dexterity");
        ResponseEntity<Map> accepted = post("/api/social/coop/bonds/" + bondId + "/accept", b.token(), accept);
        assertThat(accepted.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(accepted.getBody().get("status")).isEqualTo("linked");
        return bondId;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> notificationsOf(Session s) {
        ResponseEntity<Map> res = rest.exchange("/api/social/notifications", HttpMethod.GET,
                new HttpEntity<>(bearer(s.token())), Map.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        return (List<Map<String, Object>>) res.getBody().get("items");
    }

    private static long countCoopEvents(List<Map<String, Object>> items, String eventId) {
        return items.stream().filter(n -> {
            Object payload = n.get("payload");
            if (!(payload instanceof Map<?, ?> p)) return false;
            return "coop_event".equals(p.get("kind")) && eventId.equals(String.valueOf(p.get("event_id")));
        }).count();
    }

    private Map<String, Object> eventBody(Session recipient, String eventId) {
        Map<String, Object> body = new HashMap<>();
        body.put("recipientId", recipient.id());
        body.put("eventId", eventId);
        body.put("date", LocalDate.now().toString());
        body.put("delta", 2);
        body.put("narrative", "端到端：合成解读");
        body.put("advice", "端到端：合成建议");
        body.put("userInput", "端到端：合成互动");
        return body;
    }

    @Test
    void 双合成账号操作到接收到重复请求不重复() {
        Session a = register("e2ea");
        Session b = register("e2eb");
        linkCoop(a, b);

        String eventId = "e2e-event-" + UUID.randomUUID();

        // 操作 → 通知
        ResponseEntity<Map> first = post("/api/social/coop/events", a.token(), eventBody(b, eventId));
        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(first.getBody().get("created")).isEqualTo(true);

        // 接收：B 拉得到这条，且能认出是谁发的
        List<Map<String, Object>> bItems = notificationsOf(b);
        assertThat(countCoopEvents(bItems, eventId)).isEqualTo(1);
        Map<String, Object> received = bItems.stream().filter(n -> {
            Object payload = n.get("payload");
            return payload instanceof Map<?, ?> p && eventId.equals(String.valueOf(p.get("event_id")));
        }).findFirst().orElseThrow();
        assertThat(received.get("userId")).isEqualTo(b.id());
        assertThat(received.get("fromId")).isEqualTo(a.id());
        assertThat(received.get("type")).isEqualTo("event_logged");
        assertThat(received.get("read")).isEqualTo(false);

        // 重复请求：不新建第二条
        ResponseEntity<Map> again = post("/api/social/coop/events", a.token(), eventBody(b, eventId));
        assertThat(again.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(again.getBody().get("created")).isEqualTo(false);
        assertThat(countCoopEvents(notificationsOf(b), eventId)).isEqualTo(1);
    }

    @Test
    void 没有羁绊的第三方广播被拒() {
        Session a = register("e2ex");
        Session b = register("e2ey");
        Session c = register("e2ez");
        linkCoop(a, b);

        // C 与 B 没有羁绊 → 拒；即使 C 谎报 recipientId 也一样
        ResponseEntity<Map> forged = post("/api/social/coop/events", c.token(),
                eventBody(b, "e2e-forged-" + UUID.randomUUID()));
        assertThat(forged.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        // A 也不能把事件广播给自己
        ResponseEntity<Map> self = post("/api/social/coop/events", a.token(),
                eventBody(a, "e2e-self-" + UUID.randomUUID()));
        assertThat(self.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
}
