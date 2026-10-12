package com.meinan818.personaterminal.social;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 通知中心读取接口集成测试（社交迁移 W2）。
 *
 * 覆盖：A 向 B 发好友申请 → B 拉通知列表看到 friend_request（含对方档案与
 * snake_case payload 的 friendship_id，供前端「接受/拒绝」按钮用）→ 标记已读 →
 * 删除；以及越权（拿不到别人的通知）。
 *
 * 关键契约：前端 NotificationsPanel 读 n.payload?.friendship_id（snake_case），
 * 不是后端早期 notify() 写的 friendshipId（camelCase）——本测试钉死这层。
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class NotificationControllerTest {

    @Autowired
    private TestRestTemplate rest;

    private record Acct(String token, String id, String name) {}

    private Acct register(String name) {
        String email = "notif-" + UUID.randomUUID() + "@example.com";
        Map<String, Object> body = Map.of("email", email, "password", "pw-123456", "name", name);
        ResponseEntity<Map> res = rest.postForEntity("/api/velvet/register", body, Map.class);
        assertThat(res.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        Map<?, ?> rec = (Map<?, ?>) res.getBody().get("record");
        return new Acct((String) res.getBody().get("token"), (String) rec.get("id"), name);
    }

    private static HttpHeaders bearer(String token) {
        HttpHeaders h = new HttpHeaders();
        h.setBearerAuth(token);
        h.setContentType(MediaType.APPLICATION_JSON);
        return h;
    }

    private ResponseEntity<Map> get(String token, String url) {
        RestTemplate raw = rawTemplate();
        return raw.exchange(rest.getRootUri() + url, HttpMethod.GET,
                new HttpEntity<>(bearer(token)), Map.class);
    }

    private ResponseEntity<Map> post(String token, String url, Object body) {
        RestTemplate raw = rawTemplate();
        return raw.exchange(rest.getRootUri() + url, HttpMethod.POST,
                new HttpEntity<>(body, bearer(token)), Map.class);
    }

    private ResponseEntity<Map> delete(String token, String url) {
        RestTemplate raw = rawTemplate();
        return raw.exchange(rest.getRootUri() + url, HttpMethod.DELETE,
                new HttpEntity<>(bearer(token)), Map.class);
    }

    private RestTemplate rawTemplate() {
        RestTemplate raw = new RestTemplate(new org.springframework.http.client.JdkClientHttpRequestFactory());
        raw.setErrorHandler(new org.springframework.web.client.ResponseErrorHandler() {
            @Override public boolean hasError(org.springframework.http.client.ClientHttpResponse r) { return false; }
            @Override public void handleError(org.springframework.http.client.ClientHttpResponse r) { }
        });
        return raw;
    }

    @SuppressWarnings("unchecked")
    @Test
    void 收到好友申请后能在通知列表看到并可标读删除() {
        Acct a = register("na" + UUID.randomUUID().toString().substring(0, 6));
        Acct b = register("nb" + UUID.randomUUID().toString().substring(0, 6));

        // 初始：B 没有通知
        ResponseEntity<Map> empty = get(b.token(), "/api/social/notifications");
        assertThat(empty.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        assertThat((List<?>) empty.getBody().get("items")).isEmpty();

        // A → B 发申请
        ResponseEntity<Map> req = post(a.token(), "/api/social/friends/request",
                Map.of("targetId", b.id(), "message", "hi"));
        assertThat(req.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        String friendshipId = (String) req.getBody().get("id");

        // B 拉通知：1 条 friend_request，带发起人档案 + snake_case friendship_id
        ResponseEntity<Map> list = get(b.token(), "/api/social/notifications");
        assertThat(list.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        List<Map<String, Object>> items = (List<Map<String, Object>>) list.getBody().get("items");
        assertThat(items).hasSize(1);
        Map<String, Object> n = items.get(0);
        assertThat(n.get("type")).isEqualTo("friend_request");
        assertThat(n.get("read")).isEqualTo(false);
        assertThat(n.get("userId")).isEqualTo(b.id());
        // 发件人 id + 展开档案（前端渲染头像/昵称用）
        assertThat(n.get("fromId")).isEqualTo(a.id());
        Map<String, Object> profile = (Map<String, Object>) n.get("fromProfile");
        assertThat(profile).isNotNull();
        assertThat(profile.get("id")).isEqualTo(a.id());
        assertThat(profile).doesNotContainKey("email"); // 隐私：email 永不出去
        // payload 的 friendship_id（前端「接受」按钮读这个键）
        Map<String, Object> payload = (Map<String, Object>) n.get("payload");
        assertThat(payload.get("friendship_id")).isEqualTo(friendshipId);

        // 标记已读
        String nid = (String) n.get("id");
        ResponseEntity<Map> read = post(b.token(), "/api/social/notifications/" + nid + "/read", Map.of());
        assertThat(read.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        List<Map<String, Object>> after = (List<Map<String, Object>>) get(b.token(), "/api/social/notifications").getBody().get("items");
        assertThat(after.get(0).get("read")).isEqualTo(true);

        // 删除
        ResponseEntity<Map> del = delete(b.token(), "/api/social/notifications/" + nid);
        assertThat(del.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        assertThat((List<?>) get(b.token(), "/api/social/notifications").getBody().get("items")).isEmpty();
    }

    @SuppressWarnings("unchecked")
    @Test
    void 拿不到别人的通知也不能动别人的通知() {
        Acct a = register("nc" + UUID.randomUUID().toString().substring(0, 6));
        Acct b = register("nd" + UUID.randomUUID().toString().substring(0, 6));
        Acct c = register("ne" + UUID.randomUUID().toString().substring(0, 6));

        post(a.token(), "/api/social/friends/request", Map.of("targetId", b.id()));
        List<Map<String, Object>> bList = (List<Map<String, Object>>) get(b.token(), "/api/social/notifications").getBody().get("items");
        assertThat(bList).hasSize(1);
        String bNotifId = (String) bList.get(0).get("id");

        // C 看不到 B 的通知
        assertThat((List<?>) get(c.token(), "/api/social/notifications").getBody().get("items")).isEmpty();
        // C 也不能标记/删除 B 的通知 → 404
        assertThat(post(c.token(), "/api/social/notifications/" + bNotifId + "/read", Map.of()).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND);
        assertThat(delete(c.token(), "/api/social/notifications/" + bNotifId).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND);
    }
}
