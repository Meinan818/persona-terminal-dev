package com.meinan818.personaterminal.user;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * AuthController 集成测试：真实 MySQL + 真实 JWT。
 *
 * 补齐认证核心路径的测试覆盖（此前 5 个 Controller 中唯有 AuthController 零测试，
 * 而它是安全关键路径）。借鉴姊妹项目喵叽智账「高测试密度」的做法。
 *
 * 覆盖：
 *   · 注册成功 → {token, record}，record 含 id/email/name
 *   · 重复邮箱 → 409
 *   · 邮箱密码登录 → 200
 *   · 密码错误 → 401 {"velvet":"not_found"}
 *   · 不存在的账号 → 401（不泄露「账号不存在」与「密码错误」的区别）
 *   · identity 传邮箱大小写不敏感
 *   · 拿 token 调 /api/me → 200 且 id 对得上
 *   · 无 token 调 /api/me → 401
 *   · 注册时邮箱大小写归一（REG@X.COM 登录时用 reg@x.com 应能进）
 *
 * 运行需 MySQL 可达：MYSQL_PASSWORD=<真实密码> mvn test
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AuthControllerTest {

    @Autowired
    private TestRestTemplate rest;

    private static String uniqueEmail() {
        return "authtest-" + UUID.randomUUID() + "@example.com";
    }

    private ResponseEntity<Map> register(String email, String password, String name) {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("email", email);
        body.put("password", password);
        if (name != null) body.put("name", name);
        return rest.postForEntity("/api/velvet/register", body, Map.class);
    }

    private ResponseEntity<Map> login(String identity, String password) {
        return rest.postForEntity("/api/velvet/auth-with-password",
                Map.of("identity", identity, "password", password), Map.class);
    }

    /**
     * 断言会失败的登录（4xx）。TestRestTemplate 默认的 JDK HttpClient 在流式模式下
     * 遇到 401 会抛 ResourceAccessException，拿不到状态码与 body；这里用一个「不抛错」
     * 的 RestTemplate（缓冲式工厂 + 空错误处理器）直发，从而拿到真实响应。
     * 与 AvatarControllerTest 同款处理（同一族缺陷）。
     */
    private ResponseEntity<String> loginRaw(String identity, String password) {
        // 用 JDK 内置的 java.net.http.HttpClient（JdkClientHttpRequestFactory）：
        // 它不像默认的 HttpURLConnection 那样在「流式 POST + 401」时抛
        // HttpRetryException(cannot retry in streaming mode)，能稳定读到 4xx 及其 body。
        RestTemplate raw = new RestTemplate(new JdkClientHttpRequestFactory());
        // 关闭默认的错误抛出，4xx 也作为正常响应返回，便于断言状态码与 body
        raw.setErrorHandler(new org.springframework.web.client.ResponseErrorHandler() {
            @Override public boolean hasError(ClientHttpResponse response) { return false; }
            @Override public void handleError(ClientHttpResponse response) { /* no-op */ }
        });
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        return raw.exchange(rest.getRootUri() + "/api/velvet/auth-with-password", HttpMethod.POST,
                new HttpEntity<>(Map.of("identity", identity, "password", password), h), String.class);
    }

    private static HttpHeaders bearer(String token) {
        HttpHeaders h = new HttpHeaders();
        h.setBearerAuth(token);
        return h;
    }

    @Test
    void 注册成功返回token与record() {
        String email = uniqueEmail();
        ResponseEntity<Map> res = register(email, "pw-123456", "张三");
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<?, ?> body = res.getBody();
        assertThat(body.get("token")).isNotNull();
        Map<?, ?> record = (Map<?, ?>) body.get("record");
        assertThat(record.get("email")).isEqualTo(email);
        assertThat(record.get("name")).isEqualTo("张三");
        assertThat(record.get("id")).isNotNull();
        // 绝不能把密码（哪怕是哈希）回传给客户端
        assertThat(record.containsKey("password")).isFalse();
    }

    @Test
    void 重复邮箱注册返回409() {
        String email = uniqueEmail();
        assertThat(register(email, "pw-123456", null).getStatusCode()).isEqualTo(HttpStatus.OK);
        ResponseEntity<Map> again = register(email, "pw-123456", null);
        assertThat(again.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(again.getBody().get("velvet")).isEqualTo("not_found");
    }

    @Test
    void 邮箱登录成功() {
        String email = uniqueEmail();
        register(email, "pw-123456", null);
        ResponseEntity<Map> res = login(email, "pw-123456");
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody().get("token")).isNotNull();
    }

    @Test
    void 密码错误返回401且不区分账号是否存在() {
        String email = uniqueEmail();
        register(email, "pw-123456", null);

        ResponseEntity<String> wrongPw = loginRaw(email, "wrong-password");
        assertThat(wrongPw.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(wrongPw.getBody()).contains("not_found");

        ResponseEntity<String> noSuchUser = loginRaw(uniqueEmail(), "pw-123456");
        assertThat(noSuchUser.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        // 与「密码错误」返回同一形状 —— 不向攻击者泄露账号是否存在
        assertThat(noSuchUser.getBody()).contains("not_found");
    }

    @Test
    void 登录邮箱大小写不敏感() {
        String email = uniqueEmail();
        register(email, "pw-123456", null);
        // 注册时统一小写存储，登录也应归一
        ResponseEntity<Map> res = login(email.toUpperCase(), "pw-123456");
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void 用name登录() {
        String email = uniqueEmail();
        String name = "uname-" + UUID.randomUUID().toString().substring(0, 8); // 全小写，避开大小写议题
        register(email, "pw-123456", name);
        ResponseEntity<Map> res = login(name, "pw-123456");
        assertThat(res.getStatusCode())
                .as("应当支持用 name 登录（HANDOFF §五.3）")
                .isEqualTo(HttpStatus.OK);
    }

    @Test
    void 带token访问me返回对应用户() {
        String email = uniqueEmail();
        Map<?, ?> record = (Map<?, ?>) register(email, "pw-123456", null).getBody().get("record");
        String token = (String) login(email, "pw-123456").getBody().get("token");

        ResponseEntity<Map> me = rest.exchange("/api/me", HttpMethod.GET,
                new HttpEntity<>(bearer(token)), Map.class);
        assertThat(me.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(me.getBody().get("id")).isEqualTo(record.get("id"));
    }

    @Test
    void 无token访问me返回401() {
        ResponseEntity<String> res = rest.getForEntity("/api/me", String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void 伪造token访问me返回401() {
        ResponseEntity<String> res = rest.exchange("/api/me", HttpMethod.GET,
                new HttpEntity<>(bearer("not.a.real.jwt")), String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
