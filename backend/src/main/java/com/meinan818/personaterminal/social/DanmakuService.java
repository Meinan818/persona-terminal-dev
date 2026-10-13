package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 弹幕服务（社交迁移 W5）。镜像前端 {@code src/services/danmaku.ts} + {@code danmakuWatch.ts} 的语义。
 *
 * <p>契约逐字对齐前端：
 *  · 匿名：**不存作者**（表里没有任何指向用户的列），迁移后依然如此——这是设计地基
 *  · 列表只出 status='approved'，按 created 倒序
 *  · 投稿：先过 validateDanmaku（禁链接/引流、≤20 字），通过即落库
 *  · 举报：(danmaku, reporter_id) 唯一，重复静默忽略
 *  · 过审自查：GET /{id} —— approved → 200，否则 404（**id 即凭据**，服务端不知道谁在探，匿名不破）
 *
 * <p>⚠️ 设计决策（本波与 PB 时代的唯一实质差异）：
 *  PB 时代 status 一律写 'pending'，靠 **PB Admin 后台人工点** 改 'approved'。
 *  自研后端**没有 admin / role 概念**（无管理 UI、无管理员字段），若照搬 pending 则没有任何
 *  人或程序会去点过审，弹幕会永远堆着不公开。故本波采用**自动过审**：validateDanmaku 通过
 *  即 status='approved'（UGC 防线由客户端预过滤 + 举报 + 本地屏蔽承担）。
 *  如需严格人工过审，再加 admin 开关（DANMAKU_ADMIN_IDS + approve/reject 接口）——届时
 *  只需把这里的 status 改回 pending 并补两个接口，前端分流层不受影响。
 */
@Service
@RequiredArgsConstructor
public class DanmakuService {

    /** 与前端 danmaku.ts 的 DANMAKU_MAX_LEN 一致 */
    private static final int MAX_LEN = 20;
    /** 与前端 danmaku.ts 的 BANNED 逐字一致 */
    private static final String[] BANNED = {"http://", "https://", "www.", "加微信", "加群", "免费领"};

    private final DanmakuMapper danmakuMapper;
    private final DanmakuReportMapper reportMapper;

    // ── 读（公开，不要求登录）────────────────────────────

    /** 已过审弹幕（按 created 倒序，最多 limit 条）。 */
    public List<Map<String, Object>> listApproved(int limit) {
        int cap = limit <= 0 ? 50 : Math.min(limit, 100);
        List<Danmaku> rows = danmakuMapper.selectList(new QueryWrapper<Danmaku>()
                .eq("status", "approved").orderByDesc("created").last("LIMIT " + cap));
        List<Map<String, Object>> out = new ArrayList<>(rows.size());
        for (Danmaku d : rows) out.add(toItem(d));
        return out;
    }

    /**
     * 过审自查（id 即凭据）：approved → 返回该条；否则 → null（调用方映射成 404）。
     * 服务端不知道谁在探，匿名不破。
     */
    public Map<String, Object> fetchIfApproved(String id) {
        Danmaku d = danmakuMapper.selectById(id);
        if (d == null || !"approved".equals(d.getStatus())) return null;
        return toItem(d);
    }

    // ── 写 ───────────────────────────────────────────────

    /** 投稿（需登录）：校验通过即落库。返回新条目 {id,text}。 */
    public Map<String, Object> submit(String text, String theme) {
        String reason = validate(text);
        if (reason != null) throw new SocialException(HttpStatus.BAD_REQUEST, reason);
        String t = text.trim();
        String th = ("yellow".equals(theme) || "red".equals(theme)) ? theme : "blue";
        Instant now = Instant.now();
        Danmaku d = new Danmaku();
        d.setId(newId());
        d.setText(t);
        d.setTheme(th);
        // 自动过审（见类注释的设计决策）；如需人工过审改这里为 "pending"
        d.setStatus("approved");
        d.setIsSeed(0);
        d.setReportCount(0);
        d.setApprovedAt(iso(now));
        d.setCreated(iso(now));
        d.setUpdated(d.getCreated());
        danmakuMapper.insert(d);
        return toItem(d);
    }

    /** 举报（需登录）：(danmaku, reporter_id) 唯一，重复静默忽略；顺手把 report_count +1。 */
    public void report(String me, String danmakuId, String reason) {
        Danmaku d = danmakuMapper.selectById(danmakuId);
        if (d == null) return; // 已不存在：静默
        DanmakuReport r = new DanmakuReport();
        r.setId(newId());
        r.setDanmaku(danmakuId);
        r.setReason(nz(reason));
        r.setReporterId(me);
        r.setCreated(iso(Instant.now()));
        try {
            reportMapper.insert(r);
        } catch (DuplicateKeyException e) {
            return; // 已经举报过：静默
        }
        // 举报数 +1（尽力而为；并发下可能少记，不是关键路径）
        try {
            d.setReportCount((d.getReportCount() == null ? 0 : d.getReportCount()) + 1);
            d.setUpdated(iso(Instant.now()));
            danmakuMapper.updateById(d);
        } catch (Exception ignore) { }
    }

    // ── 内部 ─────────────────────────────────────────────

    /** 与前端 validateDanmaku 逐字对齐：返回 null = 通过，否则返回中文原因。 */
    private static String validate(String text) {
        String t = text == null ? "" : text.trim();
        if (t.isEmpty()) return "写点什么吧";
        if (t.codePointCount(0, t.length()) > MAX_LEN) return "最多 " + MAX_LEN + " 字";
        String lower = t.toLowerCase();
        for (String w : BANNED) {
            if (lower.contains(w.toLowerCase())) return "含有不允许的内容（链接 / 引流等）";
        }
        return null;
    }

    private Map<String, Object> toItem(Danmaku d) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", d.getId());
        m.put("text", nz(d.getText()));
        return m;
    }

    private static String nz(String v) { return v == null ? "" : v; }

    private static String iso(Instant i) { return DateTimeFormatter.ISO_INSTANT.format(i); }

    private static String newId() {
        return Long.toHexString(System.currentTimeMillis()) + Long.toHexString((long) (Math.random() * 0xFFFFFFFFL));
    }
}
