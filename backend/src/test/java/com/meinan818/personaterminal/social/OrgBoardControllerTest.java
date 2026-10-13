package com.meinan818.personaterminal.social;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 公告板（OrgBoard）接口集成测试 —— 社交迁移 W3 第五波 第二步。
 *
 * <p>重点覆盖硬不变量：
 *  1. 标签 (post,user) 唯一：再点同一个 = 撤，点别的 = 换
 *  2. 举报 (post_id,reporter) 唯一：重复举报静默忽略
 *  3. 纪要 / 达成卡用确定 id：同 id 重发返回 null（不重复）
 *  4. 越权（非成员看板 / 非本人非队长删动态）→ 404
 * 外加：动态包含 snapshot、board 拉得到、队长可删他人动态。
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OrgBoardControllerTest {

    @Autowired
    private TestRestTemplate rest;

    private record Acct(String token, String id, String name) {}

    private Acct register(String prefix) {
        String email = prefix + "-" + UUID.randomUUID() + "@example.com";
        Map<String, Object> body = Map.of("email", email, "password", "pw-123456", "name", prefix + UUID.randomUUID().toString().substring(0, 6));
        ResponseEntity<Map> res = rest.postForEntity("/api/velvet/register", body, Map.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<?, ?> rec = (Map<?, ?>) res.getBody().get("record");
        return new Acct((String) res.getBody().get("token"), (String) rec.get("id"), (String) rec.get("name"));
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

    private ResponseEntity<Map> delete(String token, String url) {
        return raw().exchange(rest.getRootUri() + url, HttpMethod.DELETE, new HttpEntity<>(bearer(token)), Map.class);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> items(ResponseEntity<Map> res) {
        return (List<Map<String, Object>>) res.getBody().get("items");
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> listOf(ResponseEntity<Map> res, String key) {
        return (List<Map<String, Object>>) res.getBody().get(key);
    }

    private Map<String, Object> makeOrg(Acct a, String name) {
        ResponseEntity<Map> res = post(a.token(), "/api/social/orgs", Map.of("name", name, "motto", "稳", "emblem", "star", "tz", "Asia/Shanghai", "codename", "队长"));
        Map<?, ?> org = (Map<?, ?>) res.getBody().get("org");
        Map<?, ?> member = (Map<?, ?>) res.getBody().get("member");
        Map<String, Object> out = new HashMap<>();
        out.put("orgId", org.get("id"));
        out.put("inviteCode", org.get("inviteCode"));
        out.put("memberId", member.get("id"));
        return out;
    }

    private String joinOrg(Acct a, String code, String codename) {
        ResponseEntity<Map> res = post(a.token(), "/api/social/orgs/join", Map.of("code", code, "codename", codename));
        return (String) ((Map<?, ?>) res.getBody().get("member")).get("id");
    }

    private String postMoment(String token, String orgId, String text) {
        ResponseEntity<Map> res = post(token, "/api/social/orgs/" + orgId + "/moments", Map.of("text", text, "snapshot", Map.of("v", 1, "date", "2026-10-13", "pts", Map.of("knowledge", 3), "names", Map.of(), "by", Map.of("codename", "谁"))));
        return (String) res.getBody().get("id");
    }

    // ── 测试 ─────────────────────────────────────────────

    @Test
    void 发动态后板上能看到且带快照() {
        Acct a = register("ba");
        Map<String, Object> org = makeOrg(a, "公告据点");
        String orgId = (String) org.get("orgId");
        String postId = postMoment(a.token(), orgId, "今天加了三格");

        ResponseEntity<Map> board = get(a.token(), "/api/social/orgs/" + orgId + "/board");
        assertThat(board.getStatusCode()).isEqualTo(HttpStatus.OK);
        List<Map<String, Object>> posts = listOf(board, "posts");
        assertThat(posts).hasSize(1);
        assertThat(posts.get(0).get("id")).isEqualTo(postId);
        assertThat(posts.get(0).get("text")).isEqualTo("今天加了三格");
        assertThat(posts.get(0).get("kind")).isEqualTo("moment");
        assertThat(posts.get(0).get("snapshot")).isNotNull();
    }

    @Test
    void 标签再点同一个是撤点别的是换() {
        Acct a = register("bb");
        Map<String, Object> org = makeOrg(a, "标签据点");
        String orgId = (String) org.get("orgId");
        String postId = postMoment(a.token(), orgId, "分享一条");

        // 贴 strong
        ResponseEntity<Map> r1 = post(a.token(), "/api/social/orgs/" + orgId + "/reactions", Map.of("postId", postId, "tag", "strong"));
        assertThat(r1.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r1.getBody().get("tag")).isEqualTo("strong");

        // 换 same
        ResponseEntity<Map> r2 = post(a.token(), "/api/social/orgs/" + orgId + "/reactions", Map.of("postId", postId, "tag", "same"));
        assertThat(r2.getBody().get("tag")).isEqualTo("same");
        assertThat(r2.getBody().get("id")).isEqualTo(r1.getBody().get("id"));   // 同一行，只换 tag

        // 板上只有一条标签
        assertThat(listOf(get(a.token(), "/api/social/orgs/" + orgId + "/board"), "reactions")).hasSize(1);

        // 再点 same（当前那个）→ 撤（null）
        ResponseEntity<Map> r3 = post(a.token(), "/api/social/orgs/" + orgId + "/reactions", Map.of("postId", postId, "tag", "same"));
        assertThat(r3.getBody()).isNull();
        assertThat(listOf(get(a.token(), "/api/social/orgs/" + orgId + "/board"), "reactions")).isEmpty();
    }

    @Test
    void 举报幂等重复举报静默忽略() {
        Acct a = register("bc");
        Map<String, Object> org = makeOrg(a, "举报据点");
        String orgId = (String) org.get("orgId");
        String postId = postMoment(a.token(), orgId, "一条动态");

        Acct b = register("bd");
        joinOrg(b, (String) org.get("inviteCode"), "B");

        Map<String, Object> report = Map.of("postId", postId, "orgId", orgId, "targetUserId", a.id(), "reason", "harass", "textCopy", "一条动态");
        assertThat(post(b.token(), "/api/social/orgs/reports", report).getStatusCode()).isEqualTo(HttpStatus.OK);
        // 重复举报 → 仍 200（静默忽略）
        assertThat(post(b.token(), "/api/social/orgs/reports", report).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void 纪要确定id重发不重复() {
        Acct a = register("be");
        Map<String, Object> org = makeOrg(a, "纪要据点");
        String orgId = (String) org.get("orgId");
        String minutesId = "minutes-" + UUID.randomUUID().toString().substring(0, 8);

        Map<String, Object> body = Map.of("id", minutesId, "weekKey", "2026-10-13", "snapshot", Map.of("v", 1, "week", "2026-10-13", "rate", Map.of("done", 1, "total", 2), "done", List.of(), "goals", List.of(), "titles", List.of(), "absent", List.of()));
        ResponseEntity<Map> r1 = post(a.token(), "/api/social/orgs/" + orgId + "/minutes", body);
        assertThat(r1.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r1.getBody().get("id")).isEqualTo(minutesId);
        assertThat(r1.getBody().get("kind")).isEqualTo("minutes");

        // 同 id 再发 → null
        ResponseEntity<Map> r2 = post(a.token(), "/api/social/orgs/" + orgId + "/minutes", body);
        assertThat(r2.getBody()).isNull();

        // ledger 有一条
        List<Map<String, Object>> ledger = items(get(a.token(), "/api/social/orgs/" + orgId + "/ledger"));
        assertThat(ledger).hasSize(1);
        assertThat(ledger.get(0).get("kind")).isEqualTo("minutes");
    }

    @Test
    void 删动态仅限本人或队长() {
        Acct a = register("bf");
        Map<String, Object> org = makeOrg(a, "删帖据点");
        String orgId = (String) org.get("orgId");
        Acct b = register("bg");
        joinOrg(b, (String) org.get("inviteCode"), "B");
        Acct c = register("bh");
        joinOrg(c, (String) org.get("inviteCode"), "C");

        // B 发一条，C 想删 → 404
        String bPost = postMoment(b.token(), orgId, "B 的动态");
        assertThat(delete(c.token(), "/api/social/posts/" + bPost).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        // B 自己删 → 200
        assertThat(delete(b.token(), "/api/social/posts/" + bPost).getStatusCode()).isEqualTo(HttpStatus.OK);

        // B 再发一条，队长 A 删 → 200（队长特权）
        String bPost2 = postMoment(b.token(), orgId, "B 的第二条");
        assertThat(delete(a.token(), "/api/social/posts/" + bPost2).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listOf(get(a.token(), "/api/social/orgs/" + orgId + "/board"), "posts")).isEmpty();
    }

    @Test
    void 非成员看板返回404() {
        Acct a = register("bi");
        Map<String, Object> org = makeOrg(a, "封闭据点");
        String orgId = (String) org.get("orgId");
        Acct outsider = register("bj");
        assertThat(get(outsider.token(), "/api/social/orgs/" + orgId + "/board").getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(get(outsider.token(), "/api/social/orgs/" + orgId + "/ledger").getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void 删用户内容只删自己的() {
        Acct a = register("bk");
        Map<String, Object> org = makeOrg(a, "清理据点");
        String orgId = (String) org.get("orgId");
        Acct b = register("bl");
        joinOrg(b, (String) org.get("inviteCode"), "B");

        postMoment(a.token(), orgId, "队长动态");
        String bPost = postMoment(b.token(), orgId, "B 的动态");
        post(b.token(), "/api/social/orgs/" + orgId + "/reactions", Map.of("postId", bPost, "tag", "hug"));

        // 清理 B 在组织里的内容
        assertThat(post(a.token(), "/api/social/orgs/" + orgId + "/purge/" + b.id(), Map.of()).getStatusCode()).isEqualTo(HttpStatus.OK);
        // B 的动态没了，队长的还在
        List<Map<String, Object>> posts = listOf(get(a.token(), "/api/social/orgs/" + orgId + "/board"), "posts");
        assertThat(posts).hasSize(1);
        assertThat(posts.get(0).get("text")).isEqualTo("队长动态");
    }

    @Test
    void 未登录返回401() {
        ResponseEntity<String> res = raw().exchange(rest.getRootUri() + "/api/social/orgs/whatever/board",
                HttpMethod.GET, new HttpEntity<>(new HttpHeaders()), String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
