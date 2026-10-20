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
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 同伴羁绊（CoopBond）接口集成测试 —— 社交迁移 W3 第二波。
 *
 * <p>契约对齐前端 {@code src/services/coopBonds.ts}：
 *  · GET  /api/social/coop/bonds               → {items:[CoopBond]}（与我相关）
 *  · POST /api/social/coop/bonds/propose       → pending；已 linked/pending/冷却 → 400
 *  · POST /api/social/coop/bonds/{id}/accept   → linked；非 pending → 400
 *  · POST /api/social/coop/bonds/{id}/reject   → rejected（3 天冷却）
 *  · POST /api/social/coop/bonds/{id}/sever    → severed（7 天冷却）
 *  · POST /api/social/coop/bonds/{id}/decay    → 写 decay_a/decay_b
 *  · 越权（不涉及自己）→ 404
 *
 * <p>通知 payload 键必须为 {@code coop_bond_id}（前端 NotificationsPanel 读它）。
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class CoopBondControllerTest {

    @Autowired
    private TestRestTemplate rest;

    @Autowired
    private SocialNotificationMapper notificationMapper;

    private record Acct(String token, String id, String name) {}

    private Acct register(String name) {
        String email = "coop-" + UUID.randomUUID() + "@example.com";
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

    /** 提议的完整 body。 */
    private Map<String, Object> proposeBody(String targetId) {
        Map<String, Object> m = new HashMap<>();
        m.put("targetUserId", targetId);
        m.put("arcanaId", "the-fool");
        m.put("orientation", "upright");
        m.put("intimacyLevel", 5);
        m.put("skillAttribute", "knowledge");
        m.put("message", "一起进步");
        return m;
    }

    private Map<String, Object> acceptBody() {
        Map<String, Object> m = new HashMap<>();
        m.put("arcanaId", "the-magician");
        m.put("orientation", "reversed");
        m.put("intimacyLevel", 7);
        m.put("skillAttribute", "guts");
        return m;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> items(ResponseEntity<Map> res) {
        return (List<Map<String, Object>>) res.getBody().get("items");
    }

    // ── 测试 ─────────────────────────────────────────────

    @Test
    void 全流程_提议到接受到解除() {
        Acct a = register("ca" + UUID.randomUUID().toString().substring(0, 6));
        Acct b = register("cb" + UUID.randomUUID().toString().substring(0, 6));

        // 初始：双方都无 bond
        assertThat(items(get(a.token(), "/api/social/coop/bonds"))).isEmpty();

        // A 提议 → pending
        ResponseEntity<Map> proposed = post(a.token(), "/api/social/coop/bonds/propose", proposeBody(b.id()));
        assertThat(proposed.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        String bondId = (String) proposed.getBody().get("id");
        assertThat(proposed.getBody().get("status")).isEqualTo("pending");
        assertThat(proposed.getBody().get("initiatorId")).isEqualTo(a.id());
        // A 侧字段已写、B 侧为空
        assertThat(proposed.getBody().get("arcanaAId")).isEqualTo("the-fool");
        assertThat(proposed.getBody().get("arcanaBId")).isNull();
        // otherProfile 指向对方且无 email
        Map<?, ?> other = (Map<?, ?>) proposed.getBody().get("otherProfile");
        assertThat(other.get("id")).isEqualTo(b.id());
        assertThat(other.containsKey("email")).isFalse();

        // 双方列表都能看到这条
        assertThat(items(get(a.token(), "/api/social/coop/bonds"))).hasSize(1);
        assertThat(items(get(b.token(), "/api/social/coop/bonds"))).hasSize(1);

        // A 重复提议 → 400「已发出提议，等对方响应吧」
        assertThat(post(a.token(), "/api/social/coop/bonds/propose", proposeBody(b.id())).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.BAD_REQUEST);

        // A（发起方）不能接受自己的提议 → 403
        assertThat(post(a.token(), "/api/social/coop/bonds/" + bondId + "/accept", acceptBody()).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.FORBIDDEN);

        // B 接受 → linked；B 侧字段已写
        ResponseEntity<Map> accepted = post(b.token(), "/api/social/coop/bonds/" + bondId + "/accept", acceptBody());
        assertThat(accepted.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        assertThat(accepted.getBody().get("status")).isEqualTo("linked");
        assertThat(accepted.getBody().get("arcanaBId")).isEqualTo("the-magician");
        assertThat(accepted.getBody().get("expiresAt")).isNull();

        // A 视角：otherProfile 是 B；B 视角：otherProfile 是 A
        Map<?, ?> aOther = (Map<?, ?>) items(get(a.token(), "/api/social/coop/bonds")).get(0).get("otherProfile");
        assertThat(aOther.get("id")).isEqualTo(b.id());

        // linked 后再提议 → 400「你们已经建立了 COOP」
        assertThat(post(a.token(), "/api/social/coop/bonds/propose", proposeBody(b.id())).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.BAD_REQUEST);

        // 设置逆流：A 设 → decayA=true，decayB 仍 null
        ResponseEntity<Map> decayed = post(a.token(), "/api/social/coop/bonds/" + bondId + "/decay", Map.of("enabled", true));
        assertThat(decayed.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        assertThat(decayed.getBody().get("decayA")).isEqualTo(Boolean.TRUE);
        assertThat(decayed.getBody().get("decayB")).isNull();

        // 解除 → severed + 7 天冷却
        ResponseEntity<Map> severed = post(b.token(), "/api/social/coop/bonds/" + bondId + "/sever", Map.of());
        assertThat(severed.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        assertThat(severed.getBody().get("status")).isEqualTo("severed");
        assertThat(severed.getBody().get("reLinkAfter")).isNotNull();

        // 冷却期内再提议 → 400
        assertThat(post(a.token(), "/api/social/coop/bonds/propose", proposeBody(b.id())).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.BAD_REQUEST);
    }

    @Test
    void 拒绝后进入冷却且不能再提议() {
        Acct a = register("cc" + UUID.randomUUID().toString().substring(0, 6));
        Acct b = register("cd" + UUID.randomUUID().toString().substring(0, 6));

        ResponseEntity<Map> proposed = post(a.token(), "/api/social/coop/bonds/propose", proposeBody(b.id()));
        String bondId = (String) proposed.getBody().get("id");

        // B 拒绝 → rejected + re_request_after
        ResponseEntity<Map> rejected = post(b.token(), "/api/social/coop/bonds/" + bondId + "/reject", Map.of());
        assertThat(rejected.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        assertThat(rejected.getBody().get("status")).isEqualTo("rejected");
        assertThat(rejected.getBody().get("reRequestAfter")).isNotNull();

        // 重复拒绝（已非 pending）→ 400
        assertThat(post(b.token(), "/api/social/coop/bonds/" + bondId + "/reject", Map.of()).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.BAD_REQUEST);

        // 冷却期内 A 再提议 → 400
        assertThat(post(a.token(), "/api/social/coop/bonds/propose", proposeBody(b.id())).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.BAD_REQUEST);
    }

    @Test
    void 并发提议由唯一键收口且全部幂等成功() throws Exception {
        Acct a = register("burst-ca" + UUID.randomUUID().toString().substring(0, 6));
        Acct b = register("burst-cb" + UUID.randomUUID().toString().substring(0, 6));
        int workers = 6;
        ExecutorService pool = Executors.newFixedThreadPool(workers);
        CountDownLatch ready = new CountDownLatch(workers);
        CountDownLatch start = new CountDownLatch(1);
        try {
            java.util.List<Future<ResponseEntity<Map>>> futures = new java.util.ArrayList<>();
            for (int i = 0; i < workers; i++) {
                futures.add(pool.submit(() -> {
                    ready.countDown();
                    assertThat(start.await(5, TimeUnit.SECONDS)).isTrue();
                    return post(a.token(), "/api/social/coop/bonds/propose", proposeBody(b.id()));
                }));
            }
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();

            Set<Object> ids = new java.util.HashSet<>();
            for (Future<ResponseEntity<Map>> future : futures) {
                ResponseEntity<Map> response = future.get(15, TimeUnit.SECONDS);
                assertThat(response.getStatusCode()).isIn(
                        org.springframework.http.HttpStatus.OK,
                        org.springframework.http.HttpStatus.BAD_REQUEST);
                if (response.getStatusCode().is2xxSuccessful()) {
                    assertThat(response.getBody().get("status")).isEqualTo("pending");
                    ids.add(response.getBody().get("id"));
                }
            }
            assertThat(ids).hasSize(1);
            assertThat(items(get(a.token(), "/api/social/coop/bonds"))).hasSize(1);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void 越权访问返回404不泄露存在性() {
        Acct a = register("ce" + UUID.randomUUID().toString().substring(0, 6));
        Acct b = register("cf" + UUID.randomUUID().toString().substring(0, 6));
        Acct c = register("cg" + UUID.randomUUID().toString().substring(0, 6));

        ResponseEntity<Map> proposed = post(a.token(), "/api/social/coop/bonds/propose", proposeBody(b.id()));
        String bondId = (String) proposed.getBody().get("id");

        // C（无关第三人）→ 404
        assertThat(post(c.token(), "/api/social/coop/bonds/" + bondId + "/accept", acceptBody()).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND);
        assertThat(post(c.token(), "/api/social/coop/bonds/" + bondId + "/reject", Map.of()).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND);
        assertThat(post(c.token(), "/api/social/coop/bonds/" + bondId + "/sever", Map.of()).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND);
        assertThat(post(c.token(), "/api/social/coop/bonds/" + bondId + "/decay", Map.of("enabled", true)).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND);

        // C 的列表看不到这条 bond
        assertThat(items(get(c.token(), "/api/social/coop/bonds"))).isEmpty();
    }

    @Test
    void 不能对自己提议() {
        Acct a = register("ch" + UUID.randomUUID().toString().substring(0, 6));
        assertThat(post(a.token(), "/api/social/coop/bonds/propose", proposeBody(a.id())).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.BAD_REQUEST);
    }

    @Test
    void 未登录访问返回401() {
        ResponseEntity<String> res = raw().exchange(rest.getRootUri() + "/api/social/coop/bonds",
                HttpMethod.GET, new HttpEntity<>(new HttpHeaders()), String.class);
        assertThat(res.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.UNAUTHORIZED);
    }

    /**
     * 关键契约：propose 给对方写 coop_proposal 通知，payload 键 = {@code coop_bond_id}
     * （前端 NotificationsPanel 读的正是它；写错 →「接受」按钮拿不到 id、点不动）。
     */
    @Test
    void 提议给对方写coop_proposal通知且payload键为coop_bond_id() {
        Acct a = register("ci" + UUID.randomUUID().toString().substring(0, 6));
        Acct b = register("cj" + UUID.randomUUID().toString().substring(0, 6));

        ResponseEntity<Map> proposed = post(a.token(), "/api/social/coop/bonds/propose", proposeBody(b.id()));
        String bondId = (String) proposed.getBody().get("id");

        List<SocialNotification> notes = notificationMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<SocialNotification>()
                        .eq("receiver", b.id()).eq("type", "coop_proposal"));
        assertThat(notes).isNotEmpty();
        SocialNotification n = notes.get(notes.size() - 1);
        // Jackson 默认序列化带空格（"key": "value"），故断言按 key 存在 + 值存在分两段
        assertThat(n.getPayload()).contains("\"coop_bond_id\"").contains(bondId);
        // from_id 必须存在（NotificationService.toView 靠它解析 fromProfile）
        assertThat(n.getPayload()).contains("\"from_id\"").contains(a.id());
    }
}
