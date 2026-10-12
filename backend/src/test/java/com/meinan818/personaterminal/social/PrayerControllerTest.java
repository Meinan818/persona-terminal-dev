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

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 祈愿（Prayer）接口集成测试 —— 社交迁移 W3 第一波。
 *
 * 契约对齐前端 prayers.ts：
 *   · GET  /api/social/prayers/today      → {items:[Prayer]}（今日，本地 04:00 为日界）
 *   · POST /api/social/prayers            → 创建一条祈愿 {to}；同日同对 → 409
 *   · 祈愿不可改 / 不可撤回（与 PB 设计一致）
 *
 * 日界（本地 04:00）在前端算好 day 传给后端，后端只按 (from,to,day) 去重——
 * 与 PB 的 unique 索引语义一致（见 prayers.ts 头注释）。
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PrayerControllerTest {

    @Autowired
    private TestRestTemplate rest;

    private record Acct(String token, String id, String name) {}

    private Acct register(String name) {
        String email = "pray-" + UUID.randomUUID() + "@example.com";
        Map<String, Object> body = Map.of("email", email, "password", "pw-123456", "name", name);
        ResponseEntity<Map> res = rest.postForEntity("/api/velvet/register", body, Map.class);
        assertThat(res.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        Map<?, ?> rec = (Map<?, ?>) res.getBody().get("record");
        return new Acct((String) res.getBody().get("token"), (String) rec.get("id"), name);
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

    private String today() { return java.time.LocalDate.now().toString(); }

    /** GET 今日列表要带 day（前端按本地 04:00 日界算好传来）；缺 day → 400。 */
    private ResponseEntity<Map> todayList(String token) {
        return get(token, "/api/social/prayers/today?day=" + today());
    }

    @SuppressWarnings("unchecked")
    @Test
    void 发送祈愿后对方能在今日列表看到且不能重复发() {
        Acct a = register("pa" + UUID.randomUUID().toString().substring(0, 6));
        Acct b = register("pb" + UUID.randomUUID().toString().substring(0, 6));

        // 初始：双方今日都无祈愿
        assertThat((List<?>) todayList(a.token()).getBody().get("items")).isEmpty();

        // A → B 祈愿
        ResponseEntity<Map> sent = post(a.token(), "/api/social/prayers",
                Map.of("to", b.id(), "day", today()));
        assertThat(sent.getStatusCode()).isEqualTo(org.springframework.http.HttpStatus.OK);
        assertThat(sent.getBody().get("fromId")).isEqualTo(a.id());
        assertThat(sent.getBody().get("toId")).isEqualTo(b.id());

        // A 今日列表：1 条（from=me）；B 今日列表：1 条（to=me）
        List<Map<String, Object>> aList = (List<Map<String, Object>>) todayList(a.token()).getBody().get("items");
        List<Map<String, Object>> bList = (List<Map<String, Object>>) todayList(b.token()).getBody().get("items");
        assertThat(aList).hasSize(1);
        assertThat(bList).hasSize(1);
        // 双向都能看到对方档案
        assertThat(bList.get(0).get("fromProfile")).isNotNull();

        // 同日重复发 → 409
        assertThat(post(a.token(), "/api/social/prayers", Map.of("to", b.id(), "day", today())).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.CONFLICT);

        // 不能对自己祈愿 → 400
        assertThat(post(a.token(), "/api/social/prayers", Map.of("to", a.id(), "day", today())).getStatusCode())
                .isEqualTo(org.springframework.http.HttpStatus.BAD_REQUEST);
    }

    @SuppressWarnings("unchecked")
    @Test
    void 看不到与自己无关的祈愿() {
        Acct a = register("pc" + UUID.randomUUID().toString().substring(0, 6));
        Acct b = register("pd" + UUID.randomUUID().toString().substring(0, 6));
        Acct c = register("pe" + UUID.randomUUID().toString().substring(0, 6));

        post(a.token(), "/api/social/prayers", Map.of("to", b.id(), "day", today()));

        // C 与这条祈愿无关 → 看不到
        assertThat((List<?>) todayList(c.token()).getBody().get("items")).isEmpty();
    }
}
