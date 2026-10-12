package com.meinan818.personaterminal.user;

import com.meinan818.personaterminal.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

/**
 * 登录用户自身资源接口（JWT 保护）。
 *   GET /api/me          → 200 record
 *   PUT /api/velvet/profile {…patch} → 200 record（name/username/avatar/total_lv 可改）
 */
@RestController
@RequiredArgsConstructor
public class MeController {

    private final UserMapper userMapper;

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof JwtAuthFilter.UserIdPrincipal p)) {
            return null;
        }
        return userMapper.selectById(p.userId());
    }

    @GetMapping("/api/me")
    public ResponseEntity<?> me() {
        User u = currentUser();
        if (u == null) return unauthorized();
        return ResponseEntity.ok(toRecord(u));
    }

    @PutMapping("/api/velvet/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, Object> patch) {
        User u = currentUser();
        if (u == null) return unauthorized();
        if (patch.containsKey("name")) u.setName(asString(patch.get("name")));
        if (patch.containsKey("username")) u.setName(asString(patch.get("username")));
        if (patch.containsKey("avatar")) u.setAvatar(asString(patch.get("avatar")));
        u.setUpdated(DateTimeFormatter.ISO_INSTANT.format(Instant.now()));
        userMapper.updateById(u);
        return ResponseEntity.ok(toRecord(u));
    }

    private static String asString(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private static Map<String, Object> toRecord(User u) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", u.getId());
        m.put("email", u.getEmail());
        m.put("name", u.getName());
        m.put("username", u.getName());
        m.put("avatar", u.getAvatar());
        m.put("created", u.getCreated());
        m.put("updated", u.getUpdated());
        return m;
    }

    private static ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(401).body(Map.of("velvet", "not_found"));
    }
}
