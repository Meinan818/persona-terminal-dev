package com.meinan818.personaterminal.social;

import com.meinan818.personaterminal.security.JwtAuthFilter;
import com.meinan818.personaterminal.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 好友接口（Wave1.3/1.4）。全部走 JWT 鉴权（SecurityConfig anyRequest authenticated 兜底 + 显式检查双保险）。
 * 路径前缀 /api/social/**，契约对齐前端 friendsApi.ts（Wave2.1）。
 */
@RestController
@RequiredArgsConstructor
public class FriendController {

    private final FriendService friendService;
    private final SocialUserService socialUserService;

    private String me() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof JwtAuthFilter.UserIdPrincipal p)) return null;
        return p.userId();
    }

    /** GET /api/social/friends —— 我的好友与 pending 列表（expand 对方档案） */
    @GetMapping("/api/social/friends")
    public ResponseEntity<?> list() {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        List<Map<String, Object>> items = friendService.listFor(m);
        return ResponseEntity.ok(Map.of("items", items));
    }

    /** POST /api/social/friends/request {targetId, message} */
    @PostMapping("/api/social/friends/request")
    public ResponseEntity<?> request(@RequestBody Map<String, Object> body) {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        String targetId = body.get("targetId") == null ? null : String.valueOf(body.get("targetId"));
        String message = body.get("message") == null ? null : String.valueOf(body.get("message"));
        if (targetId == null || targetId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "缺少 targetId"));
        }
        return ResponseEntity.ok(friendService.request(m, targetId, message));
    }

    /** POST /api/social/friends/{id}/accept */
    @PostMapping("/api/social/friends/{id}/accept")
    public ResponseEntity<?> accept(@PathVariable String id) {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(friendService.accept(m, id));
    }

    /** POST /api/social/friends/{id}/decline */
    @PostMapping("/api/social/friends/{id}/decline")
    public ResponseEntity<?> decline(@PathVariable String id) {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(friendService.decline(m, id));
    }

    /** DELETE /api/social/friends/{id} */
    @DeleteMapping("/api/social/friends/{id}")
    public ResponseEntity<?> remove(@PathVariable String id) {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        friendService.remove(m, id);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    /**
     * GET /api/social/users?userId=xxx —— 加好友前查目标存在性，返回精简公开档案。
     * email 永不返回（SocialUserService.publicProfile 保证）。
     */
    @GetMapping("/api/social/users")
    public ResponseEntity<?> lookup(@RequestParam("userId") String userId) {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User u = socialUserService.requireUser(userId);
        return ResponseEntity.ok(socialUserService.publicProfile(u));
    }
}
