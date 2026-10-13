package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.meinan818.personaterminal.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 一起进步约定服务（社交迁移 W3 第三波）。
 *
 * <p>契约逐字对齐前端 {@code src/services/coopPacts.ts}：
 *  · 一个用户可有多条历史约定（无唯一键）
 *  · 状态机 pending → active | declined | cancelled | expired；active → finished | cancelled
 *  · 双方各只写自己那一栏（done_* / nudge_*）—— 打卡只碰对应列，不清对面
 *  · 越权（不涉及自己）→ 404，不泄露存在性
 *
 * <p>通知副作用：type = {@code event_logged} + {@code payload.kind}
 * （pact_invite / pact_accepted / pact_declined / pact_nudge / pact_ended），
 * payload 带 {@code pact_id} / {@code from_id}，与前端 NotificationsPanel 读取的键一致。
 */
@Service
@RequiredArgsConstructor
public class CoopPactService {

    /** 邀请多少天没回应算过期 */
    static final int INVITE_TTL_DAYS = 3;
    /** 任务名长度上限 */
    static final int TITLE_MAX = 30;
    /** 附言长度上限 */
    static final int MESSAGE_MAX = 120;

    private final CoopPactMapper coopPactMapper;
    private final SocialNotificationMapper notificationMapper;
    private final SocialUserService socialUserService;
    private final ObjectMapper json = new ObjectMapper();

    // ── 读 ────────────────────────────────────────────────

    /**
     * 与我相关、还有意义的约定：pending / active 全部 + 结束了的留 45 天。
     * 顺带把超过 3 天未回应的 pending 置 expired（对齐前端 pactSync 的兜底）。
     */
    public List<Map<String, Object>> listFor(String me) {
        String since = iso(Instant.now().minus(Duration.ofDays(45)));
        List<CoopPact> rows = coopPactMapper.selectList(new QueryWrapper<CoopPact>()
                .and(w -> w.eq("from_user", me).or().eq("to_user", me))
                .and(w -> w.eq("status", "pending").or().eq("status", "active").or().ge("updated", since))
                .orderByDesc("updated"));
        List<Map<String, Object>> out = new ArrayList<>(rows.size());
        for (CoopPact p : rows) {
            if (isInviteExpired(p)) { p = expire(p); }
            out.add(toView(p, me));
        }
        return out;
    }

    // ── 写 ────────────────────────────────────────────────

    /** 发起约定：写一条 pending，给对方发 pact_invite。 */
    public Map<String, Object> create(String me, Map<String, Object> in) {
        String to = str(in.get("toId"));
        if (to == null || to.isBlank()) throw new SocialException(HttpStatus.BAD_REQUEST, "对方信息缺失");
        User target = socialUserService.requireUser(to);
        String toId = target.getId();
        if (toId.equals(me)) throw new SocialException(HttpStatus.BAD_REQUEST, "对方信息缺失");

        String title = truncate(safeTrim(in.get("title")), TITLE_MAX);
        if (title.isBlank()) throw new SocialException(HttpStatus.BAD_REQUEST, "写一下要一起做的事");

        String kind = "once".equals(str(in.get("kind"))) ? "once" : "daily";
        String mode = "different".equals(str(in.get("mode"))) ? "different" : "same";
        String deadline = str(in.get("deadline"));
        String today = str(in.get("today"));
        if ("once".equals(kind)) {
            if (deadline == null || !deadline.matches("\\d{4}-\\d{2}-\\d{2}")
                    || (today != null && deadline.compareTo(today) < 0)) {
                throw new SocialException(HttpStatus.BAD_REQUEST, "截止日要选今天或以后");
            }
        }
        Integer daysIn = asInt(in.get("days"));
        int days = "daily".equals(kind) && isAllowedDays(daysIn) ? daysIn : 0;

        CoopPact p = new CoopPact();
        p.setId(newId());
        p.setFromUser(me);
        p.setToUser(toId);
        p.setKind(kind);
        p.setMode(mode);
        p.setTitleFrom(title);
        p.setDays(days);
        p.setDeadline("once".equals(kind) ? deadline : "");
        p.setStatus("pending");
        p.setDoneFrom("[]");
        p.setDoneTo("[]");
        p.setMessage(truncate(safeTrim(in.get("message")), MESSAGE_MAX));
        p.setCreated(iso(Instant.now()));
        p.setUpdated(iso(Instant.now()));
        coopPactMapper.insert(p);

        Map<String, Object> extra = new HashMap<>();
        extra.put("title", title);
        extra.put("pact_kind", kind);
        extra.put("mode", mode);
        extra.put("days", days);
        extra.put("deadline", deadline == null ? "" : deadline);
        if (p.getMessage() != null && !p.getMessage().isBlank()) extra.put("message", p.getMessage());
        notify(me, toId, "pact_invite", p.getId(), extra);
        return toView(p, me);
    }

    /** 回应邀请：接受（不同目标时填自己的任务）/ 婉拒。 */
    public Map<String, Object> respond(String me, String id, Map<String, Object> in) {
        CoopPact p = requireInvolving(me, id);
        if (!p.isTo(me)) throw new SocialException(HttpStatus.BAD_REQUEST, "这份邀请不是发给你的");
        if (!"pending".equals(p.getStatus())) throw new SocialException(HttpStatus.BAD_REQUEST, "这份邀请已经不能回应了");

        boolean accept = asBool(in.get("accept"));
        if (accept) {
            String titleTo = "";
            if ("different".equals(p.getMode())) {
                titleTo = truncate(safeTrim(in.get("titleTo")), TITLE_MAX);
                if (titleTo.isBlank()) throw new SocialException(HttpStatus.BAD_REQUEST, "写一下你这边要做的事");
            }
            p.setStatus("active");
            p.setStartDay(str(in.get("today")));
            if (!titleTo.isBlank()) p.setTitleTo(titleTo);
        } else {
            p.setStatus("declined");
        }
        p.setUpdated(iso(Instant.now()));
        coopPactMapper.updateById(p);

        Map<String, Object> extra = new HashMap<>();
        extra.put("title", p.getTitleFrom());
        notify(me, p.getFromUser(), accept ? "pact_accepted" : "pact_declined", id, extra);
        return toView(p, me);
    }

    /** 打卡 / 撤回打卡：只改自己那一栏（幂等）。 */
    public Map<String, Object> setDone(String me, String id, Map<String, Object> in) {
        CoopPact p = requireInvolving(me, id);
        String day = str(in.get("day"));
        if (day == null || !day.matches("\\d{4}-\\d{2}-\\d{2}")) {
            throw new SocialException(HttpStatus.BAD_REQUEST, "缺少 day");
        }
        boolean done = asBool(in.get("done"));
        boolean iAmFrom = p.isFrom(me);
        List<String> mine = parseDays(iAmFrom ? p.getDoneFrom() : p.getDoneTo());
        boolean has = mine.contains(day);
        if (done == has) return toView(p, me);   // 幂等：状态相同直接返回

        List<String> next = new ArrayList<>(mine);
        if (done) next.add(day); else next.remove(day);
        next.sort(String::compareTo);

        // 关键：只更新自己那一栏；对面那栏原样不动（避并发覆盖）
        if (iAmFrom) p.setDoneFrom(writeDays(next));
        else p.setDoneTo(writeDays(next));
        p.setUpdated(iso(Instant.now()));
        coopPactMapper.updateById(p);
        return toView(p, me);
    }

    /** 催一下：记下今天催过，给对方发 pact_nudge。 */
    public Map<String, Object> nudge(String me, String id, Map<String, Object> in) {
        CoopPact p = requireInvolving(me, id);
        if (!"active".equals(p.getStatus())) throw new SocialException(HttpStatus.BAD_REQUEST, "约定已经结束了");
        String today = str(in.get("today"));
        boolean iAmFrom = p.isFrom(me);
        String prev = iAmFrom ? p.getNudgeFromDay() : p.getNudgeToDay();
        if (today != null && today.equals(prev)) throw new SocialException(HttpStatus.BAD_REQUEST, "今天已经催过了");

        if (iAmFrom) p.setNudgeFromDay(today); else p.setNudgeToDay(today);
        p.setUpdated(iso(Instant.now()));
        coopPactMapper.updateById(p);

        Map<String, Object> extra = new HashMap<>();
        extra.put("day", today == null ? "" : today);
        extra.put("title", theirTitle(p, me));
        notify(me, p.otherOf(me), "pact_nudge", id, extra);
        return toView(p, me);
    }

    /** 结束约定（撤回邀请也走这里）；已非 live 则原样返回（幂等）。 */
    public Map<String, Object> end(String me, String id) {
        CoopPact p = requireInvolving(me, id);
        if (!isLive(p)) return toView(p, me);
        p.setStatus("cancelled");
        p.setEndedBy(me);
        p.setUpdated(iso(Instant.now()));
        coopPactMapper.updateById(p);

        Map<String, Object> extra = new HashMap<>();
        extra.put("title", myTitle(p, me));
        notify(me, p.otherOf(me), "pact_ended", id, extra);
        return toView(p, me);
    }

    /** 到期收尾（达成 / 过期）：两边谁先发现谁写，重复写同一个值无害。 */
    public Map<String, Object> close(String me, String id, Map<String, Object> in) {
        CoopPact p = requireInvolving(me, id);
        if (!isLive(p)) return toView(p, me);
        String status = "expired".equals(str(in.get("status"))) ? "expired" : "finished";
        p.setStatus(status);
        p.setUpdated(iso(Instant.now()));
        coopPactMapper.updateById(p);
        return toView(p, me);
    }

    // ── 内部 ─────────────────────────────────────────────

    private CoopPact requireInvolving(String me, String id) {
        CoopPact p = coopPactMapper.selectById(id);
        if (p == null || !p.involves(me)) {
            throw new SocialException(HttpStatus.NOT_FOUND, "约定不存在");
        }
        return p;
    }

    private static boolean isLive(CoopPact p) {
        return "pending".equals(p.getStatus()) || "active".equals(p.getStatus());
    }

    private boolean isInviteExpired(CoopPact p) {
        if (!"pending".equals(p.getStatus())) return false;
        try {
            return Instant.parse(p.getCreated()).plus(Duration.ofDays(INVITE_TTL_DAYS)).isBefore(Instant.now());
        } catch (Exception e) { return false; }
    }

    private CoopPact expire(CoopPact p) {
        p.setStatus("expired");
        p.setUpdated(iso(Instant.now()));
        coopPactMapper.updateById(p);
        return p;
    }

    /** 我这一侧的任务名（same 模式或我是发起人 → titleFrom）。 */
    private static String myTitle(CoopPact p, String me) {
        if ("same".equals(p.getMode()) || p.isFrom(me)) return p.getTitleFrom();
        return (p.getTitleTo() == null || p.getTitleTo().isBlank()) ? p.getTitleFrom() : p.getTitleTo();
    }

    /** 对方那一侧的任务名。 */
    private static String theirTitle(CoopPact p, String me) {
        if ("same".equals(p.getMode()) || p.isTo(me)) return p.getTitleFrom();
        return (p.getTitleTo() == null || p.getTitleTo().isBlank()) ? p.getTitleFrom() : p.getTitleTo();
    }

    /**
     * 给对方写一条「一起进步」通知。type = event_logged，用 payload.kind 区分种类。
     * payload 带 pact_id（前端 NotificationsPanel 读它）与 from_id（解析 fromProfile）。
     * 失败不阻断主流程（对齐 PrayerService.notifyPrayerReceived）。
     */
    private void notify(String fromId, String receiver, String kind, String pactId, Map<String, Object> extra) {
        try {
            SocialNotification n = new SocialNotification();
            n.setId(newId());
            n.setReceiver(receiver);
            n.setType("event_logged");
            Map<String, Object> payload = new HashMap<>();
            payload.put("kind", kind);
            payload.put("pact_id", pactId);
            payload.put("from_id", fromId);
            if (extra != null) payload.putAll(extra);
            try {
                User from = socialUserService.resolve(fromId);
                if (from != null) payload.put("from_name", from.getName());
            } catch (Exception ignore) { /* 缺名字不阻断 */ }
            n.setPayload(json.writeValueAsString(payload));
            n.setReadFlag(0);
            n.setCreated(iso(Instant.now()));
            n.setUpdated(iso(Instant.now()));
            notificationMapper.insert(n);
        } catch (Exception e) {
            // 通知失败不阻断主流程（约定已落库）
        }
    }

    /** CoopPact → 前端 CoopPact 形状（camelCase；done 数组还原；otherProfile 内联）。 */
    private Map<String, Object> toView(CoopPact p, String viewer) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", p.getId());
        m.put("fromId", p.getFromUser());
        m.put("toId", p.getToUser());
        m.put("kind", p.getKind());
        m.put("mode", p.getMode());
        m.put("titleFrom", p.getTitleFrom());
        m.put("titleTo", p.getTitleTo());
        m.put("days", p.getDays());
        m.put("deadline", p.getDeadline());
        m.put("startDay", p.getStartDay());
        m.put("status", p.getStatus());
        m.put("doneFrom", parseDays(p.getDoneFrom()));
        m.put("doneTo", parseDays(p.getDoneTo()));
        m.put("nudgeFromDay", p.getNudgeFromDay());
        m.put("nudgeToDay", p.getNudgeToDay());
        m.put("message", p.getMessage());
        m.put("endedBy", p.getEndedBy());
        m.put("created", p.getCreated());
        m.put("updated", p.getUpdated());
        m.put("updatedAt", p.getUpdated());
        String otherId = p.otherOf(viewer);
        try {
            User other = socialUserService.resolve(otherId);
            m.put("otherProfile", other == null ? null : socialUserService.publicProfile(other));
        } catch (Exception e) {
            m.put("otherProfile", null);
        }
        return m;
    }

    // ── 小工具 ───────────────────────────────────────────

    /** 读 JSON 数组为已排序去重的日期列表；坏数据当空。 */
    @SuppressWarnings("unchecked")
    private List<String> parseDays(String raw) {
        List<String> out = new ArrayList<>();
        if (raw == null || raw.isBlank()) return out;
        try {
            List<String> arr = json.readValue(raw, List.class);
            for (String s : arr) if (s != null && s.matches("\\d{4}-\\d{2}-\\d{2}") && !out.contains(s)) out.add(s);
        } catch (Exception ignore) { /* 坏数据当空 */ }
        out.sort(String::compareTo);
        return out;
    }

    private String writeDays(List<String> days) {
        try { return json.writeValueAsString(days); } catch (Exception e) { return "[]"; }
    }

    private static boolean isAllowedDays(Integer d) {
        return d != null && (d == 7 || d == 14 || d == 30);
    }

    private static Integer asInt(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.intValue();
        try { return Integer.valueOf(String.valueOf(v)); } catch (Exception e) { return null; }
    }

    private static boolean asBool(Object v) {
        if (v instanceof Boolean b) return b;
        return "true".equalsIgnoreCase(String.valueOf(v));
    }

    private static String str(Object v) { return v == null ? null : String.valueOf(v); }

    /** 取字符串并 trim；null → 空串（避免 NPE）。 */
    private static String safeTrim(Object v) { return v == null ? "" : String.valueOf(v).trim(); }

    private static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() > max ? s.substring(0, max) : s;
    }

    private static String iso(Instant i) { return DateTimeFormatter.ISO_INSTANT.format(i); }

    /** 雪花风格 id：时间戳 + 随机尾（32 位内，与 Friendship/Prayer/CoopBond 同形态）。 */
    private static String newId() {
        return Long.toHexString(System.currentTimeMillis()) + Long.toHexString((long) (Math.random() * 0xFFFFFFFFL));
    }
}
