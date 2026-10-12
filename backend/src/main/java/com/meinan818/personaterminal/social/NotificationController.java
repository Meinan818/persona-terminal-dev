package com.meinan818.personaterminal.social;

import com.meinan818.personaterminal.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 通知中心接口（社交迁移 W2）。全部走 JWT 鉴权，路径前缀 /api/social/**。
 *
 * <p>契约对齐前端 {@code notifications.ts}（PB 时代同签名）：
 *  · GET    /api/social/notifications              → {items:[NotificationEntry]}
 *  · POST   /api/social/notifications/{id}/read    → 200 更新后的行
 *  · DELETE /api/social/notifications/{id}         → {ok:true}
 * viewer 只能读改自己的通知（越权 = 404，不泄露存在性）。
 */
@RestController
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    private String me() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof JwtAuthFilter.UserIdPrincipal p)) return null;
        return p.userId();
    }

    /** GET /api/social/notifications —— 我的通知列表（倒序） */
    @GetMapping("/api/social/notifications")
    public ResponseEntity<?> list() {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        List<Map<String, Object>> items = notificationService.listFor(m);
        return ResponseEntity.ok(Map.of("items", items));
    }

    /** POST /api/social/notifications/{id}/read —— 标记已读 */
    @PostMapping("/api/social/notifications/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable String id) {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(notificationService.markRead(m, id));
    }

    /** DELETE /api/social/notifications/{id} */
    @DeleteMapping("/api/social/notifications/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        notificationService.delete(m, id);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
