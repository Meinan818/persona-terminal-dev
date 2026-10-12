package com.meinan818.personaterminal.auth;

import com.meinan818.personaterminal.security.JwtUtil;
import com.meinan818.personaterminal.user.User;
import com.meinan818.personaterminal.user.UserMapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

/**
 * 邮箱验证码 登录/注册合一（对齐前端 requestLoginOrSignupOTP 流程）：
 *   POST /api/velvet/otp/request  {email}        → 200 {}（发送验证码；新邮箱不建号，verify 时再建）
 *   POST /api/velvet/otp/verify   {email, code}  → 200 {token, record}（新邮箱自动注册）
 *
 * 错误：429 限流 {message}；500 发信失败 {message}；401 验证码错/过期 {velvet:"not_found"}
 */
@RestController
@RequestMapping("/api/velvet/otp")
@RequiredArgsConstructor
@Validated
public class OtpAuthController {

    private final OtpService otpService;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    /** OTP 注册用户的占位密码（用户永远不知道；后续可走密码重置设真密码） */
    private static final SecureRandom RANDOM = new SecureRandom();

    @Data
    public static class RequestReq {
        @NotBlank @Email
        private String email;
    }

    @Data
    public static class VerifyReq {
        @NotBlank @Email
        private String email;
        @NotBlank
        private String code;
    }

    @PostMapping("/request")
    public ResponseEntity<?> request(@RequestBody @Validated RequestReq req) {
        try {
            otpService.send(req.getEmail().trim().toLowerCase());
            return ResponseEntity.ok(Map.of());
        } catch (OtpService.CooldownException e) {
            return ResponseEntity.status(429).body(Map.of(
                    "message", "发送太频繁，请 " + e.retrySeconds + " 秒后再试"));
        } catch (OtpService.MailSendException e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "message", "验证码邮件发送失败，请稍后再试或检查邮箱地址"));
        }
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verify(@RequestBody @Validated VerifyReq req) {
        String email = req.getEmail().trim().toLowerCase();
        if (!otpService.verify(email, req.getCode())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("velvet", "not_found"));
        }
        // 登录或注册：已有账号直接登录，否则用随机占位密码建号（对齐 PB 的 OTP 注册语义）
        User u = userMapper.selectOne(new QueryWrapper<User>().eq("email", email).last("LIMIT 1"));
        if (u == null) {
            char[] pwd = new char[16];
            String alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            for (int i = 0; i < pwd.length; i++) pwd[i] = alphabet.charAt(RANDOM.nextInt(alphabet.length()));
            u = new User();
            u.setEmail(email);
            u.setName(email.split("@")[0]);
            u.setPassword(passwordEncoder.encode(new String(pwd)));
            String now = DateTimeFormatter.ISO_INSTANT.format(Instant.now());
            u.setCreated(now);
            u.setUpdated(now);
            userMapper.insert(u);
        }
        String token = jwtUtil.generate(u.getId(), u.getEmail());
        Map<String, Object> record = new HashMap<>();
        record.put("id", u.getId());
        record.put("email", u.getEmail());
        record.put("name", u.getName());
        record.put("avatar", u.getAvatar());
        record.put("created", u.getCreated());
        record.put("updated", u.getUpdated());
        return ResponseEntity.ok(Map.of("token", token, "record", record));
    }
}
