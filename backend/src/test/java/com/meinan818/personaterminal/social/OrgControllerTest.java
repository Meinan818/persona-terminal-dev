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
 * 组织核心（Org）接口集成测试 —— 社交迁移 W3 第五波 第一步。
 *
 * <p>重点覆盖硬不变量：
 *  1. 每人最多自建 1 个 + 加入 1 个（(user,slot) 唯一）
 *  2. 一个组织最多 7 人、座位 1–7 不重复（(org,seat) 唯一）
 *  3. 同一人在一个组织里只有一行（(org,user) 唯一）
 *  4. 越权（非成员 / 非队长）→ 404
 * 外加：建组织即坐 1 号座位、凭码预览、换码旧码作废、请离后换码、未登录 401。
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OrgControllerTest {

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

    private ResponseEntity<Map> put(String token, String url, Object body) {
        return raw().exchange(rest.getRootUri() + url, HttpMethod.PUT, new HttpEntity<>(body, bearer(token)), Map.class);
    }

    private ResponseEntity<Map> delete(String token, String url) {
        return raw().exchange(rest.getRootUri() + url, HttpMethod.DELETE, new HttpEntity<>(bearer(token)), Map.class);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> items(ResponseEntity<Map> res) {
        return (List<Map<String, Object>>) res.getBody().get("items");
    }

    /** 建组织，返回 {orgId, inviteCode, memberId}。 */
    private Map<String, Object> makeOrg(Acct a, String name) {
        ResponseEntity<Map> res = post(a.token(), "/api/social/orgs", Map.of("name", name, "motto", "稳", "emblem", "star", "tz", "Asia/Shanghai", "codename", "队长"));
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<?, ?> org = (Map<?, ?>) res.getBody().get("org");
        Map<?, ?> member = (Map<?, ?>) res.getBody().get("member");
        Map<String, Object> out = new HashMap<>();
        out.put("orgId", org.get("id"));
        out.put("inviteCode", org.get("inviteCode"));
        out.put("memberId", member.get("id"));
        return out;
    }

    // ── 测试 ─────────────────────────────────────────────

    @Test
    void 建组织即坐一号座位且可凭码预览() {
        Acct a = register("oa");
        Map<String, Object> org = makeOrg(a, "测试据点");
        String orgId = (String) org.get("orgId");
        String code = (String) org.get("inviteCode");
        assertThat(code).hasSize(8);

        // 我的列表里能看到，且我那一行是 own / seat 1
        List<Map<String, Object>> mine = items(get(a.token(), "/api/social/orgs"));
        assertThat(mine).hasSize(1);
        Map<?, ?> member = (Map<?, ?>) mine.get(0).get("member");
        assertThat(member.get("slot")).isEqualTo("own");
        assertThat(member.get("seat")).isEqualTo(1);

        // 别人凭码能预览
        Acct b = register("ob");
        ResponseEntity<Map> pv = get(b.token(), "/api/social/orgs/preview?code=" + code);
        assertThat(pv.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(pv.getBody().get("id")).isEqualTo(orgId);

        // 码不对 → null
        assertThat(get(b.token(), "/api/social/orgs/preview?code=ZZZZZZZZ").getBody()).isNull();

        // 非成员看组织详情 → 404
        assertThat(get(b.token(), "/api/social/orgs/" + orgId).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void 加入组织座位递增且一人最多加入一个() {
        Acct a = register("oc");
        Map<String, Object> org = makeOrg(a, "座位据点");
        String orgId = (String) org.get("orgId");
        String code = (String) org.get("inviteCode");

        Acct b = register("od");
        ResponseEntity<Map> join = post(b.token(), "/api/social/orgs/join", Map.of("code", code, "codename", "成员B"));
        assertThat(join.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<?, ?> bMember = (Map<?, ?>) join.getBody().get("member");
        assertThat(bMember.get("slot")).isEqualTo("joined");
        assertThat(bMember.get("seat")).isEqualTo(2);

        // B 再加入别的组织 → 400（每人最多加入一个）
        Acct c = register("oe");
        Map<String, Object> org2 = makeOrg(c, "另一个据点");
        ResponseEntity<Map> join2 = post(b.token(), "/api/social/orgs/join", Map.of("code", org2.get("inviteCode"), "codename", "成员B"));
        assertThat(join2.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        // A 再建一个 → 400（每人最多自建一个）
        assertThat(post(a.token(), "/api/social/orgs", Map.of("name", "第二个", "emblem", "star")).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        // 成员列表两人，座位 1、2
        List<Map<String, Object>> members = items(get(a.token(), "/api/social/orgs/" + orgId + "/members"));
        assertThat(members).hasSize(2);
        assertThat(members.get(0).get("seat")).isEqualTo(1);
        assertThat(members.get(1).get("seat")).isEqualTo(2);
    }

    @Test
    void 满七人后第八人进不去() {
        Acct leader = register("of");
        Map<String, Object> org = makeOrg(leader, "满员据点");
        String orgId = (String) org.get("orgId");
        // 组织里已经 1 人（队长），再拉 6 人 → 满 7
        for (int i = 0; i < 6; i++) {
            Acct x = register("og" + i);
            ResponseEntity<Map> r = post(x.token(), "/api/social/orgs/join", Map.of("code", org.get("inviteCode"), "codename", "m" + i));
            assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        }
        assertThat(items(get(leader.token(), "/api/social/orgs/" + orgId + "/members"))).hasSize(7);

        // 第 8 人 → 400
        Acct ninth = register("oh");
        ResponseEntity<Map> full = post(ninth.token(), "/api/social/orgs/join", Map.of("code", org.get("inviteCode"), "codename", "m8"));
        assertThat(full.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void 队长专属操作越权返回404() {
        Acct a = register("oi");
        Map<String, Object> org = makeOrg(a, "权限据点");
        String orgId = (String) org.get("orgId");

        Acct b = register("oj");
        post(b.token(), "/api/social/orgs/join", Map.of("code", org.get("inviteCode"), "codename", "B"));

        // B（非队长）改资料 / 换码 / 解散 → 404
        assertThat(put(b.token(), "/api/social/orgs/" + orgId, Map.of("name", "改名")).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(post(b.token(), "/api/social/orgs/" + orgId + "/rotate", Map.of()).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(delete(b.token(), "/api/social/orgs/" + orgId).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        // 完全无关的 C 看成员列表 → 404
        Acct c = register("ok");
        assertThat(get(c.token(), "/api/social/orgs/" + orgId + "/members").getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void 换邀请码后旧码作废() {
        Acct a = register("ol");
        Map<String, Object> org = makeOrg(a, "换码据点");
        String orgId = (String) org.get("orgId");
        String oldCode = (String) org.get("inviteCode");

        ResponseEntity<Map> rotated = post(a.token(), "/api/social/orgs/" + orgId + "/rotate", Map.of());
        assertThat(rotated.getStatusCode()).isEqualTo(HttpStatus.OK);
        String newCode = (String) rotated.getBody().get("inviteCode");
        assertThat(newCode).isNotEqualTo(oldCode);

        // 旧码预览 → null
        Acct b = register("om");
        assertThat(get(b.token(), "/api/social/orgs/preview?code=" + oldCode).getBody()).isNull();
        // 新码 → 可用
        assertThat(get(b.token(), "/api/social/orgs/preview?code=" + newCode).getBody().get("id")).isEqualTo(orgId);
    }

    @Test
    void 请离成员后自动换码() {
        Acct a = register("on");
        Map<String, Object> org = makeOrg(a, "请离据点");
        String orgId = (String) org.get("orgId");
        String code = (String) org.get("inviteCode");

        Acct b = register("oo");
        ResponseEntity<Map> join = post(b.token(), "/api/social/orgs/join", Map.of("code", code, "codename", "B"));
        String bMemberId = (String) ((Map<?, ?>) join.getBody().get("member")).get("id");

        ResponseEntity<Map> kick = post(a.token(), "/api/social/orgs/" + orgId + "/kick/" + bMemberId, Map.of());
        assertThat(kick.getStatusCode()).isEqualTo(HttpStatus.OK);
        // 成员少了
        assertThat(items(get(a.token(), "/api/social/orgs/" + orgId + "/members"))).hasSize(1);
        // 码换了（rotated 非 null）
        assertThat(kick.getBody().get("rotated")).isNotNull();
    }

    @Test
    void 退出组织且队长不能直接退() {
        Acct a = register("op");
        Map<String, Object> org = makeOrg(a, "退出据点");
        String orgId = (String) org.get("orgId");

        Acct b = register("oq");
        post(b.token(), "/api/social/orgs/join", Map.of("code", org.get("inviteCode"), "codename", "B"));

        // B 退出 → 成员回到 1 人
        assertThat(post(b.token(), "/api/social/orgs/" + orgId + "/leave", Map.of()).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(items(get(a.token(), "/api/social/orgs/" + orgId + "/members"))).hasSize(1);

        // 队长退出 → 400
        assertThat(post(a.token(), "/api/social/orgs/" + orgId + "/leave", Map.of()).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void 改成员代号与会议目标() {
        Acct a = register("or");
        Map<String, Object> org = makeOrg(a, "改资料据点");
        String memberId = (String) org.get("memberId");

        ResponseEntity<Map> r = put(a.token(), "/api/social/orgs/members/" + memberId,
                Map.of("codename", "新代号", "goal", "下周读完一本书", "goalWeek", "2026-10-19"));
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(r.getBody().get("codename")).isEqualTo("新代号");
        assertThat(r.getBody().get("goal")).isEqualTo("下周读完一本书");
    }

    @Test
    void 未登录返回401() {
        ResponseEntity<String> res = raw().exchange(rest.getRootUri() + "/api/social/orgs",
                HttpMethod.GET, new HttpEntity<>(new HttpHeaders()), String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void 解散组织后成员看列表为空() {
        Acct a = register("os");
        Map<String, Object> org = makeOrg(a, "解散据点");
        String orgId = (String) org.get("orgId");

        Acct b = register("ot");
        post(b.token(), "/api/social/orgs/join", Map.of("code", org.get("inviteCode"), "codename", "B"));

        assertThat(delete(a.token(), "/api/social/orgs/" + orgId).getStatusCode()).isEqualTo(HttpStatus.OK);
        // 队长与成员都看不到了
        assertThat(items(get(a.token(), "/api/social/orgs"))).isEmpty();
        assertThat(items(get(b.token(), "/api/social/orgs"))).isEmpty();
    }
}
