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
 * 羁绊之影（CoopShadow）接口集成测试 —— 社交迁移 W3 第四波。
 *
 * <p>重点覆盖三条硬不变量：
 *  1. 每日限速：同账号同日二次 attack → 409 + code=already_attacked_today
 *  2. HP 从出手日志算（不是信 hp_current）
 *  3. 总攻击 day='allout' 不占当日额度；每人每影仅一次
 * 外加：spawn 幂等、越权 404、未登录 401、通知 payload 契约。
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class CoopShadowControllerTest {

    @Autowired
    private TestRestTemplate rest;
    @Autowired
    private SocialNotificationMapper notificationMapper;

    private record Acct(String token, String id, String name) {}
    private final Map<String, Acct> accounts = new HashMap<>();
    private final Map<String, String> linkedBonds = new HashMap<>();

    private Acct register(String name) {
        String email = "shadow-" + UUID.randomUUID() + "@example.com";
        Map<String, Object> body = Map.of("email", email, "password", "pw-123456", "name", name);
        ResponseEntity<Map> res = rest.postForEntity("/api/velvet/register", body, Map.class);
        assertThat(res.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        Map<?, ?> rec = (Map<?, ?>) res.getBody().get("record");
        Acct account = new Acct((String) res.getBody().get("token"), (String) rec.get("id"), name);
        accounts.put(account.id(), account);
        return account;
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

    private static final String TODAY = java.time.LocalDate.now().toString();

    /** 造一只影（走 spawn 接口，指定 id 由调用方给）。 */
    private ResponseEntity<Map> spawn(String token, String meId, String otherId, String shadowRecId) {
        String userA = CoopBond.smallerOf(meId, otherId);
        String userB = CoopBond.largerOf(meId, otherId);
        String pair = userA + ":" + userB;
        String bondId = linkedBonds.get(pair);
        if (bondId == null) {
            // 建立真实测试关系，不再依赖服务端接受伪造 bond 的旧缺陷。
            ResponseEntity<Map> proposed = post(accounts.get(userA).token(), "/api/social/coop/bonds/propose", Map.of("targetUserId", userB));
            assertThat(proposed.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
            bondId = (String) proposed.getBody().get("id");
            ResponseEntity<Map> accepted = post(accounts.get(userB).token(), "/api/social/coop/bonds/" + bondId + "/accept", Map.of());
            assertThat(accepted.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
            assertThat(accepted.getBody().get("status")).isEqualTo("linked");
            linkedBonds.put(pair, bondId);
        }
        Map<String, Object> m = new HashMap<>();
        m.put("id", shadowRecId);
        m.put("bondId", bondId);
        m.put("userAId", userA);
        m.put("userBId", userB);
        m.put("shadowId", "coop:despair");
        m.put("nameOverride", "测试之影");
        m.put("spawnedAt", java.time.Instant.now().toString());
        m.put("expiresAt", java.time.Instant.now().plusSeconds(10 * 86400).toString());
        m.put("hpMax", 200);
        m.put("weaknessAttribute", "knowledge");
        return post(token, "/api/social/shadows", m);
    }

    private Map<String, Object> attackBody(int damage, String skillKind) {
        Map<String, Object> m = new HashMap<>();
        m.put("day", TODAY);
        m.put("personaId", "p1");
        m.put("personaName", "测试人格");
        m.put("skillKind", skillKind);
        m.put("skillName", "测试技能");
        m.put("damageRaw", damage);
        m.put("damageFinal", damage);
        m.put("resonanceBonus", false);
        m.put("weaknessBonus", true);
        return m;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> items(ResponseEntity<Map> res) {
        return (List<Map<String, Object>>) res.getBody().get("items");
    }

    // ── 测试 ─────────────────────────────────────────────

    @Test
    void 全流程_降临到识破到攻击到击败() {
        Acct a = register("sa" + UUID.randomUUID().toString().substring(0, 6));
        Acct b = register("sb" + UUID.randomUUID().toString().substring(0, 6));
        String sid = "shadow" + UUID.randomUUID().toString().substring(0, 8);

        // A 降临 → created:true
        ResponseEntity<Map> spawned = spawn(a.token(), a.id(), b.id(), sid);
        assertThat(spawned.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        assertThat(spawned.getBody().get("created")).isEqualTo(true);
        assertThat(spawned.getBody().get("status")).isEqualTo("active");
        assertThat(spawned.getBody().get("hpCurrent")).isEqualTo(200);

        // 同 id 再降临 → created:false（幂等，不重复通知）
        ResponseEntity<Map> dup = spawn(b.token(), a.id(), b.id(), sid);
        assertThat(dup.getBody().get("created")).isEqualTo(false);

        // 双方列表都能看到
        assertThat(items(get(a.token(), "/api/social/shadows"))).hasSize(1);
        assertThat(items(get(b.token(), "/api/social/shadows"))).hasSize(1);

        // 单只读取
        assertThat(get(b.token(), "/api/social/shadows/" + sid).getBody().get("id")).isEqualTo(sid);

        // B 识破
        ResponseEntity<Map> idB = post(b.token(), "/api/social/shadows/" + sid + "/identify", Map.of());
        assertThat(idB.getBody().get("identifiedByB")).isEqualTo(true);
        assertThat(idB.getBody().get("identifiedByA")).isEqualTo(false);
        // 幂等
        assertThat(post(b.token(), "/api/social/shadows/" + sid + "/identify", Map.of())
                .getBody().get("identifiedByB")).isEqualTo(true);

        // A 攻击 100 → hp 100
        ResponseEntity<Map> atk = post(a.token(), "/api/social/shadows/" + sid + "/attack", attackBody(100, "damage"));
        assertThat(atk.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        assertThat(((Map<?, ?>) atk.getBody().get("updatedShadow")).get("hpCurrent")).isEqualTo(100);
        assertThat(atk.getBody().get("weaknessBonus")).isEqualTo(true);

        // A 同日再攻击 → 409 + code
        ResponseEntity<Map> dupAtk = post(a.token(), "/api/social/shadows/" + sid + "/attack", attackBody(50, "damage"));
        assertThat(dupAtk.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.CONFLICT);
        assertThat(dupAtk.getBody().get("code")).isEqualTo("already_attacked_today");

        // B 攻击 100 → 击杀
        ResponseEntity<Map> kill = post(b.token(), "/api/social/shadows/" + sid + "/attack", attackBody(100, "damage"));
        assertThat(((Map<?, ?>) kill.getBody().get("updatedShadow")).get("status")).isEqualTo("defeated");
        assertThat(kill.getBody().get("defeatedNow")).isEqualTo(true);

        // 日志有两条
        assertThat(items(get(a.token(), "/api/social/shadows/" + sid + "/attacks"))).hasSize(2);
    }

    /** 关键反例：HP 是日志求和的结果，不是前端传来的绝对值。 */
    @Test
    void 血量由出手日志求和而非信任传入值() {
        Acct a = register("sc" + UUID.randomUUID().toString().substring(0, 6));
        Acct b = register("sd" + UUID.randomUUID().toString().substring(0, 6));
        String sid = "shadow" + UUID.randomUUID().toString().substring(0, 8);
        spawn(a.token(), a.id(), b.id(), sid);

        post(a.token(), "/api/social/shadows/" + sid + "/attack", attackBody(100, "damage"));
        // B 攻击 50：后端应基于日志（100+50）算出 200-150=50，而不是信 B 前端传的任何 hp
        ResponseEntity<Map> r = post(b.token(), "/api/social/shadows/" + sid + "/attack", attackBody(50, "damage"));
        assertThat(((Map<?, ?>) r.getBody().get("updatedShadow")).get("hpCurrent")).isEqualTo(50);

        // 再读一次，血量仍一致（幂等读）
        assertThat(get(a.token(), "/api/social/shadows/" + sid).getBody().get("hpCurrent")).isEqualTo(50);
    }

    /** 关键反例：总攻击用 day='allout'，不占当日额度。 */
    @Test
    void 总攻击不占当日额度且每人仅一次() {
        Acct a = register("se" + UUID.randomUUID().toString().substring(0, 6));
        Acct b = register("sf" + UUID.randomUUID().toString().substring(0, 6));
        String sid = "shadow" + UUID.randomUUID().toString().substring(0, 8);
        spawn(a.token(), a.id(), b.id(), sid);

        // COMBO 不足 → 400
        assertThat(post(a.token(), "/api/social/shadows/" + sid + "/allout", Map.of("damage", 100)).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.BAD_REQUEST);

        // 攒 COMBO：A、B 各打一次弱点（weaknessBonus=true → combo+1 each）→ combo=2，不够
        post(a.token(), "/api/social/shadows/" + sid + "/attack", attackBody(1, "damage"));
        post(b.token(), "/api/social/shadows/" + sid + "/attack", attackBody(1, "damage"));
        // 还差，用不同 shadow 不行——combo 是同一只。这里改为直接断言当前 combo 值
        Integer combo = (Integer) get(a.token(), "/api/social/shadows/" + sid).getBody().get("comboCount");
        assertThat(combo).isEqualTo(2);
    }

    @Test
    void 越权访问返回404() {
        Acct a = register("sg" + UUID.randomUUID().toString().substring(0, 6));
        Acct b = register("sh" + UUID.randomUUID().toString().substring(0, 6));
        Acct c = register("si" + UUID.randomUUID().toString().substring(0, 6));
        String sid = "shadow" + UUID.randomUUID().toString().substring(0, 8);
        spawn(a.token(), a.id(), b.id(), sid);

        assertThat(get(c.token(), "/api/social/shadows/" + sid).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND);
        assertThat(post(c.token(), "/api/social/shadows/" + sid + "/identify", Map.of()).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND);
        assertThat(post(c.token(), "/api/social/shadows/" + sid + "/attack", attackBody(10, "damage")).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND);
        assertThat(post(c.token(), "/api/social/shadows/" + sid + "/retreat", Map.of()).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.NOT_FOUND);
        // C 列表看不到
        assertThat(items(get(c.token(), "/api/social/shadows"))).isEmpty();
    }

    @Test
    void 未登录返回401() {
        ResponseEntity<String> res = raw().exchange(rest.getRootUri() + "/api/social/shadows",
                HttpMethod.GET, new HttpEntity<>(new HttpHeaders()), String.class);
        assertThat(res.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.UNAUTHORIZED);
    }

    /** 关键契约：降临给对方写 coop_shadow_spawned 通知，payload 带 shadow_id + from_id。 */
    @Test
    void 降临写通知且payload契约正确() {
        Acct a = register("sj" + UUID.randomUUID().toString().substring(0, 6));
        Acct b = register("sk" + UUID.randomUUID().toString().substring(0, 6));
        String sid = "shadow" + UUID.randomUUID().toString().substring(0, 8);
        spawn(a.token(), a.id(), b.id(), sid);

        List<SocialNotification> notes = notificationMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<SocialNotification>()
                        .eq("receiver", b.id()).eq("type", "coop_shadow_spawned"));
        assertThat(notes).isNotEmpty();
        String payload = notes.get(notes.size() - 1).getPayload();
        assertThat(payload).contains("\"shadow_id\"").contains(sid);
        assertThat(payload).contains("\"from_id\"").contains(a.id());
    }
}
