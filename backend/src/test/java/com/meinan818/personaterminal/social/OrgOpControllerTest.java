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
 * 作战（OrgOp）接口集成测试 —— 社交迁移 W3 第五波 第三步。
 *
 * <p>重点覆盖硬不变量：
 *  1. big 作战只有队长能发
 *  2. 打卡 (operation,user,kind) 唯一：重复打卡读回已有那条
 *  3. 已取消 / 不在名单 → 打卡返回 null
 *  4. 取消作战只有发起人或队长
 *  5. 越权（非成员）→ 404
 * 外加：listOps 拉得到、participants/assignments JSON 往返无损。
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OrgOpControllerTest {

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
    private List<Map<String, Object>> listOf(ResponseEntity<Map> res, String key) {
        return (List<Map<String, Object>>) res.getBody().get(key);
    }

    private Map<String, Object> makeOrg(Acct a, String name) {
        ResponseEntity<Map> res = post(a.token(), "/api/social/orgs", Map.of("name", name, "motto", "稳", "emblem", "star", "tz", "Asia/Shanghai", "codename", "队长"));
        Map<?, ?> org = (Map<?, ?>) res.getBody().get("org");
        Map<String, Object> out = new HashMap<>();
        out.put("orgId", org.get("id"));
        out.put("inviteCode", org.get("inviteCode"));
        return out;
    }

    private void joinOrg(Acct a, String code, String codename) {
        post(a.token(), "/api/social/orgs/join", Map.of("code", code, "codename", codename));
    }

    /** 发一个 small 作战，返回 opId。 */
    private String makeOp(Acct a, String orgId, List<String> participants) {
        ResponseEntity<Map> res = post(a.token(), "/api/social/orgs/" + orgId + "/ops", Map.of(
                "kind", "small", "attr", "knowledge", "title", "读完一本书", "deadline", "2026-10-30",
                "participants", participants, "assignments", Map.of()));
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        return (String) res.getBody().get("id");
    }

    // ── 测试 ─────────────────────────────────────────────

    @Test
    void 发起作战并打卡完成() {
        Acct a = register("oa");
        Acct b = register("ob");
        Map<String, Object> org = makeOrg(a, "作战据点");
        String orgId = (String) org.get("orgId");
        joinOrg(b, (String) org.get("inviteCode"), "B");

        String opId = makeOp(a, orgId, List.of(a.id(), b.id()));

        // 甲打卡完成
        ResponseEntity<Map> ci = post(a.token(), "/api/social/ops/" + opId + "/checkins", Map.of("kind", "done", "day", "2026-10-13"));
        assertThat(ci.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(ci.getBody().get("kind")).isEqualTo("done");
        assertThat(ci.getBody().get("day")).isEqualTo("2026-10-13");

        // listOps 能看到作战 + 打卡
        ResponseEntity<Map> listed = get(a.token(), "/api/social/orgs/" + orgId + "/ops");
        assertThat(listOf(listed, "ops")).hasSize(1);
        assertThat(listOf(listed, "checkins")).hasSize(1);
    }

    @Test
    void 打卡重复读回已有且取消作战后返回null() {
        Acct a = register("oc");
        Acct b = register("od");
        Map<String, Object> org = makeOrg(a, "重复打卡据点");
        String orgId = (String) org.get("orgId");
        joinOrg(b, (String) org.get("inviteCode"), "B");
        String opId = makeOp(a, orgId, List.of(a.id(), b.id()));

        // 甲第一次 done
        ResponseEntity<Map> c1 = post(a.token(), "/api/social/ops/" + opId + "/checkins", Map.of("kind", "done", "day", "2026-10-13"));
        String c1Id = (String) c1.getBody().get("id");
        // 甲再 done → 读回同一条
        ResponseEntity<Map> c2 = post(a.token(), "/api/social/ops/" + opId + "/checkins", Map.of("kind", "done", "day", "2026-10-13"));
        assertThat(c2.getBody().get("id")).isEqualTo(c1Id);

        // 甲加一条 plan（不同 kind，允许）
        ResponseEntity<Map> plan = post(a.token(), "/api/social/ops/" + opId + "/checkins", Map.of("kind", "plan", "text", "我负责买书"));
        assertThat(plan.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(plan.getBody().get("kind")).isEqualTo("plan");

        // 取消后不能再打卡 → null
        assertThat(post(a.token(), "/api/social/ops/" + opId + "/cancel", Map.of()).getStatusCode()).isEqualTo(HttpStatus.OK);
        ResponseEntity<Map> after = post(b.token(), "/api/social/ops/" + opId + "/checkins", Map.of("kind", "done", "day", "2026-10-14"));
        assertThat(after.getBody()).isNull();
    }

    @Test
    void 不在名单里的人打卡返回null() {
        Acct a = register("oe");
        Acct b = register("of");
        Acct c = register("og");
        Map<String, Object> org = makeOrg(a, "名单据点");
        String orgId = (String) org.get("orgId");
        joinOrg(b, (String) org.get("inviteCode"), "B");
        joinOrg(c, (String) org.get("inviteCode"), "C");
        // 名单只有甲、乙
        String opId = makeOp(a, orgId, List.of(a.id(), b.id()));

        // 丙不在名单 → null
        ResponseEntity<Map> ci = post(c.token(), "/api/social/ops/" + opId + "/checkins", Map.of("kind", "done", "day", "2026-10-13"));
        assertThat(ci.getBody()).isNull();
        // 乙在名单 → 成功
        assertThat(post(b.token(), "/api/social/ops/" + opId + "/checkins", Map.of("kind", "done", "day", "2026-10-13")).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void big作战只有队长能发() {
        Acct a = register("oh");
        Acct b = register("oi");
        Map<String, Object> org = makeOrg(a, "大战据点");
        String orgId = (String) org.get("orgId");
        joinOrg(b, (String) org.get("inviteCode"), "B");

        // 乙（非队长）发 big → 400
        ResponseEntity<Map> denied = post(b.token(), "/api/social/orgs/" + orgId + "/ops", Map.of(
                "kind", "big", "attr", "knowledge", "title", "大战", "deadline", "2026-10-30",
                "participants", List.of(a.id(), b.id()), "assignments", Map.of(a.id(), "甲的任务", b.id(), "乙的任务")));
        assertThat(denied.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        // 甲（队长）发 big → 200，assignments 往返无损
        ResponseEntity<Map> ok = post(a.token(), "/api/social/orgs/" + orgId + "/ops", Map.of(
                "kind", "big", "attr", "knowledge", "title", "大战", "deadline", "2026-10-30",
                "participants", List.of(a.id(), b.id()), "assignments", Map.of(a.id(), "甲的任务", b.id(), "乙的任务")));
        assertThat(ok.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(ok.getBody().get("kind")).isEqualTo("big");
        @SuppressWarnings("unchecked")
        Map<String, Object> assigns = (Map<String, Object>) ok.getBody().get("assignments");
        assertThat(assigns.get(a.id())).isEqualTo("甲的任务");
        assertThat(assigns.get(b.id())).isEqualTo("乙的任务");
        // participants 数组往返
        @SuppressWarnings("unchecked")
        List<String> parts = (List<String>) ok.getBody().get("participants");
        assertThat(parts).containsExactlyInAnyOrder(a.id(), b.id());
    }

    @Test
    void 取消作战只有发起人或队长() {
        Acct a = register("oj");
        Acct b = register("ok");
        Acct c = register("ol");
        Map<String, Object> org = makeOrg(a, "取消据点");
        String orgId = (String) org.get("orgId");
        joinOrg(b, (String) org.get("inviteCode"), "B");
        joinOrg(c, (String) org.get("inviteCode"), "C");
        // 乙发起
        String opId = makeOp(b, orgId, List.of(a.id(), b.id(), c.id()));

        // 丙（非发起人非队长）取消 → 404
        assertThat(post(c.token(), "/api/social/ops/" + opId + "/cancel", Map.of()).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        // 乙（发起人）取消 → 200
        assertThat(post(b.token(), "/api/social/ops/" + opId + "/cancel", Map.of()).getStatusCode()).isEqualTo(HttpStatus.OK);

        // 再发一个，队长甲取消 → 200
        String opId2 = makeOp(b, orgId, List.of(a.id(), b.id(), c.id()));
        assertThat(post(a.token(), "/api/social/ops/" + opId2 + "/cancel", Map.of()).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void 删打卡只能删自己的() {
        Acct a = register("om");
        Acct b = register("on");
        Map<String, Object> org = makeOrg(a, "删打卡据点");
        String orgId = (String) org.get("orgId");
        joinOrg(b, (String) org.get("inviteCode"), "B");
        String opId = makeOp(a, orgId, List.of(a.id(), b.id()));

        ResponseEntity<Map> ci = post(a.token(), "/api/social/ops/" + opId + "/checkins", Map.of("kind", "done", "day", "2026-10-13"));
        String ciId = (String) ci.getBody().get("id");

        // 乙删甲的打卡 → 404
        assertThat(delete(b.token(), "/api/social/checkins/" + ciId).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        // 甲删自己的 → 200
        assertThat(delete(a.token(), "/api/social/checkins/" + ciId).getStatusCode()).isEqualTo(HttpStatus.OK);
        // 再删 → 仍 200（幂等）
        assertThat(delete(a.token(), "/api/social/checkins/" + ciId).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void 非成员看作战返回404() {
        Acct a = register("oo");
        Map<String, Object> org = makeOrg(a, "封闭作战据点");
        String orgId = (String) org.get("orgId");
        Acct outsider = register("op");
        assertThat(get(outsider.token(), "/api/social/orgs/" + orgId + "/ops").getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void 未登录返回401() {
        ResponseEntity<String> res = raw().exchange(rest.getRootUri() + "/api/social/orgs/x/ops",
                HttpMethod.GET, new HttpEntity<>(new HttpHeaders()), String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
