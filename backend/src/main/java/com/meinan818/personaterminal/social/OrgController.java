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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 组织核心接口（社交迁移 W3 第五波 第一步）。JWT 鉴权，路径前缀 /api/social/orgs。
 *
 * <p>契约对齐前端 {@code src/services/orgs.ts}：
 *  · GET    /api/social/orgs                          → {items:[{org,member}]}（我加入的全部组织）
 *  · GET    /api/social/orgs/{id}                     → 单个组织
 *  · GET    /api/social/orgs/{id}/members             → {items:[OrgMember]}
 *  · GET    /api/social/orgs/preview?code=XXXX        → 组织 或 null（凭码预览）
 *  · POST   /api/social/orgs                          → 建立（{name,motto,emblem,tz,codename}）
 *  · POST   /api/social/orgs/join                     → 加入（{code,codename}）
 *  · PUT    /api/social/orgs/{id}                     → 改资料（队长）
 *  · PUT    /api/social/orgs/{id}/custom              → 改自定义（队长）
 *  · POST   /api/social/orgs/{id}/rotate              → 换邀请码（队长）
 *  · PUT    /api/social/orgs/{id}/members/{mid}       → 改自己那一行
 *  · PUT    /api/social/orgs/{id}/members/{mid}/slot  → 位置校正（只改 slot）
 *  · POST   /api/social/orgs/{id}/leave               → 退出
 *  · POST   /api/social/orgs/{id}/kick/{mid}          → 请离（队长）
 *  · POST   /api/social/orgs/{id}/transfer            → 转让队长（{toMemberId,alsoLeave}）
 *  · DELETE /api/social/orgs/{id}                     → 解散（队长）
 * 越权（非成员 / 非队长）→ 404。
 */
@RestController
@RequiredArgsConstructor
public class OrgController {

    private final OrgService orgService;

    private String me() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof JwtAuthFilter.UserIdPrincipal p)) return null;
        return p.userId();
    }

    @GetMapping("/api/social/orgs")
    public ResponseEntity<?> list() {
        String m = me();
        if (m == null) return unauthorized();
        return ResponseEntity.ok(Map.of("items", orgService.listMine(m)));
    }

    @GetMapping("/api/social/orgs/preview")
    public ResponseEntity<?> preview(@RequestParam(value = "code", required = false) String code) {
        String m = me();
        if (m == null) return unauthorized();
        return ResponseEntity.ok(orgService.preview(m, code));
    }

    @GetMapping("/api/social/orgs/{id}")
    public ResponseEntity<?> fetch(@PathVariable String id) {
        String m = me();
        if (m == null) return unauthorized();
        return ResponseEntity.ok(orgService.fetch(m, id));
    }

    @GetMapping("/api/social/orgs/{id}/members")
    public ResponseEntity<?> members(@PathVariable String id) {
        String m = me();
        if (m == null) return unauthorized();
        return ResponseEntity.ok(Map.of("items", orgService.members(m, id)));
    }

    @PostMapping("/api/social/orgs")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        String m = me();
        if (m == null) return unauthorized();
        return ResponseEntity.ok(orgService.create(m, body));
    }

    @PostMapping("/api/social/orgs/join")
    public ResponseEntity<?> join(@RequestBody Map<String, Object> body) {
        String m = me();
        if (m == null) return unauthorized();
        return ResponseEntity.ok(orgService.join(m, body));
    }

    @PutMapping("/api/social/orgs/{id}")
    public ResponseEntity<?> updateProfile(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String m = me();
        if (m == null) return unauthorized();
        return ResponseEntity.ok(orgService.updateProfile(m, id, body));
    }

    @PutMapping("/api/social/orgs/{id}/custom")
    public ResponseEntity<?> updateCustom(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String m = me();
        if (m == null) return unauthorized();
        return ResponseEntity.ok(orgService.updateCustom(m, id, body));
    }

    @PostMapping("/api/social/orgs/{id}/rotate")
    public ResponseEntity<?> rotate(@PathVariable String id) {
        String m = me();
        if (m == null) return unauthorized();
        return ResponseEntity.ok(orgService.rotate(m, id));
    }

    @PutMapping("/api/social/orgs/members/{mid}")
    public ResponseEntity<?> updateMember(@PathVariable String mid, @RequestBody Map<String, Object> body) {
        String m = me();
        if (m == null) return unauthorized();
        return ResponseEntity.ok(orgService.updateMember(m, mid, body));
    }

    @PutMapping("/api/social/orgs/members/{mid}/slot")
    public ResponseEntity<?> setSlot(@PathVariable String mid, @RequestBody Map<String, Object> body) {
        String m = me();
        if (m == null) return unauthorized();
        return ResponseEntity.ok(orgService.setSlot(m, mid, String.valueOf(body.get("slot"))));
    }

    @PostMapping("/api/social/orgs/{id}/leave")
    public ResponseEntity<?> leave(@PathVariable String id) {
        String m = me();
        if (m == null) return unauthorized();
        orgService.leave(m, id);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/api/social/orgs/{id}/kick/{mid}")
    public ResponseEntity<?> kick(@PathVariable String id, @PathVariable String mid) {
        String m = me();
        if (m == null) return unauthorized();
        return ResponseEntity.ok(orgService.kick(m, id, mid));
    }

    @PostMapping("/api/social/orgs/{id}/transfer")
    public ResponseEntity<?> transfer(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String m = me();
        if (m == null) return unauthorized();
        boolean alsoLeave = Boolean.TRUE.equals(body.get("alsoLeave")) || "true".equalsIgnoreCase(String.valueOf(body.get("alsoLeave")));
        orgService.transfer(m, id, String.valueOf(body.get("toMemberId")), alsoLeave);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @DeleteMapping("/api/social/orgs/{id}")
    public ResponseEntity<?> dissolve(@PathVariable String id) {
        String m = me();
        if (m == null) return unauthorized();
        orgService.dissolve(m, id);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
}
