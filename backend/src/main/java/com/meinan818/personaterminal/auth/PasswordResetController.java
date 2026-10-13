package com.meinan818.personaterminal.auth;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;

/**
 * 邮件重置密码（无需登录，SecurityConfig 里已放行这两个路径）：
 *   POST /api/velvet/request-password-reset {identity}          → 200 {}（永远成功，不泄露账号是否存在）
 *   POST /api/velvet/reset-password         {token, password}   → 200 {ok:true}
 *
 * 错误：429 发送过频；500 发信失败；401 {velvet:"not_found"} 令牌无效或过期。
 */
@RestController
@RequestMapping("/api/velvet")
@RequiredArgsConstructor
@Validated
public class PasswordResetController {

    private final PasswordResetService service;

    @Data
    public static class RequestReq {
        @NotBlank
        private String identity;
    }

    @Data
    public static class ResetReq {
        @NotBlank
        private String token;
        /** 与注册/改密同口径：至少 8 位，上限 72 字节由 BCrypt 决定 */
        @NotBlank
        @Size(min = 8, max = 72)
        private String password;
    }

    @PostMapping("/request-password-reset")
    public ResponseEntity<?> requestReset(@RequestBody @Validated RequestReq req) {
        try {
            service.request(req.getIdentity());
            return ResponseEntity.ok(Map.of());
        } catch (PasswordResetService.CooldownException e) {
            return ResponseEntity.status(429).body(Map.of(
                    "message", "发送太频繁，请 " + e.retrySeconds + " 秒后再试"));
        } catch (PasswordResetService.MailSendException e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "message", "重置邮件发送失败，请稍后再试"));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> reset(@RequestBody @Validated ResetReq req) {
        try {
            service.reset(req.getToken(), req.getPassword());
            return ResponseEntity.ok(Map.of("ok", true));
        } catch (PasswordResetService.InvalidTokenException e) {
            // 与登录失败同款：不区分「不存在」与「已过期」
            return ResponseEntity.status(401).body(Map.of("velvet", "not_found"));
        }
    }
}
