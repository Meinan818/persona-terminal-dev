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
 * 满月团战（OrgRaid）接口集成测试 —— 社交迁移 W3 第五波 第四步。
 *
 * <p>重点覆盖硬不变量：
 *  1. 开团 (org,slot) 唯一：同 slot 重开读回已有那场
 *  2. 出手 (raid,user,night) 唯一：同晚重打读回且 dup=true
 *  3. 越权（非成员）→ 404
 * 外加：boss JSON / hpMax 往返无损、同人不同晚可再打、总攻击（night=allout）独立计。
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OrgRaidControllerTest {

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

    /** 开团：返回 raidId。 */
    private String makeRaid(Acct a, String orgId, int slot, String raidId) {
        ResponseEntity<Map> res = post(a.token(), "/api/social/orgs/" + orgId + "/raids", Map.of(
                "id", raidId, "slot", slot,
                "boss", Map.of("v", 1, "name", "月影兽", "weak", "guts", "lv", 3),
                "hpMax", 115));
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        return (String) res.getBody().get("id");
    }

    // ── 测试 ─────────────────────────────────────────────

    @Test
    void 开团并出手打中弱点() {
        Acct a = register("ra");
        Map<String, Object> org = makeOrg(a, "团战据点");
        String orgId = (String) org.get("orgId");
        String raidId = "raid-" + UUID.randomUUID().toString().substring(0, 8);
        String returned = makeRaid(a, orgId, 1, raidId);
        assertThat(returned).isEqualTo(raidId);

        // 甲出手
        ResponseEntity<Map> hit = post(a.token(), "/api/social/raids/" + raidId + "/hits", Map.of(
                "kind", "strike", "night", "2026-10-13", "attr", "guts", "skill", "蓄力斩", "damage", 12, "weak", true));
        assertThat(hit.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(hit.getBody().get("dup")).isEqualTo(false);
        @SuppressWarnings("unchecked")
        Map<String, Object> h = (Map<String, Object>) hit.getBody().get("hit");
        assertThat(h.get("damage")).isEqualTo(12);
        assertThat(h.get("weak")).isEqualTo(true);
        assertThat(h.get("skill")).isEqualTo("蓄力斩");

        // list 能看到
        ResponseEntity<Map> listed = get(a.token(), "/api/social/orgs/" + orgId + "/raids");
        assertThat(listOf(listed, "raids")).hasSize(1);
        assertThat(listOf(listed, "hits")).hasSize(1);
        // boss 往返
        @SuppressWarnings("unchecked")
        Map<String, Object> boss = (Map<String, Object>) listOf(listed, "raids").get(0).get("boss");
        assertThat(boss.get("name")).isEqualTo("月影兽");
        assertThat(listOf(listed, "raids").get(0).get("hpMax")).isEqualTo(115);
    }

    @Test
    void 开团重复读回已有那场() {
        Acct a = register("rb");
        Map<String, Object> org = makeOrg(a, "重开据点");
        String orgId = (String) org.get("orgId");
        String raidId = "raid-" + UUID.randomUUID().toString().substring(0, 8);
        makeRaid(a, orgId, 5, raidId);
        // 同 slot 再开（另一个 id）→ 读回已有那场（原 id）
        String otherId = "raid-" + UUID.randomUUID().toString().substring(0, 8);
        String returned = makeRaid(a, orgId, 5, otherId);
        assertThat(returned).isEqualTo(raidId);
        assertThat(get(a.token(), "/api/social/orgs/" + orgId + "/raids").getBody()).isNotNull();
        assertThat(listOf(get(a.token(), "/api/social/orgs/" + orgId + "/raids"), "raids")).hasSize(1);
    }

    @Test
    void 同晚重复出手读回且dup为真() {
        Acct a = register("rc");
        Map<String, Object> org = makeOrg(a, "重复出手据点");
        String orgId = (String) org.get("orgId");
        String raidId = makeRaid(a, orgId, 1, "raid-" + UUID.randomUUID().toString().substring(0, 8));

        ResponseEntity<Map> h1 = post(a.token(), "/api/social/raids/" + raidId + "/hits", Map.of(
                "kind", "strike", "night", "2026-10-13", "skill", "斩", "damage", 10, "weak", false));
        assertThat(h1.getBody().get("dup")).isEqualTo(false);
        @SuppressWarnings("unchecked")
        String h1Id = (String) ((Map<String, Object>) h1.getBody().get("hit")).get("id");

        // 同晚再打 → dup=true，同一条
        ResponseEntity<Map> h2 = post(a.token(), "/api/social/raids/" + raidId + "/hits", Map.of(
                "kind", "strike", "night", "2026-10-13", "skill", "斩", "damage", 10, "weak", false));
        assertThat(h2.getBody().get("dup")).isEqualTo(true);
        @SuppressWarnings("unchecked")
        String h2Id = (String) ((Map<String, Object>) h2.getBody().get("hit")).get("id");
        assertThat(h2Id).isEqualTo(h1Id);

        // 换一晚 → 新的一条（dup=false）
        ResponseEntity<Map> h3 = post(a.token(), "/api/social/raids/" + raidId + "/hits", Map.of(
                "kind", "strike", "night", "2026-10-14", "skill", "斩", "damage", 11, "weak", false));
        assertThat(h3.getBody().get("dup")).isEqualTo(false);
    }

    @Test
    void 总攻击与普通出手独立计() {
        Acct a = register("rd");
        Map<String, Object> org = makeOrg(a, "总攻击据点");
        String orgId = (String) org.get("orgId");
        String raidId = makeRaid(a, orgId, 1, "raid-" + UUID.randomUUID().toString().substring(0, 8));

        // 同晚先 strike 再 allout（night 都是 2026-10-13，但 kind 不同 → allout 的 night 约定为 'allout'）
        post(a.token(), "/api/social/raids/" + raidId + "/hits", Map.of("kind", "strike", "night", "2026-10-13", "skill", "斩", "damage", 10, "weak", false));
        ResponseEntity<Map> allout = post(a.token(), "/api/social/raids/" + raidId + "/hits", Map.of("kind", "allout", "night", "allout", "skill", "总攻击", "damage", 40, "weak", true));
        assertThat(allout.getBody().get("dup")).isEqualTo(false);
        assertThat(listOf(get(a.token(), "/api/social/orgs/" + orgId + "/raids"), "hits")).hasSize(2);
    }

    @Test
    void 非成员开团或出手返回404() {
        Acct a = register("re");
        Map<String, Object> org = makeOrg(a, "封闭团战据点");
        String orgId = (String) org.get("orgId");
        String raidId = makeRaid(a, orgId, 1, "raid-" + UUID.randomUUID().toString().substring(0, 8));

        Acct outsider = register("rf");
        // 外人开团 → 404
        assertThat(post(outsider.token(), "/api/social/orgs/" + orgId + "/raids", Map.of(
                "id", "x", "slot", 2, "boss", Map.of("v", 1, "name", "x", "weak", "guts"), "hpMax", 100)).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
        // 外人出手 → 404
        assertThat(post(outsider.token(), "/api/social/raids/" + raidId + "/hits", Map.of(
                "kind", "strike", "night", "2026-10-13", "skill", "x", "damage", 1, "weak", false)).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
        // 外人看团战列表 → 404
        assertThat(get(outsider.token(), "/api/social/orgs/" + orgId + "/raids").getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void 未登录返回401() {
        ResponseEntity<String> res = raw().exchange(rest.getRootUri() + "/api/social/orgs/x/raids",
                HttpMethod.GET, new HttpEntity<>(new HttpHeaders()), String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
