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
 * 一起进步约定接口（社交迁移 W3 第三波）。JWT 鉴权，路径前缀 /api/social/**。
 *
 * <p>契约对齐前端 {@code src/services/coopPacts.ts}：
 *  · GET  /api/social/pacts                        → {items:[CoopPact]}（与我相关）
 *  · POST /api/social/pacts                        → 发起约定（pending）
 *  · POST /api/social/pacts/{id}/respond {accept,today,titleTo?}
 *  · POST /api/social/pacts/{id}/done {day,done}   → 打卡 / 撤回（只改自己那栏）
 *  · POST /api/social/pacts/{id}/nudge {today}
 *  · POST /api/social/pacts/{id}/end
 *  · POST /api/social/pacts/{id}/close {status}
 * 越权（不涉及自己）→ 404。
 */
@RestController
@RequiredArgsConstructor
public class CoopPactController {

    private final CoopPactService coopPactService;

    private String me() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof JwtAuthFilter.UserIdPrincipal p)) return null;
        return p.userId();
    }

    /** GET /api/social/pacts —— 与我相关的约定（pending/active 全部 + 结束的留 45 天） */
    @GetMapping("/api/social/pacts")
    public ResponseEntity<?> list() {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(Map.of("items", coopPactService.listFor(m)));
    }

    /** POST /api/social/pacts {toId, kind, mode, title, days, deadline?, message?, today} */
    @PostMapping("/api/social/pacts")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(coopPactService.create(m, body));
    }

    /** POST /api/social/pacts/{id}/respond {accept, today, titleTo?} */
    @PostMapping("/api/social/pacts/{id}/respond")
    public ResponseEntity<?> respond(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(coopPactService.respond(m, id, body));
    }

    /** POST /api/social/pacts/{id}/done {day, done} */
    @PostMapping("/api/social/pacts/{id}/done")
    public ResponseEntity<?> done(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(coopPactService.setDone(m, id, body));
    }

    /** POST /api/social/pacts/{id}/nudge {today} */
    @PostMapping("/api/social/pacts/{id}/nudge")
    public ResponseEntity<?> nudge(@PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(coopPactService.nudge(m, id, body == null ? Map.of() : body));
    }

    /** POST /api/social/pacts/{id}/end */
    @PostMapping("/api/social/pacts/{id}/end")
    public ResponseEntity<?> end(@PathVariable String id) {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(coopPactService.end(m, id));
    }

    /** POST /api/social/pacts/{id}/close {status: finished|expired} */
    @PostMapping("/api/social/pacts/{id}/close")
    public ResponseEntity<?> close(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(coopPactService.close(m, id, body));
    }
}
