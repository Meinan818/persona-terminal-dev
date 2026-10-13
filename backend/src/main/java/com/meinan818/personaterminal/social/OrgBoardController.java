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
 * 公告板接口（社交迁移 W3 第五波 第二步）。JWT 鉴权，路径前缀 /api/social/orgs/**。
 *
 * <p>契约对齐前端 {@code src/services/orgs.ts} 的公告板部分：
 *  · GET    /api/social/orgs/{id}/board              → {posts, reactions}
 *  · GET    /api/social/orgs/{id}/ledger             → {items:[OrgPost]}（纪要 + 达成卡，不限 30 天）
 *  · POST   /api/social/orgs/{id}/moments            → 发动态
 *  · POST   /api/social/orgs/{id}/reactions          → 贴/换/撤标签（{postId, tag}；撤 → null）
 *  · DELETE /api/social/posts/{postId}               → 删动态
 *  · POST   /api/social/orgs/reports                 → 举报
 *  · POST   /api/social/orgs/{id}/minutes            → 发纪要（{id, snapshot, weekKey}）
 *  · POST   /api/social/orgs/{id}/opcards            → 发达成卡（{id, snapshot, weekKey}）
 *  · POST   /api/social/orgs/{id}/purge/{userId}     → 删某人在此组织的动态与标签
 * 越权（非成员 / 非本人 / 非队长）→ 404。
 */
@RestController
@RequiredArgsConstructor
public class OrgBoardController {

    private final OrgBoardService orgBoardService;

    private String me() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof JwtAuthFilter.UserIdPrincipal p)) return null;
        return p.userId();
    }

    @GetMapping("/api/social/orgs/{id}/board")
    public ResponseEntity<?> board(@PathVariable String id) {
        String m = me();
        if (m == null) return unauthorized();
        return ResponseEntity.ok(orgBoardService.board(m, id));
    }

    @GetMapping("/api/social/orgs/{id}/ledger")
    public ResponseEntity<?> ledger(@PathVariable String id) {
        String m = me();
        if (m == null) return unauthorized();
        return ResponseEntity.ok(Map.of("items", orgBoardService.ledger(m, id)));
    }

    @PostMapping("/api/social/orgs/{id}/moments")
    public ResponseEntity<?> createMoment(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String m = me();
        if (m == null) return unauthorized();
        return ResponseEntity.ok(orgBoardService.createMoment(m, id, body));
    }

    @PostMapping("/api/social/orgs/{id}/reactions")
    public ResponseEntity<?> setReaction(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String m = me();
        if (m == null) return unauthorized();
        return ResponseEntity.ok(orgBoardService.setReaction(m, id, String.valueOf(body.get("postId")), body.get("tag") == null ? null : String.valueOf(body.get("tag"))));
    }

    @DeleteMapping("/api/social/posts/{postId}")
    public ResponseEntity<?> deletePost(@PathVariable String postId) {
        String m = me();
        if (m == null) return unauthorized();
        orgBoardService.deletePost(m, postId);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/api/social/orgs/reports")
    public ResponseEntity<?> report(@RequestBody Map<String, Object> body) {
        String m = me();
        if (m == null) return unauthorized();
        orgBoardService.report(m, body);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/api/social/orgs/{id}/minutes")
    public ResponseEntity<?> createMinutes(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String m = me();
        if (m == null) return unauthorized();
        return ResponseEntity.ok(orgBoardService.createMinutes(m, id, body));
    }

    @PostMapping("/api/social/orgs/{id}/opcards")
    public ResponseEntity<?> createOpCard(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String m = me();
        if (m == null) return unauthorized();
        return ResponseEntity.ok(orgBoardService.createOpCard(m, id, body));
    }

    @PostMapping("/api/social/orgs/{id}/purge/{userId}")
    public ResponseEntity<?> purge(@PathVariable String id, @PathVariable String userId) {
        String m = me();
        if (m == null) return unauthorized();
        orgBoardService.deleteUserContent(m, id, userId);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
}
