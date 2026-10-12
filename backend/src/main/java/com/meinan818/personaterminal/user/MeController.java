package com.meinan818.personaterminal.user;

import com.meinan818.personaterminal.security.JwtAuthFilter;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
        // UserID（= users.name）唯一性：注册时已查重（AuthController.register），改的时候也要查，
        // 否则两人能改成同一个 UserID，之后「按 UserID 查人加好友」（social/users?userId=）会有歧义。
        // 排除自己：改成当前同名是幂等 no-op，不该报冲突。
        Object newName = patch.containsKey("username") ? patch.get("username")
                : patch.containsKey("name") ? patch.get("name") : null;
        if (newName != null) {
            String name = asString(newName);
            if (name != null && !name.isBlank() && !name.equals(u.getName())) {
                Long taken = userMapper.selectCount(
                        new QueryWrapper<User>().eq("name", name).ne("id", u.getId()));
                if (taken != null && taken > 0) {
                    return ResponseEntity.status(HttpStatus.CONFLICT)
                            .body(Map.of("velvet", "not_found", "message", "UserID 已被占用"));
                }
            }
        }
        if (patch.containsKey("name")) u.setName(asString(patch.get("name")));
        if (patch.containsKey("username")) u.setName(asString(patch.get("username")));
        if (patch.containsKey("avatar")) u.setAvatar(asString(patch.get("avatar")));
        // 档案扩展字段（nickname / total_lv / attribute_* / status / goal …）并入 profile JSON 列
        u.setProfile(UserProfileFields.merge(u.getProfile(), patch));
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
        // 档案扩展字段与基础字段同层（前端 cloudUser.nickname 等直接可读）
        UserProfileFields.flatten(u.getProfile(), m);
        m.put("created", u.getCreated());
        m.put("updated", u.getUpdated());
        return m;
    }

    private static ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(401).body(Map.of("velvet", "not_found"));
    }
}
