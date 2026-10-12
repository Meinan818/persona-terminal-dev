package com.meinan818.personaterminal.social;

import com.meinan818.personaterminal.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 祈愿接口（社交迁移 W3 第一波）。JWT 鉴权，路径前缀 /api/social/**。
 *
 * <p>契约对齐前端 {@code prayers.ts}：
 *  · GET  /api/social/prayers/today?day=YYYY-MM-DD → {items:[Prayer]}（与我相关，双向）
 *  · POST /api/social/prayers {to, day}            → 创建祈愿；重复 → 409，对自己 → 400
 * 祈愿不可改 / 不可撤回（与 PB 设计一致）。
 */
@RestController
@RequiredArgsConstructor
public class PrayerController {

    private final PrayerService prayerService;

    private String me() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof JwtAuthFilter.UserIdPrincipal p)) return null;
        return p.userId();
    }

    /** GET /api/social/prayers/today —— 今日与我相关的祈愿（day 由前端按本地 04:00 日界算好） */
    @GetMapping("/api/social/prayers/today")
    public ResponseEntity<?> today(@RequestParam(required = false) String day) {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(Map.of("items", prayerService.listToday(m, day, m)));
    }

    /** POST /api/social/prayers {to, day} —— 发送祈愿 */
    @PostMapping("/api/social/prayers")
    public ResponseEntity<?> send(@RequestBody Map<String, Object> body) {
        String m = me();
        if (m == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        String to = body.get("to") == null ? null : String.valueOf(body.get("to"));
        String day = body.get("day") == null ? null : String.valueOf(body.get("day"));
        return ResponseEntity.ok(prayerService.send(m, to, day));
    }
}
