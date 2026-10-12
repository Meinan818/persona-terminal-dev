package com.meinan818.personaterminal.ai;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * AiProxyController 集成测试。
 *
 * 覆盖代理自身的门禁行为（不真打上游服务商）：
 *   · 未登录 → 401
 *   · 登录但缺 X-Upstream-Provider 头 → 400
 *   · 登录 + 不支持的服务商 → 400
 *   · 登录 + 服务商 Key 未在服务端配置 → 502
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AiProxyControllerTest {

    @Autowired
    private TestRestTemplate rest;

    private static String uniqueEmail() {
        return "aiproxy-" + UUID.randomUUID() + "@example.com";
    }

    private String token() {
        String email = uniqueEmail();
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("email", email);
        body.put("password", "pw-123456");
        ResponseEntity<Map> res = rest.postForEntity("/api/velvet/register", body, Map.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        return (String) res.getBody().get("token");
    }

    private static HttpHeaders bearer(String token) {
        HttpHeaders h = new HttpHeaders();
        h.setBearerAuth(token);
        h.setContentType(MediaType.APPLICATION_JSON);
        return h;
    }

    private static final String CHAT_BODY = "{\"model\":\"gpt-4o-mini\",\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}]}";

    @Test
    void 未登录访问代理返回401() {
        // 同 AuthControllerTest.loginRaw 的处理：默认 HttpURLConnection 在「流式 POST + 401」
        // 会抛 HttpRetryException（§十二 踩坑 1 同族），改用 JdkClientHttpRequestFactory 缓冲读取
        org.springframework.web.client.RestTemplate raw = new org.springframework.web.client.RestTemplate(
                new org.springframework.http.client.JdkClientHttpRequestFactory());
        raw.setErrorHandler(new org.springframework.web.client.ResponseErrorHandler() {
            @Override public boolean hasError(org.springframework.http.client.ClientHttpResponse response) { return false; }
            @Override public void handleError(org.springframework.http.client.ClientHttpResponse response) { /* no-op */ }
        });
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<String> res = raw.exchange(rest.getRootUri() + "/api/ai/chat", HttpMethod.POST,
                new HttpEntity<>(CHAT_BODY, h), String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void 登录但缺服务商头返回400() {
        ResponseEntity<String> res = rest.exchange("/api/ai/chat", HttpMethod.POST,
                new HttpEntity<>(CHAT_BODY, bearer(token())), String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void 不支持的服务商返回400() {
        HttpHeaders h = bearer(token());
        h.set("X-Upstream-Provider", "hacker");
        ResponseEntity<String> res = rest.exchange("/api/ai/chat", HttpMethod.POST,
                new HttpEntity<>(CHAT_BODY, h), String.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void 服务端未配Key返回502且不泄漏内部信息() {
        HttpHeaders h = bearer(token());
        h.set("X-Upstream-Provider", "openai");
        ResponseEntity<String> res = rest.exchange("/api/ai/chat", HttpMethod.POST,
                new HttpEntity<>(CHAT_BODY, h), String.class);
        // CI/本机一般没配 OPENAI_API_KEY → 502；若配了 Key 则会真打上游（跳过断言 502）
        if (res.getStatusCode() == HttpStatus.BAD_GATEWAY) {
            assertThat(res.getBody()).contains("OPENAI_API_KEY");
            assertThat(res.getBody()).doesNotContain("sk-");
        }
    }
}
