package com.meinan818.personaterminal.sync;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * SyncController 集成测试：真实 MySQL + 真实 JWT 过滤链（不 mock 中间层）。
 *
 * 覆盖计划里的核心断言：
 *   · 未认证 → 401
 *   · 建行 → 查行 → 改行（updated 单调变化）→ 删行
 *   · fields 投影（ids 模式不带 value）
 *   · 越权：他人 id → 404（不泄漏存在性）
 *   · 幂等：同 (user,key) 再 POST 走更新
 *
 * 运行需 MySQL 可达：MYSQL_PASSWORD=<真实密码> mvn test
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class SyncControllerTest {

    @Autowired
    private TestRestTemplate rest;

    private record Session(String token, String userId, String email) {}

    /** 注册一个唯一用户，返回 token / id / 邮箱。 */
    private Session register() {
        String email = "synctest-" + UUID.randomUUID() + "@example.com";
        ResponseEntity<Map> res = rest.postForEntity("/api/velvet/register",
                Map.of("email", email, "password", "pw-123456", "name", "synctest"),
                Map.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<?, ?> body = res.getBody();
        String token = (String) body.get("token");
        Map<?, ?> record = (Map<?, ?>) body.get("record");
        return new Session(token, (String) record.get("id"), email);
    }

    private HttpHeaders authHeaders(String token) {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        h.setBearerAuth(token);
        return h;
    }

    @Test
    void 未认证访问返回401() {
        ResponseEntity<String> res = rest.getForEntity("/api/sync/rows", String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void 建查改删完整链路() {
        Session s = register();

        // 建行
        ResponseEntity<Map> created = rest.exchange("/api/sync/rows", HttpMethod.POST,
                new HttpEntity<>(Map.of("key", "todos", "value", List.of(Map.of("id", "t1", "text", "写测试"))),
                        authHeaders(s.token())),
                Map.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.OK);
        String rowId = (String) created.getBody().get("id");
        String firstUpdated = (String) created.getBody().get("updated");
        assertThat(rowId).isNotBlank();
        assertThat(firstUpdated).isNotBlank();
        assertThat(created.getBody().get("key")).isEqualTo("todos");
        // value 反序列化回原生数组
        assertThat(created.getBody().get("value")).isInstanceOf(List.class);

        // 查列表（全量，带 value）
        ResponseEntity<List> rows = rest.exchange("/api/sync/rows", HttpMethod.GET,
                new HttpEntity<>(authHeaders(s.token())), List.class);
        assertThat(rows.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(rows.getBody()).hasSize(1);

        // 查列表（投影模式，不带 value）
        ResponseEntity<List> ids = rest.exchange("/api/sync/rows?fields=id,key,updated", HttpMethod.GET,
                new HttpEntity<>(authHeaders(s.token())), List.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> first = (Map<String, Object>) ids.getBody().get(0);
        assertThat(first).containsKeys("id", "key", "updated");
        assertThat(first).doesNotContainKey("value");

        // 改行 → updated 必须变化（单调，乐观并发依赖它）
        ResponseEntity<Map> updated = rest.exchange("/api/sync/rows/" + rowId, HttpMethod.PUT,
                new HttpEntity<>(Map.of("value", List.of(Map.of("id", "t1", "text", "改过了"))), authHeaders(s.token())),
                Map.class);
        assertThat(updated.getStatusCode()).isEqualTo(HttpStatus.OK);
        String secondUpdated = (String) updated.getBody().get("updated");
        assertThat(secondUpdated).isNotEqualTo(firstUpdated);

        // 计数
        ResponseEntity<Map> count = rest.exchange("/api/sync/rows/count", HttpMethod.GET,
                new HttpEntity<>(authHeaders(s.token())), Map.class);
        assertThat(((Number) count.getBody().get("totalItems")).intValue()).isEqualTo(1);

        // 删行
        ResponseEntity<Void> deleted = rest.exchange("/api/sync/rows/" + rowId, HttpMethod.DELETE,
                new HttpEntity<>(authHeaders(s.token())), Void.class);
        assertThat(deleted.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        // 删后查 → 404
        ResponseEntity<String> gone = rest.exchange("/api/sync/rows/" + rowId, HttpMethod.GET,
                new HttpEntity<>(authHeaders(s.token())), String.class);
        assertThat(gone.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void 同一key重复POST走更新而非建重复() {
        Session s = register();
        rest.exchange("/api/sync/rows", HttpMethod.POST,
                new HttpEntity<>(Map.of("key", "settings", "value", Map.of("theme", "blue")), authHeaders(s.token())),
                Map.class);
        ResponseEntity<Map> again = rest.exchange("/api/sync/rows", HttpMethod.POST,
                new HttpEntity<>(Map.of("key", "settings", "value", Map.of("theme", "red")), authHeaders(s.token())),
                Map.class);
        assertThat(again.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<List> rows = rest.exchange("/api/sync/rows", HttpMethod.GET,
                new HttpEntity<>(authHeaders(s.token())), List.class);
        assertThat(rows.getBody()).hasSize(1); // 仍只有一行
    }

    @Test
    void 越权访问他人数据返回404() {
        Session a = register();
        Session b = register();

        ResponseEntity<Map> created = rest.exchange("/api/sync/rows", HttpMethod.POST,
                new HttpEntity<>(Map.of("key", "todos", "value", List.of()), authHeaders(a.token())),
                Map.class);
        String rowId = (String) created.getBody().get("id");

        // B 查 A 的行 → 404（不泄漏存在性）
        ResponseEntity<String> bGet = rest.exchange("/api/sync/rows/" + rowId, HttpMethod.GET,
                new HttpEntity<>(authHeaders(b.token())), String.class);
        assertThat(bGet.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        // B 改 A 的行 → 404
        ResponseEntity<String> bPut = rest.exchange("/api/sync/rows/" + rowId, HttpMethod.PUT,
                new HttpEntity<>(Map.of("value", List.of()), authHeaders(b.token())), String.class);
        assertThat(bPut.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        // B 的列表里看不到 A 的行（用户隔离）
        ResponseEntity<List> bRows = rest.exchange("/api/sync/rows", HttpMethod.GET,
                new HttpEntity<>(authHeaders(b.token())), List.class);
        assertThat(bRows.getBody()).isEmpty();
    }

    @Test
    void 档案写入返回完整record() {
        Session s = register();
        ResponseEntity<Map> res = rest.exchange("/api/sync/profile", HttpMethod.PUT,
                new HttpEntity<>(Map.of("name", "改名了"), authHeaders(s.token())), Map.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody().get("name")).isEqualTo("改名了");
        assertThat(res.getBody().get("username")).isEqualTo("改名了");
        assertThat(res.getBody()).containsKeys("id", "email", "created", "updated");
    }

    /**
     * 档案扩展字段（昵称 / 等级 / 属性 / 名片状态与目标）必须能写入并原样读回。
     * 前端 pushUserProfile 推的正是这些字段，此前后端只认 name/username/avatar，其余静默丢弃。
     */
    @Test
    void 档案扩展字段读写往返() {
        Session s = register();

        Map<String, Object> patch = new java.util.HashMap<>();
        patch.put("nickname", "夜行者");
        patch.put("total_lv", 42);
        patch.put("level_difficulty", "hard");
        patch.put("attribute_names", Map.of("str", "力量", "int", "智识"));
        patch.put("attribute_levels", Map.of("str", 3, "int", 5));
        patch.put("attribute_points", Map.of("str", 120, "int", 300));
        patch.put("total_points", 420);
        patch.put("unlocked_count", 7);
        patch.put("attribute_level_titles", Map.of("str", List.of("Lv1 新手", "Lv2 修行者")));
        patch.put("status", Map.of("id", "card-1", "at", "2026-10-13T00:00:00Z"));
        patch.put("goal", Map.of("kind", "card", "title", "读完 12 本书", "progress", 40));
        ResponseEntity<Map> res = rest.exchange("/api/sync/profile", HttpMethod.PUT,
                new HttpEntity<>(patch, authHeaders(s.token())), Map.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);

        // 返回契约为「平铺」：扩展字段与 id/email 同层，前端 cloudUser.nickname 直接可读
        Map<?, ?> body = res.getBody();
        assertThat(body.get("nickname")).isEqualTo("夜行者");
        assertThat(((Number) body.get("total_lv")).intValue()).isEqualTo(42);
        assertThat(body.get("level_difficulty")).isEqualTo("hard");
        assertThat(body.get("total_points")).isEqualTo(420);
        assertThat(body.get("unlocked_count")).isEqualTo(7);
        assertThat(body.get("attribute_levels")).isInstanceOf(Map.class);
        assertThat(((Map<?, ?>) body.get("goal")).get("title")).isEqualTo("读完 12 本书");

        // 重新登录拿到的 record 也必须带上这些字段（登录即读全档案）
        ResponseEntity<Map> login = rest.postForEntity("/api/velvet/auth-with-password",
                Map.of("identity", s.email(), "password", "pw-123456"), Map.class);
        assertThat(login.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<?, ?> rec = (Map<?, ?>) login.getBody().get("record");
        assertThat(rec.get("nickname")).isEqualTo("夜行者");
        assertThat(((Number) rec.get("total_lv")).intValue()).isEqualTo(42);

        // GET /api/me 同样平铺
        ResponseEntity<Map> me = rest.exchange("/api/me", HttpMethod.GET,
                new HttpEntity<>(authHeaders(s.token())), Map.class);
        assertThat(me.getBody().get("nickname")).isEqualTo("夜行者");
        assertThat(((Number) me.getBody().get("total_lv")).intValue()).isEqualTo(42);
    }
}
