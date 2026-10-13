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
 * 满月团战接口（社交迁移 W3 第五波 第四步）。JWT 鉴权，路径前缀 /api/social/orgs/**。
 *
 * <p>契约对齐前端 {@code src/services/orgs.ts} 的团战部分：
 *  · GET    /api/social/orgs/{id}/raids        → {raids, hits}
 *  · POST   /api/social/orgs/{id}/raids        → 开团（{id,slot,boss,hpMax}；撞 → 读回已有）
 *  · POST   /api/social/raids/{raidId}/hits    → 出手（{kind,night,attr,skill,damage,weak}；撞 → dup=true）
 * 越权（非成员）→ 404。
 */
@RestController
@RequiredArgsConstructor
public class OrgRaidController {

    private final OrgRaidService orgRaidService;

    private String me() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof JwtAuthFilter.UserIdPrincipal p)) return null;
        return p.userId();
    }

    @GetMapping("/api/social/orgs/{id}/raids")
    public ResponseEntity<?> list(@PathVariable String id) {
        String m = me();
        if (m == null) return unauthorized();
        return ResponseEntity.ok(orgRaidService.list(m, id));
    }

    @PostMapping("/api/social/orgs/{id}/raids")
    public ResponseEntity<?> createRaid(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String m = me();
        if (m == null) return unauthorized();
        int slot = body.get("slot") == null ? 0 : ((Number) body.get("slot")).intValue();
        int hpMax = body.get("hpMax") == null ? 0 : ((Number) body.get("hpMax")).intValue();
        @SuppressWarnings("unchecked")
        Map<String, Object> boss = body.get("boss") instanceof Map<?, ?> bm ? (Map<String, Object>) bm : Map.of();
        return ResponseEntity.ok(orgRaidService.createRaid(m, id, body.get("id") == null ? null : String.valueOf(body.get("id")), slot, boss, hpMax));
    }

    @PostMapping("/api/social/raids/{raidId}/hits")
    public ResponseEntity<?> createHit(@PathVariable String raidId, @RequestBody Map<String, Object> body) {
        String m = me();
        if (m == null) return unauthorized();
        int damage = body.get("damage") == null ? 0 : ((Number) body.get("damage")).intValue();
        boolean weak = Boolean.TRUE.equals(body.get("weak")) || "true".equalsIgnoreCase(String.valueOf(body.get("weak")));
        return ResponseEntity.ok(orgRaidService.createHit(
                m, raidId,
                body.get("kind") == null ? "" : String.valueOf(body.get("kind")),
                body.get("night") == null ? "" : String.valueOf(body.get("night")),
                body.get("attr") == null ? null : String.valueOf(body.get("attr")),
                body.get("skill") == null ? "" : String.valueOf(body.get("skill")),
                damage, weak));
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
}
