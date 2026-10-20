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

import java.util.Map;
import java.util.UUID;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 好友模块集成测试：双账号全流程 + 幂等 + 越权 + 隐私。
 * 流式 401 用 loginRaw 同款处理（TestRestTemplate 默认 HttpURLConnection 抛 HttpRetryException）。
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class FriendControllerTest {

    @Autowired
    private TestRestTemplate rest;

    private record Acct(String email, String token, String id, String name) {}

    private Acct register(String tag) {
        String email = "friend-" + tag + "-" + UUID.randomUUID() + "@example.com";
        Map<String, Object> body = Map.of("email", email, "password", "pw-123456");
        ResponseEntity<Map> res = rest.postForEntity("/api/velvet/register", body, Map.class);
        assertThat(res.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        Map<?, ?> rec = (Map<?, ?>) res.getBody().get("record");
        return new Acct(email, (String) res.getBody().get("token"), (String) rec.get("id"), tag);
    }

    private static HttpHeaders bearer(String token) {
        HttpHeaders h = new HttpHeaders();
        h.setBearerAuth(token);
        h.setContentType(MediaType.APPLICATION_JSON);
        return h;
    }

    /** §十二踩坑1：TestRestTemplate 默认 HttpURLConnection 在「POST 带 body + 非2xx」抛 HttpRetryException——用 loginRaw 同款客户端 */
    private ResponseEntity<Map> post(String token, String url, Object body) {
        RestTemplate raw = rawTemplate();
        return raw.exchange(rest.getRootUri() + url, HttpMethod.POST,
                new HttpEntity<>(body, bearer(token)), Map.class);
    }

    private ResponseEntity<Map> get(String token, String url) {
        RestTemplate raw = rawTemplate();
        return raw.exchange(rest.getRootUri() + url, HttpMethod.GET,
                new HttpEntity<>(bearer(token)), Map.class);
    }

    private ResponseEntity<Map> delete(String token, String url) {
        RestTemplate raw = rawTemplate();
        return raw.exchange(rest.getRootUri() + url, HttpMethod.DELETE,
                new HttpEntity<>(bearer(token)), Map.class);
    }

    private RestTemplate rawTemplate() {
        RestTemplate raw = new RestTemplate(new org.springframework.http.client.JdkClientHttpRequestFactory());
        raw.setErrorHandler(new org.springframework.web.client.ResponseErrorHandler() {
            @Override public boolean hasError(org.springframework.http.client.ClientHttpResponse response) { return false; }
            @Override public void handleError(org.springframework.http.client.ClientHttpResponse response) { }
        });
        return raw;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> friendItem(ResponseEntity<Map> listRes, int i) {
        java.util.List<Map<String, Object>> items = (java.util.List<Map<String, Object>>) listRes.getBody().get("items");
        return items.get(i);
    }

    @Test
    void 全流程_申请到接受到删除() {
        Acct a = register("a");
        Acct b = register("b");

        // A 查 B 存在（不露 email）
        ResponseEntity<Map> lookup = get(a.token(), "/api/social/users?userId=" + b.id());
        assertThat(lookup.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        assertThat(lookup.getBody().get("id")).isEqualTo(b.id());
        assertThat(lookup.getBody()).doesNotContainKey("email");
        assertThat(lookup.getBody()).doesNotContainKey("password");

        // A 发申请
        ResponseEntity<Map> req = post(a.token(), "/api/social/friends/request",
                Map.of("targetId", b.id(), "message", "交个朋友"));
        assertThat(req.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        String fid = (String) req.getBody().get("id");
        assertThat(req.getBody().get("status")).isEqualTo("pending");

        // A 重复申请 → 幂等（同一关系行原样返回）
        ResponseEntity<Map> again = post(a.token(), "/api/social/friends/request",
                Map.of("targetId", b.id()));
        assertThat(again.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        assertThat(again.getBody().get("id")).isEqualTo(fid);

        // A 不能接受自己的申请（发起方禁操作）
        assertThat(post(a.token(), "/api/social/friends/" + fid + "/accept", Map.of())
                .getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.FORBIDDEN);

        // B 列表可见 pending；接受
        ResponseEntity<Map> bList = get(b.token(), "/api/social/friends");
        assertThat(bList.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        assertThat(friendItem(bList, 0).get("status")).isEqualTo("pending");
        // expand 里有对方档案且无 email
        Map<?, ?> expand = (Map<?, ?>) ((Map<?, ?>) friendItem(bList, 0)).get("expand");
        Map<?, ?> other = (Map<?, ?>) expand.get("other");
        assertThat(other.containsKey("email")).isFalse();

        assertThat(post(b.token(), "/api/social/friends/" + fid + "/accept", Map.of())
                .getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);

        // 双方列表都见 accepted
        assertThat(friendItem(get(a.token(), "/api/social/friends"), 0).get("status")).isEqualTo("accepted");
        assertThat(friendItem(get(b.token(), "/api/social/friends"), 0).get("status")).isEqualTo("accepted");

        // 不能加自己
        assertThat(post(a.token(), "/api/social/friends/request", Map.of("targetId", a.id()))
                .getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.BAD_REQUEST);

        // A 删除 → 双方列表空
        ResponseEntity<Map> del = delete(a.token(), "/api/social/friends/" + fid);
        assertThat(del.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        assertThat(((java.util.List<?>) get(a.token(), "/api/social/friends").getBody().get("items"))).isEmpty();
        assertThat(((java.util.List<?>) get(b.token(), "/api/social/friends").getBody().get("items"))).isEmpty();
    }

    /**
     * 回归（2026-10-14）：前端搜索框让用户输入的是 **UserID**（users.name，如 bob123），
     * 不是内部雪花 id。原先 lookup 只按 id 查（selectById），用户按提示输入 UserID
     * 一律「用户不存在」——加好友第一步就断。
     * 修复：resolve() 同时认 id 与 name；publicProfile 的 username 回填 users.name。
     */
    @Test
    void 按UserID能查到人且档案回填username() {
        String uid = "alice" + UUID.randomUUID().toString().substring(0, 8);
        String email = "lookup-" + uid + "@example.com";
        // 注册时显式传 UserID（前端注册就是把 userId 当 name 传）
        Map<String, Object> body = Map.of("email", email, "password", "pw-123456", "name", uid);
        ResponseEntity<Map> res = rest.postForEntity("/api/velvet/register", body, Map.class);
        assertThat(res.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        Map<?, ?> rec = (Map<?, ?>) res.getBody().get("record");
        String snowflakeId = (String) rec.get("id");
        String token = (String) res.getBody().get("token");

        // 用 UserID 查（前端真实输入形态）→ 200，且返回的 username 就是 UserID
        ResponseEntity<Map> byUid = get(token, "/api/social/users?userId=" + uid);
        assertThat(byUid.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        assertThat(byUid.getBody().get("id")).isEqualTo(snowflakeId);
        assertThat(byUid.getBody().get("username")).isEqualTo(uid);

        // 用内部雪花 id 查也照常可用（关系行内部按 id 操作）
        assertThat(get(token, "/api/social/users?userId=" + snowflakeId).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.OK);

        // 不存在的 UserID → 401（不泄露存在性）
        assertThat(get(token, "/api/social/users?userId=nobody" + UUID.randomUUID().toString().substring(0, 6))
                .getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.UNAUTHORIZED);
    }

    @Test
    void 越权访问返回404不泄露存在性() {
        Acct a = register("x");
        Acct b = register("y");
        Acct c = register("z");

        // A→B 申请
        ResponseEntity<Map> req = post(a.token(), "/api/social/friends/request", Map.of("targetId", b.id()));
        String fid = (String) req.getBody().get("id");

        // C（无关第三人）对该关系任何操作 → 404
        assertThat(post(c.token(), "/api/social/friends/" + fid + "/accept", Map.of())
                .getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND);
        assertThat(post(c.token(), "/api/social/friends/" + fid + "/decline", Map.of())
                .getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND);
        assertThat(delete(c.token(), "/api/social/friends/" + fid).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND);
    }

    @Test
    void 未登录访问好友接口返回401() {
        RestTemplate raw = rawTemplate();
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<String> res = raw.exchange(rest.getRootUri() + "/api/social/friends",
                HttpMethod.GET, new HttpEntity<>(h), String.class);
        assertThat(res.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.UNAUTHORIZED);
    }

    @Test
    void 并发申请由唯一键收口且全部幂等成功() throws Exception {
        Acct a = register("burst-a");
        Acct b = register("burst-b");
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
                    return post(a.token(), "/api/social/friends/request",
                            Map.of("targetId", b.id(), "message", "并发申请"));
                }));
            }
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();

            Set<Object> ids = new java.util.HashSet<>();
            for (Future<ResponseEntity<Map>> future : futures) {
                ResponseEntity<Map> response = future.get(15, TimeUnit.SECONDS);
                assertThat(response.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
                ids.add(response.getBody().get("id"));
            }
            assertThat(ids).hasSize(1);
            assertThat(((java.util.List<?>) get(a.token(), "/api/social/friends").getBody().get("items")))
                    .hasSize(1);
        } finally {
            pool.shutdownNow();
        }
    }
}
