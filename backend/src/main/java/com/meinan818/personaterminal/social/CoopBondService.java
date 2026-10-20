package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.meinan818.personaterminal.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
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
 * 同伴羁绊服务（社交迁移 W3 第二波）。
 *
 * <p>契约逐字对齐前端 {@code src/services/coopBonds.ts} 的 PB 实现：
 *  · 一对用户唯一一条 bond（user_a/user_b 字典序归一化 + 唯一键）
 *  · 状态机 pending → linked | rejected | severed | expired
 *  · 提议 TTL 14 天、拒绝冷却 3 天、解除冷却 7 天
 *  · 「我是 A 还是 B」决定写哪一侧的对称字段
 *  · 越权（不涉及自己）→ 404，不泄露存在性
 *
 * <p>通知副作用由本服务在服务端写（{@code coop_proposal/accepted/rejected/severed}），
 * payload 键为 {@code coop_bond_id}（前端 NotificationsPanel 读的就是这个键）。
 */
@Service
@RequiredArgsConstructor
public class CoopBondService {

    static final int PROPOSAL_TTL_DAYS = 14;
    static final int REJECT_COOLDOWN_DAYS = 3;
    static final int SEVER_COOLDOWN_DAYS = 7;

    private final CoopBondMapper coopBondMapper;
    private final SocialNotificationMapper notificationMapper;
    private final SocialUserService socialUserService;
    private final ObjectMapper json = new ObjectMapper();

    // ── 读 ────────────────────────────────────────────────

    /** 与我相关的全部 bond（倒序 updated）；顺带把过期的 pending 置 expired。 */
    public List<Map<String, Object>> listFor(String me) {
        List<CoopBond> rows = coopBondMapper.selectList(new QueryWrapper<CoopBond>()
                .and(w -> w.eq("user_a", me).or().eq("user_b", me))
                .orderByDesc("updated"));
        List<Map<String, Object>> out = new ArrayList<>(rows.size());
        for (CoopBond b : rows) {
            if (isExpired(b)) { markExpired(b); continue; }   // 过期的不返回（对齐前端 expireOutdatedCoopPending 语义）
            out.add(toView(b, me));
        }
        return out;
    }

    // ── 写 ────────────────────────────────────────────────

    /**
     * 发起提议。
     * 已 linked / 已有 pending → 400；拒绝/解除冷却未过 → 400；否则复用或新建。
     */
    public Map<String, Object> propose(String me, Map<String, Object> in) {
        String target = str(in.get("targetUserId"));
        if (target == null || target.isBlank()) throw new SocialException(HttpStatus.BAD_REQUEST, "对方信息缺失");
        User targetUser = socialUserService.requireUser(target);   // 不存在 → 401
        String targetId = targetUser.getId();
        if (targetId.equals(me)) throw new SocialException(HttpStatus.BAD_REQUEST, "不能对自己发起 COOP");

        String userA = CoopBond.smallerOf(me, targetId);
        String userB = CoopBond.largerOf(me, targetId);
        boolean iAmA = me.equals(userA);
        Instant now = Instant.now();

        Integer intimacy = clampIntimacy(asInt(in.get("intimacyLevel")));
        String arcanaId = str(in.get("arcanaId"));
        String orientation = str(in.get("orientation"));
        String skillAttr = str(in.get("skillAttribute"));
        String message = truncate(str(in.get("message")), 200);

        CoopBond existing = findByPair(userA, userB);
        if (existing != null) {
            String status = existing.getStatus();
            if ("linked".equals(status)) throw new SocialException(HttpStatus.BAD_REQUEST, "你们已经建立了 COOP");
            if ("pending".equals(status)) throw new SocialException(HttpStatus.BAD_REQUEST, "已发出提议，等对方响应吧");
            if ("rejected".equals(status) && after(existing.getReRequestAfter(), now)) {
                throw new SocialException(HttpStatus.BAD_REQUEST,
                        "对方拒绝过这次提议，请在 " + daysLeft(existing.getReRequestAfter(), now) + " 天后再试");
            }
            if ("severed".equals(status) && after(existing.getReLinkAfter(), now)) {
                throw new SocialException(HttpStatus.BAD_REQUEST,
                        "此前曾解除 COOP，请在 " + daysLeft(existing.getReLinkAfter(), now) + " 天后再试");
            }
            // 复用行回 pending：写我方字段、清对面旧提议
            applyMySide(existing, iAmA, arcanaId, orientation, intimacy, skillAttr, message);
            clearOtherSide(existing, iAmA);
            existing.setStatus("pending");
            existing.setInitiator(me);
            existing.setExpiresAt(iso(now.plus(Duration.ofDays(PROPOSAL_TTL_DAYS))));
            existing.setRespondedAt(null);
            existing.setReRequestAfter(null);
            existing.setReLinkAfter(null);
            existing.setUpdated(iso(now));
            coopBondMapper.updateById(existing);
            notify(me, targetId, "coop_proposal", existing.getId(), message);
            return toView(existing, me);
        }

        CoopBond b = new CoopBond();
        b.setId(newId());
        b.setUserA(userA);
        b.setUserB(userB);
        b.setInitiator(me);
        b.setStatus("pending");
        applyMySide(b, iAmA, arcanaId, orientation, intimacy, skillAttr, message);
        b.setExpiresAt(iso(now.plus(Duration.ofDays(PROPOSAL_TTL_DAYS))));
        b.setCreated(iso(now));
        b.setUpdated(iso(now));
        try {
            coopBondMapper.insert(b);
        } catch (DuplicateKeyException race) {
            // 并发提议由唯一键收口。后来者返回已经落库的 pending 提议，
            // 不重复写通知，也不能把唯一键异常暴露成会话失效。
            CoopBond raced = findByPair(userA, userB);
            if (raced != null
                    && "pending".equals(raced.getStatus())
                    && me.equals(raced.getInitiator())) {
                return toView(raced, me);
            }
            throw race;
        }
        notify(me, targetId, "coop_proposal", b.getId(), message);
        return toView(b, me);
    }

    /** 接受提议：非 pending → 400；发起方不能自己接受 → 403。 */
    public Map<String, Object> accept(String me, String id, Map<String, Object> in) {
        CoopBond b = requireInvolving(me, id);
        requirePending(b, "此提议已失效或已被响应");
        requireReceiver(b, me);
        boolean iAmA = b.isA(me);
        Instant now = Instant.now();
        applyMySide(b, iAmA,
                str(in.get("arcanaId")), str(in.get("orientation")),
                clampIntimacy(asInt(in.get("intimacyLevel"))), str(in.get("skillAttribute")),
                truncate(str(in.get("message")), 200));
        b.setStatus("linked");
        b.setRespondedAt(iso(now));
        b.setExpiresAt(null);
        b.setUpdated(iso(now));
        coopBondMapper.updateById(b);

        String initiator = b.getInitiator();
        if (initiator != null && !initiator.equals(me)) notify(me, initiator, "coop_accepted", b.getId(), null);
        return toView(b, me);
    }

    /** 拒绝提议（3 天冷却）：非 pending → 400；发起方不能自己拒绝 → 403。 */
    public Map<String, Object> reject(String me, String id) {
        CoopBond b = requireInvolving(me, id);
        requirePending(b, "此提议已响应或失效，无法再拒绝");
        requireReceiver(b, me);
        Instant now = Instant.now();
        b.setStatus("rejected");
        b.setRespondedAt(iso(now));
        b.setReRequestAfter(iso(now.plus(Duration.ofDays(REJECT_COOLDOWN_DAYS))));
        b.setExpiresAt(null);
        b.setUpdated(iso(now));
        coopBondMapper.updateById(b);

        String initiator = b.getInitiator();
        if (initiator != null && !initiator.equals(me)) notify(me, initiator, "coop_rejected", b.getId(), null);
        return toView(b, me);
    }

    /** 解除已建立的 COOP（7 天冷却）。任一方可解除。 */
    public Map<String, Object> sever(String me, String id) {
        CoopBond b = requireInvolving(me, id);
        Instant now = Instant.now();
        b.setStatus("severed");
        b.setRespondedAt(iso(now));
        b.setReLinkAfter(iso(now.plus(Duration.ofDays(SEVER_COOLDOWN_DAYS))));
        b.setUpdated(iso(now));
        coopBondMapper.updateById(b);

        String other = b.otherOf(me);
        if (other != null && !other.equals(me)) notify(me, other, "coop_severed", b.getId(), null);
        return toView(b, me);
    }

    /** 设置我这一侧的「逆流」开关（写 decay_a 或 decay_b）。任一方可设自己那侧。 */
    public Map<String, Object> setDecay(String me, String id, boolean enabled) {
        CoopBond b = requireInvolving(me, id);
        if (b.isA(me)) b.setDecayA(enabled ? 1 : 0); else b.setDecayB(enabled ? 1 : 0);
        b.setUpdated(iso(Instant.now()));
        coopBondMapper.updateById(b);
        return toView(b, me);
    }

    // ── 内部 ─────────────────────────────────────────────

    private CoopBond findByPair(String userA, String userB) {
        return coopBondMapper.selectOne(new QueryWrapper<CoopBond>()
                .eq("user_a", userA).eq("user_b", userB));
    }

    private CoopBond requireInvolving(String me, String id) {
        CoopBond b = coopBondMapper.selectById(id);
        if (b == null || !b.involves(me)) {
            throw new SocialException(HttpStatus.NOT_FOUND, "同伴羁绊不存在");
        }
        return b;
    }

    private void requirePending(CoopBond b, String message) {
        if (!"pending".equals(b.getStatus())) throw new SocialException(HttpStatus.BAD_REQUEST, message);
    }

    /** 只有「非发起方」能接受/拒绝自己的提议（对齐 FriendService 的发起方禁操作）。 */
    private void requireReceiver(CoopBond b, String me) {
        if (me.equals(b.getInitiator())) {
            throw new SocialException(HttpStatus.FORBIDDEN, "发起方不能处理自己的提议");
        }
    }

    private boolean isExpired(CoopBond b) {
        return "pending".equals(b.getStatus()) && b.getExpiresAt() != null
                && Instant.parse(b.getExpiresAt()).isBefore(Instant.now());
    }

    private void markExpired(CoopBond b) {
        b.setStatus("expired");
        b.setExpiresAt(null);
        b.setUpdated(iso(Instant.now()));
        coopBondMapper.updateById(b);
    }

    /** 把「我」这一侧的字段写进 bond（按 iAmA 决定 a/b 侧）。 */
    private void applyMySide(CoopBond b, boolean iAmA, String arcanaId, String orientation,
                             Integer intimacy, String skillAttr, String message) {
        if (iAmA) {
            b.setArcanaAId(arcanaId);
            b.setArcanaAOrientation(orientation);
            b.setIntimacyALevel(intimacy);
            b.setSkillAttributeA(skillAttr);
            b.setMessageA(message);
        } else {
            b.setArcanaBId(arcanaId);
            b.setArcanaBOrientation(orientation);
            b.setIntimacyBLevel(intimacy);
            b.setSkillAttributeB(skillAttr);
            b.setMessageB(message);
        }
    }

    /** 重新提议时清掉对面那一侧的旧提议（前端语义：假设重新发起是干净的）。 */
    private void clearOtherSide(CoopBond b, boolean iAmA) {
        if (iAmA) {
            b.setArcanaBId("");
            b.setArcanaBOrientation("");
            b.setMessageB("");
            b.setIntimacyBLevel(null);
            b.setSkillAttributeB("");
        } else {
            b.setArcanaAId("");
            b.setArcanaAOrientation("");
            b.setMessageA("");
            b.setIntimacyALevel(null);
            b.setSkillAttributeA("");
        }
    }

    /**
     * 给对方写一条 COOP 类通知。payload 键 = {@code coop_bond_id}（前端读的正是它），
     * 外加 {@code from_id}（NotificationService.toView 靠它解析 fromProfile）。
     * 失败不阻断主流程（对齐 PrayerService.notifyPrayerReceived）。
     *
     * @param fromId 本次操作者（= 通知的发件人）
     */
    private void notify(String fromId, String receiver, String type, String bondId, String message) {
        try {
            SocialNotification n = new SocialNotification();
            n.setId(newId());
            n.setReceiver(receiver);
            n.setType(type);
            Map<String, Object> payload = new HashMap<>();
            payload.put("coop_bond_id", bondId);
            payload.put("from_id", fromId);
            try {
                User from = socialUserService.resolve(fromId);
                if (from != null) payload.put("from_name", from.getName());
            } catch (Exception ignore) { /* 缺名字不阻断 */ }
            if (message != null && !message.isBlank()) payload.put("message", message);
            n.setPayload(json.writeValueAsString(payload));
            n.setReadFlag(0);
            n.setCreated(iso(Instant.now()));
            n.setUpdated(iso(Instant.now()));
            notificationMapper.insert(n);
        } catch (Exception e) {
            // 通知失败不阻断主流程（bond 已落库）
        }
    }

    /** bond → 前端 CoopBond 形状（camelCase；otherProfile 内联，email 永不出现）。 */
    private Map<String, Object> toView(CoopBond b, String viewer) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", b.getId());
        m.put("userAId", b.getUserA());
        m.put("userBId", b.getUserB());
        m.put("initiatorId", b.getInitiator());
        m.put("status", b.getStatus());
        m.put("arcanaAId", b.getArcanaAId());
        m.put("arcanaAOrientation", b.getArcanaAOrientation());
        m.put("arcanaBId", b.getArcanaBId());
        m.put("arcanaBOrientation", b.getArcanaBOrientation());
        m.put("intimacyALevel", b.getIntimacyALevel());
        m.put("intimacyBLevel", b.getIntimacyBLevel());
        m.put("skillAttributeA", b.getSkillAttributeA());
        m.put("skillAttributeB", b.getSkillAttributeB());
        m.put("decayA", toBool(b.getDecayA()));
        m.put("decayB", toBool(b.getDecayB()));
        m.put("messageA", b.getMessageA());
        m.put("messageB", b.getMessageB());
        m.put("expiresAt", b.getExpiresAt());
        m.put("respondedAt", b.getRespondedAt());
        m.put("reRequestAfter", b.getReRequestAfter());
        m.put("reLinkAfter", b.getReLinkAfter());
        m.put("created", b.getCreated());
        m.put("updated", b.getUpdated());
        m.put("updatedAt", b.getUpdated());
        // 对方公开档案（与前端 mapBond 的 otherProfile 对应）
        String otherId = b.otherOf(viewer);
        try {
            User other = socialUserService.resolve(otherId);
            m.put("otherProfile", other == null ? null : socialUserService.publicProfile(other));
        } catch (Exception e) {
            m.put("otherProfile", null);
        }
        return m;
    }

    /** null 保持 null（未选择），0/1 → false/true。 */
    private static Boolean toBool(Integer v) { return v == null ? null : v != 0; }

    // ── 小工具 ───────────────────────────────────────────

    private Integer clampIntimacy(Integer v) {
        int n = v == null ? 1 : v;
        return Math.max(1, Math.min(10, n));
    }

    private static boolean after(String iso, Instant now) {
        if (iso == null || iso.isBlank()) return false;
        try { return Instant.parse(iso).isAfter(now); } catch (Exception e) { return false; }
    }

    private static long daysLeft(String iso, Instant now) {
        try { return (long) Math.ceil((Instant.parse(iso).toEpochMilli() - now.toEpochMilli()) / 86400000.0); }
        catch (Exception e) { return 0; }
    }

    /** 从请求体取整数字段（JSON number 可能被反序列化为 Integer 或 Double）。 */
    private static Integer asInt(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.intValue();
        try { return Integer.valueOf(String.valueOf(v)); } catch (Exception e) { return null; }
    }

    private static String str(Object v) { return v == null ? null : String.valueOf(v); }

    private static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() > max ? s.substring(0, max) : s;
    }

    private static String iso(Instant i) { return DateTimeFormatter.ISO_INSTANT.format(i); }

    /** 雪花风格 id：时间戳 + 随机尾（32 位内，与 Friendship/Prayer 同形态）。 */
    private static String newId() {
        return Long.toHexString(System.currentTimeMillis()) + Long.toHexString((long) (Math.random() * 0xFFFFFFFFL));
    }
}
