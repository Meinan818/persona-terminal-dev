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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 弹幕接口（社交迁移 W5）。JWT 鉴权（沿用全局 anyRequest().authenticated()）。
 *
 * <p>契约对齐前端 {@code src/services/danmaku.ts} + {@code danmakuWatch.ts}：
 *  · GET  /api/danmaku?limit=N        → {items:[{id,text}]}（仅 approved，倒序）
 *  · POST /api/danmaku                → 投稿 {text,theme}（校验通过即落库过审）→ {id,text}
 *  · POST /api/danmaku/{id}/report    → 举报 {reason}（幂等，静默）
 *  · GET  /api/danmaku/{id}           → 过审自查：approved → 200；其它 → 404（id 即凭据，匿名不破）
 */
@RestController
@RequiredArgsConstructor
public class DanmakuController {

    private final DanmakuService danmakuService;

    private String me() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof JwtAuthFilter.UserIdPrincipal p)) return null;
        return p.userId();
    }

    @GetMapping("/api/danmaku")
    public ResponseEntity<?> list(@RequestParam(value = "limit", required = false) Integer limit) {
        if (me() == null) return unauthorized();
        return ResponseEntity.ok(Map.of("items", danmakuService.listApproved(limit == null ? 50 : limit)));
    }

    @PostMapping("/api/danmaku")
    public ResponseEntity<?> submit(@RequestBody Map<String, Object> body) {
        if (me() == null) return unauthorized();
        String text = body.get("text") == null ? "" : String.valueOf(body.get("text"));
        String theme = body.get("theme") == null ? "blue" : String.valueOf(body.get("theme"));
        return ResponseEntity.ok(danmakuService.submit(text, theme));
    }

    @PostMapping("/api/danmaku/{id}/report")
    public ResponseEntity<?> report(@PathVariable String id, @RequestBody(required = false) Map<String, Object> body) {
        String m = me();
        if (m == null) return unauthorized();
        String reason = (body == null || body.get("reason") == null) ? "" : String.valueOf(body.get("reason"));
        danmakuService.report(m, id, reason);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    /** 过审自查：approved → 200 + 条目；否则 → 404（前端据 404 判定「还没结果」）。 */
    @GetMapping("/api/danmaku/{id}")
    public ResponseEntity<?> fetch(@PathVariable String id) {
        if (me() == null) return unauthorized();
        Map<String, Object> item = danmakuService.fetchIfApproved(id);
        if (item == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        return ResponseEntity.ok(item);
    }

    private ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
}
