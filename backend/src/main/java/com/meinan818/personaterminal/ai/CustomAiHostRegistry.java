package com.meinan818.personaterminal.ai;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Locale;
import java.util.function.Function;

/**
 * 服务端自定义代理登记：CUSTOM_AI_PROVIDERS 为 JSON 数组，每项含 baseUrl 与 keyRef。
 * baseUrl 必须是完整 HTTPS 基础地址；keyRef 只允许 CUSTOM_AI_KEY_ 前缀的专用变量。
 * 客户端只能选择已登记地址，不能决定凭据变量。旧 CUSTOM_AI_HOSTS 不再赋予凭据权限。
 */
@Component
public class CustomAiHostRegistry {

    record Endpoint(String baseUrl, String keyRef) {}
    private final Map<String, Endpoint> endpoints;
    private final Function<String, String> environment;

    public CustomAiHostRegistry() {
        this(System.getenv("CUSTOM_AI_PROVIDERS"), System::getenv);
    }

    CustomAiHostRegistry(String config, Function<String, String> environment) {
        this.environment = environment;
        Map<String, Endpoint> parsed = new LinkedHashMap<>();
        if (config != null && !config.isBlank()) {
            try {
                JsonNode nodes = new ObjectMapper().readTree(config);
                if (!nodes.isArray()) throw new IllegalArgumentException();
                for (JsonNode node : nodes) {
                    String base = normalizeBase(node.path("baseUrl").asText());
                    String keyRef = node.path("keyRef").asText();
                    if (base == null || !keyRef.matches("CUSTOM_AI_KEY_[A-Z0-9_]+") || parsed.containsKey(base)) throw new IllegalArgumentException();
                    parsed.put(base, new Endpoint(base, keyRef));
                }
            } catch (Exception error) {
                throw new IllegalArgumentException("CUSTOM_AI_PROVIDERS 配置格式不正确");
            }
        }
        endpoints = Map.copyOf(parsed);
    }

    private static String normalizeBase(String value) {
        try {
            URI uri = URI.create(value.trim());
            String path = uri.getRawPath() == null ? "" : uri.getRawPath();
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || uri.getRawUserInfo() != null
                    || uri.getRawQuery() != null || uri.getRawFragment() != null || !uri.normalize().getRawPath().equals(path)
                    || path.matches(".*(?:^|/)\\.{1,2}(?:/|$).*") || path.contains("%") || path.contains("\\")) return null;
            return "https://" + uri.getHost().toLowerCase(Locale.ROOT) + (uri.getPort() == -1 ? "" : ":" + uri.getPort()) + path.replaceAll("/+$", "");
        } catch (Exception error) { return null; }
    }

    Endpoint resolve(String baseUrl, String host) {
        if (baseUrl != null && !baseUrl.isBlank()) {
            String base = normalizeBase(baseUrl);
            return base == null ? null : endpoints.get(base);
        }
        // 兼容旧客户端只给主机：只有该主机恰好登记一个基础路径才可选择。
        Endpoint found = null;
        for (Endpoint endpoint : endpoints.values()) {
            if (URI.create(endpoint.baseUrl()).getAuthority().equalsIgnoreCase(host == null ? "" : host.trim())) {
                if (found != null) return null;
                found = endpoint;
            }
        }
        return found;
    }

    String credential(Endpoint endpoint) { return environment.apply(endpoint.keyRef()); }

    /** 精确匹配 host（小写）。支持 "host[:port]" 形态 */
    public boolean isAllowed(String host) {
        return resolve(null, host) != null;
    }
}
