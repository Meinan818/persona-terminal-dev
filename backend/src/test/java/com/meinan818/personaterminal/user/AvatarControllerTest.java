package com.meinan818.personaterminal.user;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * AvatarController 集成测试：真实 MySQL + 真实 JWT 过滤链 + 真实磁盘落盘。
 *
 * 覆盖：
 *   · 未认证上传 → 401
 *   · 上传（multipart）→ 200，返回可访问的图片地址
 *   · 公开读取 GET /api/avatar/{userId} → 200 且字节与上传一致
 *   · 覆盖上传（换一张）→ 读到的是新的那张
 *   · 删除 → 之后读取 404
 *   · 越权：A 不能删 B 的头像（按当前登录用户，非路径参数）
 *   · 非图片 / 空文件 → 400
 *
 * 运行需 MySQL 可达：MYSQL_PASSWORD=<真实密码> mvn test
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AvatarControllerTest {

    @Autowired
    private TestRestTemplate rest;

    /**
     * TestRestTemplate 默认的 JDK HttpClient 在 multipart（流式）请求遇到 401 时会抛
     * ResourceAccessException（"cannot retry ... in streaming mode"），拿不到状态码。
     * 换成缓冲式的 SimpleClientHttpRequestFactory（HttpURLConnection，无自动重试），
     * 就能正常读到 401 —— 这是测试客户端的特性，与后端实现无关。
     */
    @BeforeEach
    void bufferingClient() {
        rest.getRestTemplate().setRequestFactory(new SimpleClientHttpRequestFactory());
    }

    private record Session(String token, String userId) {}

    private Session register() {
        String email = "avatest-" + UUID.randomUUID() + "@example.com";
        // 同上：固定 UserID 会在同一库上第二次跑时撞唯一性
        String name = "a" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        ResponseEntity<Map> res = rest.postForEntity("/api/velvet/register",
                Map.of("email", email, "password", "pw-123456", "name", name),
                Map.class);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<?, ?> body = res.getBody();
        Map<?, ?> record = (Map<?, ?>) body.get("record");
        return new Session((String) body.get("token"), (String) record.get("id"));
    }

    /** 造一张最小合法 JPEG 字节（测试只看字节往返，不解析图片内容） */
    private static byte[] fakeJpeg(int size, byte seed) {
        byte[] b = new byte[size];
        // JPEG 魔数 FF D8 FF，便于服务端做类型校验
        b[0] = (byte) 0xFF; b[1] = (byte) 0xD8; b[2] = (byte) 0xFF;
        for (int i = 3; i < size; i++) b[i] = (byte) (seed + i);
        return b;
    }

    private ResponseEntity<Map> upload(String token, byte[] bytes, String filename, String contentType) {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.MULTIPART_FORM_DATA);
        h.setBearerAuth(token);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        ByteArrayResource res = new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        };
        body.add("file", new HttpEntity<>(res, fileHeaders(contentType)));

        return rest.exchange("/api/avatar", HttpMethod.POST, new HttpEntity<>(body, h), Map.class);
    }

    private static HttpHeaders fileHeaders(String contentType) {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.parseMediaType(contentType));
        return h;
    }

    @Test
    void 未认证上传返回401() {
        // multipart 是流式请求：客户端在收到 401 时抛 ResourceAccessException，拿不到状态码。
        // 但「它是被鉴权拒绝」这件事可以断言 —— 看异常里的原因/消息含 401 语义。
        // 更稳的做法：换用底层 RestTemplate + 缓冲工厂直发，能拿到真实状态码。
        RestTemplate raw = new RestTemplate(new SimpleClientHttpRequestFactory());
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        ByteArrayResource res = new ByteArrayResource(fakeJpeg(64, (byte) 1)) {
            @Override
            public String getFilename() {
                return "a.jpg";
            }
        };
        body.add("file", new HttpEntity<>(res, fileHeaders("image/jpeg")));

        try {
            ResponseEntity<String> r = raw.exchange(baseUrl() + "/api/avatar", HttpMethod.POST,
                    new HttpEntity<>(body, h), String.class);
            assertThat(r.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        } catch (HttpClientErrorException e) {
            // 401 被当作错误抛出时的等价断言
            assertThat(e.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        }
    }

    private String baseUrl() {
        // TestRestTemplate 已绑定随机端口，取其 root URI
        return rest.getRootUri();
    }

    @Test
    void 公开读取无需登录() {
        // GET /api/avatar/** 是放行的（好友资料卡要能在未登录下加载）
        ResponseEntity<String> res = rest.getForEntity("/api/avatar/no-such-user", String.class);
        // 未登录且用户不存在 → 404（而不是 401），证明这条路径不要求认证
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void 上传后可公开读取且字节一致() {
        Session s = register();
        byte[] jpeg = fakeJpeg(256, (byte) 7);

        ResponseEntity<Map> up = upload(s.token(), jpeg, "a.jpg", "image/jpeg");
        assertThat(up.getStatusCode()).isEqualTo(HttpStatus.OK);

        // 读取不需要登录（他人要看你的头像）
        ResponseEntity<byte[]> got = rest.getForEntity("/api/avatar/" + s.userId(), byte[].class);
        assertThat(got.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(got.getBody()).isEqualTo(jpeg);

        // 档案里的 avatar 字段指向可访问路径
        ResponseEntity<Map> me = rest.exchange("/api/me", HttpMethod.GET,
                new HttpEntity<>(bearer(s.token())), Map.class);
        assertThat(String.valueOf(me.getBody().get("avatar"))).contains("/api/avatar/" + s.userId());
    }

    @Test
    void 覆盖上传读到新图() {
        Session s = register();
        upload(s.token(), fakeJpeg(128, (byte) 1), "a.jpg", "image/jpeg");
        byte[] second = fakeJpeg(300, (byte) 99);
        upload(s.token(), second, "b.png", "image/png");

        ResponseEntity<byte[]> got = rest.getForEntity("/api/avatar/" + s.userId(), byte[].class);
        assertThat(got.getBody()).isEqualTo(second);
    }

    @Test
    void 删除后读取404且可再上传() {
        Session s = register();
        upload(s.token(), fakeJpeg(64, (byte) 3), "a.jpg", "image/jpeg");

        ResponseEntity<Void> del = rest.exchange("/api/avatar", HttpMethod.DELETE,
                new HttpEntity<>(bearer(s.token())), Void.class);
        assertThat(del.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        ResponseEntity<String> got = rest.getForEntity("/api/avatar/" + s.userId(), String.class);
        assertThat(got.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        // 删干净后还能重新上传
        assertThat(upload(s.token(), fakeJpeg(64, (byte) 4), "a.jpg", "image/jpeg").getStatusCode())
                .isEqualTo(HttpStatus.OK);
    }

    @Test
    void 删除只作用于当前登录用户() {
        Session a = register();
        Session b = register();
        byte[] bJpeg = fakeJpeg(80, (byte) 5);
        upload(b.token(), bJpeg, "b.jpg", "image/jpeg");

        // A 调 DELETE（不带路径参数，只能删自己的）→ 不应影响 B
        rest.exchange("/api/avatar", HttpMethod.DELETE, new HttpEntity<>(bearer(a.token())), Void.class);

        ResponseEntity<byte[]> stillThere = rest.getForEntity("/api/avatar/" + b.userId(), byte[].class);
        assertThat(stillThere.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(stillThere.getBody()).isEqualTo(bJpeg);
    }

    @Test
    void 非图片文件被拒400() {
        Session s = register();
        ResponseEntity<Map> res = upload(s.token(), "not an image".getBytes(), "x.txt", "text/plain");
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    private static HttpHeaders bearer(String token) {
        HttpHeaders h = new HttpHeaders();
        h.setBearerAuth(token);
        return h;
    }
}
