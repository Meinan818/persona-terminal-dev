package com.meinan818.personaterminal.user;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.client.ResponseErrorHandler;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 注销的端到端验收：真实 HTTP + 真实库（隔离库）。
 *
 * <p>断言三件事：注销接口成功；注销后旧凭据再也登不进来；**该用户名下的数据真的没了**
 * （直接查库，而不是只看接口回包）。
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AccountDeletionEndToEndTest {

    @Autowired
    private TestRestTemplate rest;
    @Autowired
    private JdbcTemplate jdbc;

    private record Session(String token, String id, String name) {}

    private Session register() {
        String email = "del-" + UUID.randomUUID() + "@example.com";
        String name = "del" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        ResponseEntity<Map> res = rest.postForEntity("/api/velvet/register",
                Map.of("email", email, "password", "pw-123456", "name", name), Map.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<?, ?> record = (Map<?, ?>) res.getBody().get("record");
        return new Session((String) res.getBody().get("token"), (String) record.get("id"), name);
    }

    private HttpHeaders bearer(String token) {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        h.setBearerAuth(token);
        return h;
    }

    private int count(String sql, Object... args) {
        Integer n = jdbc.queryForObject(sql, Integer.class, args);
        return n == null ? 0 : n;
    }

    /**
     * 断言 4xx 时不能直接用 TestRestTemplate：它默认的 JDK HttpClient 在「带 body 的请求 + 4xx」
     * 会抛 HttpRetryException(cannot retry ... in streaming mode)，拿不到状态码。
     * 换成本仓库既有做法：JdkClientHttpRequestFactory + 不抛错的 ResponseErrorHandler。
     */
    private RestTemplate rawClient() {
        RestTemplate raw = new RestTemplate(new JdkClientHttpRequestFactory());
        raw.setErrorHandler(new ResponseErrorHandler() {
            @Override public boolean hasError(ClientHttpResponse response) { return false; }
            @Override public void handleError(ClientHttpResponse response) { /* 4xx 当正常响应读 */ }
        });
        return raw;
    }

    @Test
    void 注销后账号与名下数据一起消失且旧凭据失效() {
        Session s = register();

        // 先造一条归属该用户的数据，注销后应当一并消失
        ResponseEntity<Map> created = rest.exchange("/api/sync/rows", HttpMethod.POST,
                new HttpEntity<>(Map.of("key", "todos",
                        "value", List.of(Map.of("id", "t1", "title", "注销测试"))), bearer(s.token())), Map.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(count("SELECT COUNT(*) FROM user_data WHERE user_id = ?", s.id())).isEqualTo(1);

        ResponseEntity<Map> deleted = rest.exchange("/api/velvet/account", HttpMethod.DELETE,
                new HttpEntity<>(bearer(s.token())), Map.class);
        assertThat(deleted.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(deleted.getBody().get("ok")).isEqualTo(true);

        // 数据真的没了（直接查库，不信接口回包）
        assertThat(count("SELECT COUNT(*) FROM users WHERE id = ?", s.id())).isZero();
        assertThat(count("SELECT COUNT(*) FROM user_data WHERE user_id = ?", s.id())).isZero();

        // 旧凭据再也进不来
        ResponseEntity<Map> login = rawClient().postForEntity(
                rest.getRootUri() + "/api/velvet/auth-with-password",
                Map.of("identity", s.name(), "password", "pw-123456"), Map.class);
        assertThat(login.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void 未登录不能注销() {
        ResponseEntity<Map> res = rawClient().exchange(rest.getRootUri() + "/api/velvet/account",
                HttpMethod.DELETE, new HttpEntity<>(new HttpHeaders()), Map.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
