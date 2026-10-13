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
 * 羁绊之影接口（社交迁移 W3 第四波）。JWT 鉴权，路径前缀 /api/social/**。
 *
 * <p>契约对齐前端 {@code src/services/coopShadows.ts}：
 *  · GET  /api/social/shadows                     → {items:[CoopShadow]}
 *  · GET  /api/social/shadows/{id}                → 单只
 *  · GET  /api/social/shadows/{id}/attacks        → {items:[CoopAttack]}（倒序）
 *  · POST /api/social/shadows                     → 降临（id 由前端给，冲突读回）
 *  · POST /api/social/shadows/{id}/identify       → 识破（幂等）
 *  · POST /api/social/shadows/{id}/attack         → 出手（每日一次；冲突 409 code=already_attacked_today）
 *  · POST /api/social/shadows/{id}/allout         → 总攻击（day='allout'）
 *  · POST /api/social/shadows/{id}/retreat        → 撤退（过期才生效）
 * 越权（不涉及自己）→ 404。
 */
@RestController
@RequiredArgsConstructor
public class CoopShadowController {

    private final CoopShadowService coopShadowService;

    private String me() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof JwtAuthFilter.UserIdPrincipal p)) return null;
        return p.userId();
    }

    @GetMapping("/api/social/shadows")
    public ResponseEntity<?> list() {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(Map.of("items", coopShadowService.listFor(m)));
    }

    @GetMapping("/api/social/shadows/{id}")
    public ResponseEntity<?> get(@PathVariable String id) {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(coopShadowService.get(m, id));
    }

    @GetMapping("/api/social/shadows/{id}/attacks")
    public ResponseEntity<?> attacks(@PathVariable String id) {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(Map.of("items", coopShadowService.attacks(m, id)));
    }

    @PostMapping("/api/social/shadows")
    public ResponseEntity<?> spawn(@RequestBody Map<String, Object> body) {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(coopShadowService.spawn(m, body));
    }

    @PostMapping("/api/social/shadows/{id}/identify")
    public ResponseEntity<?> identify(@PathVariable String id) {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(coopShadowService.identify(m, id));
    }

    @PostMapping("/api/social/shadows/{id}/attack")
    public ResponseEntity<?> attack(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(coopShadowService.attack(m, id, body));
    }

    @PostMapping("/api/social/shadows/{id}/allout")
    public ResponseEntity<?> allOut(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(coopShadowService.allOut(m, id, body));
    }

    @PostMapping("/api/social/shadows/{id}/retreat")
    public ResponseEntity<?> retreat(@PathVariable String id) {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(coopShadowService.retreat(m, id));
    }
}
