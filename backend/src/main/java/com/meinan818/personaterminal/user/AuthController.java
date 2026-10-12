package com.meinan818.personaterminal.user;

import com.meinan818.personaterminal.security.JwtUtil;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

/**
 * 认证接口。契约对齐前端 src/services/auth.ts：
 *   POST /api/velvet/register           {email, password, name?} → 200 {token, record}
 *   POST /api/velvet/auth-with-password {identity(email), password} → 200 {token, record}
 * 失败：400 参数错误 / 401 {"velvet":"not_found"}（对齐 VELVET_NOT_FOUND）
 */
@RestController
@RequestMapping("/api/velvet")
@RequiredArgsConstructor
@Validated
public class AuthController {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Data
    public static class LoginReq {
        /** 前端传 identity 或 email 均可 */
        private String identity;
        private String email;
        @NotBlank
        private String password;
        private String name;
    }

    @Data
    public static class RegisterReq {
        @NotBlank @Email
        private String email;
        @NotBlank
        private String password;
        private String name;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody @Validated RegisterReq req) {
        String email = req.getEmail().toLowerCase();
        Long count = userMapper.selectCount(
                new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<User>().eq("email", email));
        if (count != null && count > 0) {
            return conflict();
        }
        User u = new User();
        u.setEmail(email);
        u.setName(req.getName() == null ? email.split("@")[0] : req.getName());
        u.setPassword(passwordEncoder.encode(req.getPassword()));
        String now = DateTimeFormatter.ISO_INSTANT.format(Instant.now());
        u.setCreated(now);
        u.setUpdated(now);
        userMapper.insert(u);
        return ResponseEntity.ok(body(u, jwtUtil.generate(u.getId(), u.getEmail())));
    }

    @PostMapping("/auth-with-password")
    public ResponseEntity<?> authWithPassword(@RequestBody LoginReq req) {
        String identity = (req.getIdentity() != null ? req.getIdentity() : req.getEmail());
        if (identity == null || identity.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "identity is required"));
        }
        User u = userMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<User>()
                        .eq("email", identity.toLowerCase()).last("LIMIT 1"));
        if (u == null || !passwordEncoder.matches(req.getPassword(), u.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("velvet", "not_found"));
        }
        return ResponseEntity.ok(body(u, jwtUtil.generate(u.getId(), u.getEmail())));
    }

    private Map<String, Object> body(User u, String token) {
        Map<String, Object> record = new HashMap<>();
        record.put("id", u.getId());
        record.put("email", u.getEmail());
        record.put("name", u.getName());
        record.put("avatar", u.getAvatar());
        record.put("created", u.getCreated());
        record.put("updated", u.getUpdated());
        Map<String, Object> m = new HashMap<>();
        m.put("token", token);
        m.put("record", record);
        return m;
    }

    private ResponseEntity<?> conflict() {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("velvet", "not_found", "message", "email already registered"));
    }
}
