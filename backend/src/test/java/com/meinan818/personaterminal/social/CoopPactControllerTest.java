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

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 一起进步约定（CoopPact）接口集成测试 —— 社交迁移 W3 第三波。
 *
 * <p>契约对齐前端 {@code src/services/coopPacts.ts}：
 *  · GET  /api/social/pacts                    → {items:[CoopPact]}（与我相关）
 *  · POST /api/social/pacts                    → 发起（pending）
 *  · POST /api/social/pacts/{id}/respond       → 接受(active) / 婉拒(declined)
 *  · POST /api/social/pacts/{id}/done          → 打卡（**只改自己那栏**，幂等）
 *  · POST /api/social/pacts/{id}/nudge         → 催促（同日重复 400）
 *  · POST /api/social/pacts/{id}/end           → 结束（cancelled）
 *  · 越权 → 404
 *
 * <p>通知契约：type = {@code event_logged} + {@code payload.kind = pact_invite} + {@code payload.pact_id}。
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class CoopPactControllerTest {

    @Autowired
    private TestRestTemplate rest;
    @Autowired
    private SocialNotificationMapper notificationMapper;

    private record Acct(String token, String id, String name) {}

    private Acct register(String name) {
        String email = "pact-" + UUID.randomUUID() + "@example.com";
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

    private RestTemplate raw() {
        RestTemplate r = new RestTemplate(new org.springframework.http.client.JdkClientHttpRequestFactory());
        r.setErrorHandler(new org.springframework.web.client.ResponseErrorHandler() {
            @Override public boolean hasError(org.springframework.http.client.ClientHttpResponse x) { return false; }
            @Override public void handleError(org.springframework.http.client.ClientHttpResponse x) { }
        });
        return r;
    }

    private ResponseEntity<Map> get(String token, String url) {
        return raw().exchange(rest.getRootUri() + url, HttpMethod.GET, new HttpEntity<>(bearer(token)), Map.class);
    }

    private ResponseEntity<Map> post(String token, String url, Object body) {
        return raw().exchange(rest.getRootUri() + url, HttpMethod.POST, new HttpEntity<>(body, bearer(token)), Map.class);
    }

    private String today() { return java.time.LocalDate.now().toString(); }

    private Map<String, Object> createBody(String toId, String kind, String mode) {
        Map<String, Object> m = new HashMap<>();
        m.put("toId", toId);
        m.put("kind", kind);
        m.put("mode", mode);
        m.put("title", "一起读书");
        m.put("days", "daily".equals(kind) ? 7 : 0);
        if ("once".equals(kind)) m.put("deadline", today());
        m.put("message", "加油");
        m.put("today", today());
        return m;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> items(ResponseEntity<Map> res) {
        return (List<Map<String, Object>>) res.getBody().get("items");
    }

    // ── 测试 ─────────────────────────────────────────────

    @Test
    void 全流程_创建到接受到打卡到结束() {
        Acct a = register("pa" + UUID.randomUUID().toString().substring(0, 6));
        Acct b = register("pb" + UUID.randomUUID().toString().substring(0, 6));

        // 初始空
        assertThat(items(get(a.token(), "/api/social/pacts"))).isEmpty();

        // A 创建 → pending
        ResponseEntity<Map> created = post(a.token(), "/api/social/pacts", createBody(b.id(), "daily", "same"));
        assertThat(created.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        String pactId = (String) created.getBody().get("id");
        assertThat(created.getBody().get("status")).isEqualTo("pending");
        assertThat(created.getBody().get("fromId")).isEqualTo(a.id());
        assertThat(created.getBody().get("days")).isEqualTo(7);

        // 双方列表都能看到
        assertThat(items(get(a.token(), "/api/social/pacts"))).hasSize(1);
        assertThat(items(get(b.token(), "/api/social/pacts"))).hasSize(1);

        // B 接受（same 模式无需 titleTo）
        ResponseEntity<Map> accepted = post(b.token(), "/api/social/pacts/" + pactId + "/respond",
                Map.of("accept", true, "today", today()));
        assertThat(accepted.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        assertThat(accepted.getBody().get("status")).isEqualTo("active");
        assertThat(accepted.getBody().get("startDay")).isEqualTo(today());

        // A 打卡（自己那栏）
        ResponseEntity<Map> aDone = post(a.token(), "/api/social/pacts/" + pactId + "/done",
                Map.of("day", today(), "done", true));
        assertThat(aDone.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        assertThat((List<String>) aDone.getBody().get("doneFrom")).containsExactly(today());
        assertThat((List<String>) aDone.getBody().get("doneTo")).isEmpty();

        // A 再打卡（幂等，不重复）
        ResponseEntity<Map> again = post(a.token(), "/api/social/pacts/" + pactId + "/done",
                Map.of("day", today(), "done", true));
        assertThat((List<String>) again.getBody().get("doneFrom")).hasSize(1);

        // B 打卡（应只加 doneTo，doneFrom 不动）
        ResponseEntity<Map> bDone = post(b.token(), "/api/social/pacts/" + pactId + "/done",
                Map.of("day", today(), "done", true));
        assertThat((List<String>) bDone.getBody().get("doneTo")).containsExactly(today());
        assertThat((List<String>) bDone.getBody().get("doneFrom")).containsExactly(today());   // A 的卡还在

        // A 催 B
        ResponseEntity<Map> nudge = post(a.token(), "/api/social/pacts/" + pactId + "/nudge",
                Map.of("today", today()));
        assertThat(nudge.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        assertThat(nudge.getBody().get("nudgeFromDay")).isEqualTo(today());

        // 同日再催 → 400
        assertThat(post(a.token(), "/api/social/pacts/" + pactId + "/nudge", Map.of("today", today())).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.BAD_REQUEST);

        // A 结束 → cancelled
        ResponseEntity<Map> ended = post(a.token(), "/api/social/pacts/" + pactId + "/end", Map.of());
        assertThat(ended.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        assertThat(ended.getBody().get("status")).isEqualTo("cancelled");
        assertThat(ended.getBody().get("endedBy")).isEqualTo(a.id());
    }

    /** 关键反例：B 打卡不能清掉 A 已打的卡（并发覆盖防护）。 */
    @Test
    void 打卡只改自己那栏不清对面() {
        Acct a = register("pc" + UUID.randomUUID().toString().substring(0, 6));
        Acct b = register("pd" + UUID.randomUUID().toString().substring(0, 6));
        String pactId = (String) post(a.token(), "/api/social/pacts", createBody(b.id(), "daily", "same"))
                .getBody().get("id");
        post(b.token(), "/api/social/pacts/" + pactId + "/respond", Map.of("accept", true, "today", today()));

        String d1 = today();
        String d2 = java.time.LocalDate.now().minusDays(1).toString();
        // A 打两天卡
        post(a.token(), "/api/social/pacts/" + pactId + "/done", Map.of("day", d1, "done", true));
        post(a.token(), "/api/social/pacts/" + pactId + "/done", Map.of("day", d2, "done", true));
        // B 打一天卡
        ResponseEntity<Map> bDone = post(b.token(), "/api/social/pacts/" + pactId + "/done",
                Map.of("day", d1, "done", true));
        // A 的两天卡必须都还在
        assertThat((List<String>) bDone.getBody().get("doneFrom")).containsExactlyInAnyOrder(d1, d2);
        assertThat((List<String>) bDone.getBody().get("doneTo")).containsExactly(d1);

        // A 视角读同一份，确认持久化正确
        Map<String, Object> fromA = items(get(a.token(), "/api/social/pacts")).get(0);
        assertThat((List<String>) fromA.get("doneFrom")).containsExactlyInAnyOrder(d1, d2);
        assertThat((List<String>) fromA.get("doneTo")).containsExactly(d1);
    }

    @Test
    void 不同目标模式接受时必须填自己的任务() {
        Acct a = register("pe" + UUID.randomUUID().toString().substring(0, 6));
        Acct b = register("pf" + UUID.randomUUID().toString().substring(0, 6));
        String pactId = (String) post(a.token(), "/api/social/pacts", createBody(b.id(), "daily", "different"))
                .getBody().get("id");

        // B 接受但没填 titleTo → 400
        assertThat(post(b.token(), "/api/social/pacts/" + pactId + "/respond",
                Map.of("accept", true, "today", today())).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.BAD_REQUEST);

        // 填了 → active，titleTo 写入
        ResponseEntity<Map> ok = post(b.token(), "/api/social/pacts/" + pactId + "/respond",
                Map.of("accept", true, "today", today(), "titleTo", "一起跑步"));
        assertThat(ok.getBody().get("status")).isEqualTo("active");
        assertThat(ok.getBody().get("titleTo")).isEqualTo("一起跑步");
    }

    @Test
    void 婉拒走declined() {
        Acct a = register("pg" + UUID.randomUUID().toString().substring(0, 6));
        Acct b = register("ph" + UUID.randomUUID().toString().substring(0, 6));
        String pactId = (String) post(a.token(), "/api/social/pacts", createBody(b.id(), "daily", "same"))
                .getBody().get("id");
        ResponseEntity<Map> declined = post(b.token(), "/api/social/pacts/" + pactId + "/respond",
                Map.of("accept", false, "today", today()));
        assertThat(declined.getBody().get("status")).isEqualTo("declined");
    }

    @Test
    void 越权访问返回404() {
        Acct a = register("pi" + UUID.randomUUID().toString().substring(0, 6));
        Acct b = register("pj" + UUID.randomUUID().toString().substring(0, 6));
        Acct c = register("pk" + UUID.randomUUID().toString().substring(0, 6));
        String pactId = (String) post(a.token(), "/api/social/pacts", createBody(b.id(), "daily", "same"))
                .getBody().get("id");

        assertThat(post(c.token(), "/api/social/pacts/" + pactId + "/respond",
                Map.of("accept", true, "today", today())).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND);
        assertThat(post(c.token(), "/api/social/pacts/" + pactId + "/done",
                Map.of("day", today(), "done", true)).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND);
        assertThat(post(c.token(), "/api/social/pacts/" + pactId + "/nudge", Map.of("today", today())).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND);
        assertThat(post(c.token(), "/api/social/pacts/" + pactId + "/end", Map.of()).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND);
        // C 列表看不到
        assertThat(items(get(c.token(), "/api/social/pacts"))).isEmpty();
    }

    @Test
    void 未登录返回401() {
        ResponseEntity<String> res = raw().exchange(rest.getRootUri() + "/api/social/pacts",
                HttpMethod.GET, new HttpEntity<>(new HttpHeaders()), String.class);
        assertThat(res.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.UNAUTHORIZED);
    }

    /**
     * 关键契约：创建约定给对方写 event_logged 通知，payload.kind = pact_invite 且含 pact_id
     * （前端 NotificationsPanel 读 pact_id；pactNoticeKind 读 payload.kind）。
     */
    @Test
    void 创建给对方写event_logged通知且payload契约正确() {
        Acct a = register("pl" + UUID.randomUUID().toString().substring(0, 6));
        Acct b = register("pm" + UUID.randomUUID().toString().substring(0, 6));
        String pactId = (String) post(a.token(), "/api/social/pacts", createBody(b.id(), "daily", "same"))
                .getBody().get("id");

        List<SocialNotification> notes = notificationMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<SocialNotification>()
                        .eq("receiver", b.id()).eq("type", "event_logged"));
        assertThat(notes).isNotEmpty();
        String payload = notes.get(notes.size() - 1).getPayload();
        assertThat(payload).contains("\"kind\"").contains("pact_invite");
        assertThat(payload).contains("\"pact_id\"").contains(pactId);
        assertThat(payload).contains("\"from_id\"").contains(a.id());
    }
}
