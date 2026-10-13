package com.meinan818.personaterminal.social;

import com.meinan818.personaterminal.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 同伴羁绊接口（社交迁移 W3 第二波）。JWT 鉴权，路径前缀 /api/social/**。
 *
 * <p>契约对齐前端 {@code src/services/coopBonds.ts}：
 *  · GET  /api/social/coop/bonds                        → {items:[CoopBond]}（与我相关）
 *  · POST /api/social/coop/bonds/propose                → 发起提议；冷/冲突 → 400
 *  · POST /api/social/coop/bonds/{id}/accept            → 接受；非 pending → 400
 *  · POST /api/social/coop/bonds/{id}/reject            → 拒绝（3 天冷却）
 *  · POST /api/social/coop/bonds/{id}/sever             → 解除（7 天冷却）
 *  · POST /api/social/coop/bonds/{id}/decay {enabled}   → 设置我这侧的逆流开关
 * 越权（不涉及自己）→ 404，不泄露存在性。
 */
@RestController
@RequiredArgsConstructor
public class CoopBondController {

    private final CoopBondService coopBondService;

    private String me() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof JwtAuthFilter.UserIdPrincipal p)) return null;
        return p.userId();
    }

    /** GET /api/social/coop/bonds —— 与我相关的羁绊列表 */
    @GetMapping("/api/social/coop/bonds")
    public ResponseEntity<?> list() {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(Map.of("items", coopBondService.listFor(m)));
    }

    /** POST /api/social/coop/bonds/propose {targetUserId, arcanaId, orientation, intimacyLevel, skillAttribute, message?} */
    @PostMapping("/api/social/coop/bonds/propose")
    public ResponseEntity<?> propose(@RequestBody Map<String, Object> body) {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(coopBondService.propose(m, body));
    }

    /** POST /api/social/coop/bonds/{id}/accept {arcanaId, orientation, intimacyLevel, skillAttribute, message?} */
    @PostMapping("/api/social/coop/bonds/{id}/accept")
    public ResponseEntity<?> accept(@PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(coopBondService.accept(m, id, body == null ? Map.of() : body));
    }

    /** POST /api/social/coop/bonds/{id}/reject */
    @PostMapping("/api/social/coop/bonds/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable String id) {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(coopBondService.reject(m, id));
    }

    /** POST /api/social/coop/bonds/{id}/sever */
    @PostMapping("/api/social/coop/bonds/{id}/sever")
    public ResponseEntity<?> sever(@PathVariable String id) {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(coopBondService.sever(m, id));
    }

    /** POST /api/social/coop/bonds/{id}/decay {enabled} */
    @PostMapping("/api/social/coop/bonds/{id}/decay")
    public ResponseEntity<?> decay(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        boolean enabled = Boolean.TRUE.equals(body.get("enabled"))
                || "true".equalsIgnoreCase(String.valueOf(body.get("enabled")));
        return ResponseEntity.ok(coopBondService.setDecay(m, id, enabled));
    }
}
