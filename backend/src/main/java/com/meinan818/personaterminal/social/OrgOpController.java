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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 作战接口（社交迁移 W3 第五波 第三步）。JWT 鉴权，路径前缀 /api/social/orgs/**。
 *
 * <p>契约对齐前端 {@code src/services/orgs.ts} 的作战部分：
 *  · GET    /api/social/orgs/{id}/ops              → {ops, checkins}（最近 62 天的）
 *  · POST   /api/social/orgs/{id}/ops              → 发起作战（big 只有队长）
 *  · POST   /api/social/ops/{opId}/cancel          → 取消（发起人或队长）
 *  · POST   /api/social/ops/{opId}/checkins        → 打卡（{kind,day,text}；已取消 / 不在名单 → null）
 *  · DELETE /api/social/checkins/{id}              → 删自己的一条打卡
 * 越权（非成员）→ 404。
 */
@RestController
@RequiredArgsConstructor
public class OrgOpController {

    private final OrgOpService orgOpService;

    private String me() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof JwtAuthFilter.UserIdPrincipal p)) return null;
        return p.userId();
    }

    @GetMapping("/api/social/orgs/{id}/ops")
    public ResponseEntity<?> list(@PathVariable String id) {
        String m = me();
        if (m == null) return unauthorized();
        return ResponseEntity.ok(orgOpService.listOps(m, id));
    }

    @PostMapping("/api/social/orgs/{id}/ops")
    public ResponseEntity<?> create(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String m = me();
        if (m == null) return unauthorized();
        return ResponseEntity.ok(orgOpService.create(m, id, body));
    }

    @PostMapping("/api/social/ops/{opId}/cancel")
    public ResponseEntity<?> cancel(@PathVariable String opId) {
        String m = me();
        if (m == null) return unauthorized();
        return ResponseEntity.ok(orgOpService.cancel(m, opId));
    }

    @PostMapping("/api/social/ops/{opId}/checkins")
    public ResponseEntity<?> checkin(@PathVariable String opId, @RequestBody Map<String, Object> body) {
        String m = me();
        if (m == null) return unauthorized();
        return ResponseEntity.ok(orgOpService.createCheckin(
                m, opId,
                body.get("kind") == null ? "" : String.valueOf(body.get("kind")),
                body.get("day") == null ? "" : String.valueOf(body.get("day")),
                body.get("text") == null ? "" : String.valueOf(body.get("text"))));
    }

    @DeleteMapping("/api/social/checkins/{id}")
    public ResponseEntity<?> deleteCheckin(@PathVariable String id) {
        String m = me();
        if (m == null) return unauthorized();
        orgOpService.deleteCheckin(m, id);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
}
