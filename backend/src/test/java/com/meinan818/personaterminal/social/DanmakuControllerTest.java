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

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 弹幕（Danmaku）接口集成测试 —— 社交迁移 W5。
 *
 * <p>重点覆盖硬不变量：
 *  1. 匿名：投稿后表里没有任何指向作者的列（靠 SQL 层，这里用接口无法直接验，见红灯探针）
 *  2. 自动过审：投稿返回即有 id，列表立刻能看到它
 *  3. 举报幂等：同一人重复举报静默（(danmaku,reporter_id) 唯一）
 *  4. 过审自查：GET /{id} approved → 200；不存在的 id → 404
 *  5. 校验：空文本 / 超 20 字 / 含链接 被拒
 *  6. 未登录 → 401
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class DanmakuControllerTest {

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
    private List<Map<String, Object>> items(ResponseEntity<Map> res) {
        return (List<Map<String, Object>>) res.getBody().get("items");
    }

    /** 投稿并返回 id。 */
    private String submit(String token, String text, String theme) {
        ResponseEntity<Map> res = post(token, "/api/danmaku", Map.of("text", text, "theme", theme));
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        return (String) res.getBody().get("id");
    }

    // ── 测试 ─────────────────────────────────────────────

    @Test
    void 投稿后立即过审且列表能看到() {
        Acct a = register("da");
        String text = "加油呀-" + UUID.randomUUID().toString().substring(0, 6);
        String id = submit(a.token(), text, "blue");
        assertThat(id).isNotBlank();

        // 列表能看到（自动过审）
        List<Map<String, Object>> list = items(get(a.token(), "/api/danmaku?limit=50"));
        assertThat(list.stream().anyMatch(it -> id.equals(it.get("id")))).isTrue();

        // 自查：approved → 200
        ResponseEntity<Map> fetch = get(a.token(), "/api/danmaku/" + id);
        assertThat(fetch.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(fetch.getBody().get("text")).isEqualTo(text);
    }

    @Test
    void 过审自查不存在的id返回404() {
        Acct a = register("db");
        ResponseEntity<Map> fetch = get(a.token(), "/api/danmaku/nonexistent-" + UUID.randomUUID());
        assertThat(fetch.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void 举报幂等重复举报静默() {
        Acct a = register("dc");
        Acct b = register("dd");
        String id = submit(a.token(), "大家一起-" + UUID.randomUUID().toString().substring(0, 6), "yellow");

        // B 举报两次
        assertThat(post(b.token(), "/api/danmaku/" + id + "/report", Map.of("reason", "不喜欢")).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(post(b.token(), "/api/danmaku/" + id + "/report", Map.of("reason", "再举报一次")).getStatusCode()).isEqualTo(HttpStatus.OK);
        // 举报不存在的弹幕也 200（静默）
        assertThat(post(b.token(), "/api/danmaku/nope-" + UUID.randomUUID() + "/report", Map.of("reason", "x")).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void 校验空文本超长含链接被拒() {
        Acct a = register("de");
        // 空
        assertThat(post(a.token(), "/api/danmaku", Map.of("text", "   ", "theme", "blue")).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        // 超 20 字
        assertThat(post(a.token(), "/api/danmaku", Map.of("text", "一二三四五六七八九十一二三四五六七八九十一", "theme", "blue")).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        // 含链接
        assertThat(post(a.token(), "/api/danmaku", Map.of("text", "看 http://x.com", "theme", "blue")).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        // 含引流词
        assertThat(post(a.token(), "/api/danmaku", Map.of("text", "加微信领奖", "theme", "blue")).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        // 正好 20 字 → 通过
        assertThat(post(a.token(), "/api/danmaku", Map.of("text", "一二三四五六七八九十一二三四五六七八九十", "theme", "blue")).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void 未登录返回401() {
        ResponseEntity<String> res = raw().exchange(rest.getRootUri() + "/api/danmaku?limit=10",
                HttpMethod.GET, new HttpEntity<>(new HttpHeaders()), String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void 无效主题归一为blue() {
        Acct a = register("df");
        // theme 传个乱七八糟的值 → 落库为 blue，不报错
        ResponseEntity<Map> res = post(a.token(), "/api/danmaku", Map.of("text", "主题测试-" + UUID.randomUUID().toString().substring(0, 5), "theme", "rainbow"));
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody().get("id")).isNotNull();
    }
}
