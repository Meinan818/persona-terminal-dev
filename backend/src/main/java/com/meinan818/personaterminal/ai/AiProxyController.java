package com.meinan818.personaterminal.ai;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.Set;

/**
 * AI 代理转发：前端把 AI 请求发到本服务，由服务端持有 API Key 转发给真正的服务商。
 *
 * 为什么存在：此前浏览器直连 AI 服务商，API Key 明文暴露在浏览器内存/请求头里；
 * 部署到公网后这是必补的洞。迁到后端后 Key 只存服务端，前端不再触碰。
 *
 * 契约（对齐前端 aiClient / aiProviders 的既有形状，前端只换目的地不换协议）：
 *   POST /api/ai/chat     body = OpenAI 兼容 /chat/completions 的原样请求体（流式/非流式均透传）
 *   POST /api/ai/messages body = Anthropic /v1/messages 的原样请求体
 *   头：Authorization: Bearer <后端登录 JWT>（由 JwtAuthFilter 校验）
 *       X-Upstream-Provider: openai|deepseek|kimi|qwen|gemini|minimax|custom —— 决定用哪把服务端 Key
 *   响应：服务商原样回包（含 SSE 流式，透传 Content-Type）
 *
 * 安全约束：
 *   1. 未登录 → 401（SecurityConfig anyRequest().authenticated() 兜底 + 显式检查双保险）。
 *   2. 目标主机白名单——只允许转发到已知服务商域名，防被当跳板（SSRF）。
 *   3. 不落日志：请求体/响应体一概不打印（含用户对话与 Key）。
 */
@RestController
@RequestMapping("/api/ai")
@Slf4j
public class AiProxyController {

    /** 服务端 Key 注入点：环境变量，缺哪个家就不代理哪个家（fail-closed） */
    private static final Map<String, String> PROVIDER_ENV = Map.of(
            "openai", "OPENAI_API_KEY",
            "deepseek", "DEEPSEEK_API_KEY",
            "kimi", "KIMI_API_KEY",
            "qwen", "QWEN_API_KEY",
            "gemini", "GEMINI_API_KEY",
            "minimax", "MINIMAX_API_KEY"
    );

    /** 各家官方主机白名单（custom 走显式登记的自定义主机） */
    private static final Map<String, Set<String>> PROVIDER_HOSTS = Map.of(
            "openai", Set.of("api.openai.com"),
            "deepseek", Set.of("api.deepseek.com"),
            "kimi", Set.of("api.moonshot.cn", "api.moonshot.ai"),
            "qwen", Set.of("dashscope.aliyuncs.com"),
            "gemini", Set.of("generativelanguage.googleapis.com"),
            "minimax", Set.of("api.minimax.chat", "api.minimaxi.com")
    );

    private final CustomAiHostRegistry customHosts;
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            // SSE 流式转发需要读超时足够宽松：空闲由前端管，这里只防整体挂死
            .build();

    public AiProxyController(CustomAiHostRegistry customHosts) {
        this.customHosts = customHosts;
    }

    /** OpenAI 兼容通道：/chat/completions（含流式 SSE 透传） */
    @PostMapping(value = "/chat", produces = MediaType.ALL_VALUE)
    public ResponseEntity<byte[]> chat(@RequestBody byte[] body,
                                       jakarta.servlet.http.HttpServletRequest request) {
        return relay(body, request, "/chat/completions");
    }

    /** Anthropic 通道：/v1/messages */
    @PostMapping(value = "/messages", produces = MediaType.ALL_VALUE)
    public ResponseEntity<byte[]> messages(@RequestBody byte[] body,
                                           jakarta.servlet.http.HttpServletRequest request) {
        return relay(body, request, "/v1/messages");
    }

    /** 音频转写通道：/audio/transcriptions（multipart 透传，前端 FormData 由 Spring 解包后重建） */
    @PostMapping(value = "/audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.ALL_VALUE)
    public ResponseEntity<byte[]> audio(jakarta.servlet.http.HttpServletRequest request) throws java.io.IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof com.meinan818.personaterminal.security.JwtAuthFilter.UserIdPrincipal)) {
            return ResponseEntity.status(401).body(b("{\"velvet\":\"not_found\"}"));
        }
        String provider = request.getHeader("X-Upstream-Provider");
        if (!StringUtils.hasText(provider)) {
            return ResponseEntity.badRequest().body(b("{\"message\":\"缺少 X-Upstream-Provider 头\"}"));
        }
        provider = provider.toLowerCase();
        String envKey = PROVIDER_ENV.get(provider);
        if (envKey == null) {
            return ResponseEntity.badRequest().body(b("{\"message\":\"不支持的服务商: \" + \"" + provider + "\"}"));
        }
        String apiKey = System.getenv(envKey);
        if (!StringUtils.hasText(apiKey)) {
            return ResponseEntity.status(502).body(b("{\"message\":\"服务端未配置 " + envKey + " 环境变量\"}"));
        }
        Set<String> hosts = PROVIDER_HOSTS.get(provider);
        String upstreamBase = officialBase(provider, hosts);

        // multipart 原样转发：读原始字节 + 保留 Content-Type（含 boundary）
        byte[] raw = request.getInputStream().readAllBytes();
        String contentType = request.getHeader("Content-Type");
        try {
            HttpRequest upstream = HttpRequest.newBuilder()
                    .uri(URI.create(upstreamBase + "/audio/transcriptions"))
                    .timeout(Duration.ofSeconds(120))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", contentType != null ? contentType : "multipart/form-data")
                    .POST(HttpRequest.BodyPublishers.ofByteArray(raw))
                    .build();
            HttpResponse<byte[]> resp = http.send(upstream, HttpResponse.BodyHandlers.ofByteArray());
            MediaType ct = resp.headers().firstValue("Content-Type")
                    .map(MediaType::parseMediaType)
                    .orElse(MediaType.APPLICATION_JSON);
            return ResponseEntity.status(resp.statusCode()).contentType(ct)
                    .body(resp.body() == null ? new byte[0] : resp.body());
        } catch (Exception e) {
            log.warn("AI 代理：音频转写上游失败 provider={} err={}", provider, e.getMessage());
            return ResponseEntity.status(502).body(b("{\"message\":\"AI 服务商连接失败，请稍后重试\"}"));
        }
    }

    private ResponseEntity<byte[]> relay(byte[] body, HttpServletRequest request, String path) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof com.meinan818.personaterminal.security.JwtAuthFilter.UserIdPrincipal)) {
            return ResponseEntity.status(401).body(b("{\"velvet\":\"not_found\"}"));
        }

        String provider = request.getHeader("X-Upstream-Provider");
        if (!StringUtils.hasText(provider)) {
            return ResponseEntity.badRequest().body(b("{\"message\":\"缺少 X-Upstream-Provider 头\"}"));
        }
        provider = provider.toLowerCase();

        // custom 只选择服务端登记的完整基础地址，凭据选择权不交给客户端。
        String upstreamBase;
        String apiKey;
        if ("custom".equals(provider)) {
            String host = request.getHeader("X-Upstream-Host");
            if (StringUtils.hasText(request.getHeader("X-Upstream-Key-Ref"))) {
                return ResponseEntity.badRequest().body(b("{\"message\":\"客户端不能指定服务端凭据引用\"}"));
            }
            CustomAiHostRegistry.Endpoint endpoint = customHosts.resolve(request.getHeader("X-Upstream-Base-Url"), host);
            if (endpoint == null) {
                return ResponseEntity.badRequest().body(b("{\"message\":\"自定义服务商主机未在服务端登记\"}"));
            }
            upstreamBase = endpoint.baseUrl();
            apiKey = customHosts.credential(endpoint);
            if (!StringUtils.hasText(apiKey)) {
                return ResponseEntity.status(502).body(b("{\"message\":\"该服务商的服务端 Key 未配置\"}"));
            }
        } else {
            String envKey = PROVIDER_ENV.get(provider);
            if (envKey == null) {
                return ResponseEntity.badRequest().body(b("{\"message\":\"不支持的服务商: \" + \"" + provider + "\"}"));
            }
            apiKey = System.getenv(envKey);
            if (!StringUtils.hasText(apiKey)) {
                return ResponseEntity.status(502).body(b("{\"message\":\"服务端未配置 " + envKey + " 环境变量\"}"));
            }
            Set<String> hosts = PROVIDER_HOSTS.get(provider);
            // 每家主路径取官方域名（前端 baseUrl 可能带 /v1 等前缀，这里统一拼官方根）
            upstreamBase = officialBase(provider, hosts);
        }

        String url = upstreamBase + ("/v1/messages".equals(path) && upstreamBase.matches(".*/v\\d+$") ? "/messages" : path);
        HttpRequest upstream;
        try {
            HttpRequest.Builder rb = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(120))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofByteArray(body));
            // Anthropic 需要 x-api-key 而非 Bearer（保持与前端原协议一致的双头都带上，无害）
            if ("/v1/messages".equals(path)) {
                rb.header("x-api-key", apiKey)
                  .header("anthropic-version", "3-2023-06-01");
            }
            // 透传流式意愿：SSE 透传由前端读到什么算什么，这里不解析流
            upstream = rb.build();
        } catch (Exception e) {
            log.warn("AI 代理：构造上游请求失败 provider={} err={}", provider, e.getMessage());
            return ResponseEntity.badRequest().body(b("{\"message\":\"转发地址不合法\"}"));
        }

        try {
            HttpResponse<byte[]> resp = http.send(upstream, HttpResponse.BodyHandlers.ofByteArray());
            MediaType ct = resp.headers().firstValue("Content-Type").isPresent()
                    ? MediaType.parseMediaType(resp.headers().firstValue("Content-Type").orElse("application/json"))
                    : MediaType.APPLICATION_JSON;
            return ResponseEntity.status(resp.statusCode())
                    .contentType(ct)
                    .body(resp.body() == null ? new byte[0] : resp.body());
        } catch (Exception e) {
            log.warn("AI 代理：上游请求失败 provider={} err={}", provider, e.getMessage());
            return ResponseEntity.status(502).body(b("{\"message\":\"AI 服务商连接失败，请稍后重试\"}"));
        }
    }

    private static String officialBase(String provider, Set<String> hosts) {
        // 每家取第一个（也是唯一）官方根；带 /v1 与否由 path 决定：
        // OpenAI 兼容官方根无 /v1 后缀也接受 /v1/chat/completions？——不，OpenAI 官方是
        // https://api.openai.com/v1/chat/completions，故 OpenAI/DeepSeek/Kimi 等需要 /v1 前缀。
        String host = hosts.iterator().next();
        return switch (provider) {
            case "openai", "deepseek", "kimi" -> "https://" + host + "/v1";
            case "qwen" -> "https://" + host + "/compatible-mode/v1";
            case "gemini" -> "https://" + host; // gemini 兼容层见服务商文档（此项目用 OpenAI 兼容口时也是 /v1）
            case "minimax" -> "https://" + host;
            default -> "https://" + host;
        };
    }

    private static byte[] b(String s) {
        return s.getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }
}
