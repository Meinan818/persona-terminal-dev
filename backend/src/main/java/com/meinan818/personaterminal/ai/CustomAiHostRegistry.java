package com.meinan818.personaterminal.ai;

import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * 自定义 AI 服务商主机白名单（服务端视角）。
 *
 * 背景：前端支持「custom」服务商（任意 OpenAI 兼容中转站）。代理转发模式下，
 * 服务端不能无脑转发到任意主机（否则登录用户可把它当 SSRF 跳板），
 * 所以自定义主机会先在服务端登记。登记方式：
 *   环境变量 CUSTOM_AI_HOSTS（逗号分隔，如 "api.example-relay.com,relay.foo.cn"）
 * 未配置 → custom 服务商代理不可用（fail-closed），前端会收到明确错误。
 */
@Component
public class CustomAiHostRegistry {

    private final Set<String> allowedHosts;

    public CustomAiHostRegistry() {
        String raw = System.getenv("CUSTOM_AI_HOSTS");
        if (raw == null || raw.isBlank()) {
            this.allowedHosts = Set.of();
        } else {
            this.allowedHosts = Set.of(raw.trim().toLowerCase().split("\\s*,\\s*"));
        }
    }

    /** 精确匹配 host（小写）。支持 "host[:port]" 形态 */
    public boolean isAllowed(String host) {
        if (host == null) return false;
        return allowedHosts.contains(host.trim().toLowerCase());
    }
}
