package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.meinan818.personaterminal.user.User;
import com.meinan818.personaterminal.user.UserMapper;
import lombok.RequiredArgsConstructor;
import com.meinan818.personaterminal.social.SocialException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;


import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 好友领域服务：申请 / 接受 / 拒绝 / 删除 / 列表。
 *
 * 语义对齐前端 friends.ts 的 PB 实现：
 *  · 双人唯一（user_a/user_b 字典序 + 唯一键），重复申请幂等返回已有 pending
 *  · pending 7 天过期（PB expires_at 语义）
 *  · 接受/拒绝/删除写 social_notifications 通知对方
 *  · 全程 JWT 身份，A 永远动不了不属于他的关系行（越权=404，不泄露存在性）
 */
@Service
@RequiredArgsConstructor
public class FriendService {

    static final String STATUS_PENDING = "pending";
    static final String STATUS_ACCEPTED = "accepted";
    static final String STATUS_DECLINED = "declined";
    private static final Duration PENDING_TTL = Duration.ofDays(7);

    private final FriendshipMapper friendshipMapper;
    private final SocialNotificationMapper notificationMapper;
    private final SocialUserService socialUserService;
    private final ObjectMapper json = new ObjectMapper();

    /** 我的好友/申请列表（含 pending），对方公开档案内联（expand 对齐 PB 语义）。 */
    public List<Map<String, Object>> listFor(String me) {
        List<Friendship> rows = friendshipMapper.selectList(new QueryWrapper<Friendship>()
                .and(w -> w.eq("user_a", me).or().eq("user_b", me))
                .ne("status", STATUS_DECLINED)
                .orderByDesc("created"));
        List<Map<String, Object>> out = new ArrayList<>();
        for (Friendship f : rows) {
            if (isExpired(f)) { expired(f); continue; }
            out.add(toView(f, me));
        }
        return out;
    }

    /** 发申请：目标存在、非自己、无既有关系（幂等：已有 pending 且我是发起方 → 原样返回）。 */
    public Map<String, Object> request(String me, String targetId, String message) {
        if (me.equals(targetId)) {
            throw new SocialException(HttpStatus.BAD_REQUEST, "不能添加自己为好友");
        }
        User target = socialUserService.requireUser(targetId);
        Friendship existing = findBetween(me, targetId);
        if (existing != null) {
            if (STATUS_PENDING.equals(existing.getStatus()) && me.equals(existing.getInitiator())) {
                return toView(existing, me);   // 幂等：重复申请原样返回
            }
            if (STATUS_ACCEPTED.equals(existing.getStatus())) {
                throw new SocialException(HttpStatus.BAD_REQUEST, "你们已经是好友");
            }
            if (STATUS_PENDING.equals(existing.getStatus())) {
                throw new SocialException(HttpStatus.BAD_REQUEST, "对方已向你发起申请，请先处理");
            }
            // declined → 允许重新发起：复用行更新状态
            existing.setStatus(STATUS_PENDING);
            existing.setInitiator(me);
            existing.setMessage(message);
            existing.setExpiresAt(expiresAt());
            existing.setUpdated(now());
            friendshipMapper.updateById(existing);
            notify(targetId, "friend_request", existing, message);
            return toView(existing, me);
        }
        Friendship f = new Friendship();
        f.setId(newId());
        f.setUserA(Friendship.smallerOf(me, targetId));
        f.setUserB(Friendship.largerOf(me, targetId));
        f.setInitiator(me);
        f.setStatus(STATUS_PENDING);
        f.setMessage(message);
        f.setCreated(now());
        f.setUpdated(now());
        f.setExpiresAt(expiresAt());
        try {
            friendshipMapper.insert(f);
        } catch (DuplicateKeyException race) {
            // 双击/弱网重试可能同时越过上面的查询。唯一键保证只落一行；
            // 输掉竞争的请求按幂等结果返回，而不是让异常落入鉴权错误链。
            Friendship raced = findBetween(me, targetId);
            if (raced != null
                    && STATUS_PENDING.equals(raced.getStatus())
                    && me.equals(raced.getInitiator())) {
                return toView(raced, me);
            }
            throw race;
        }
        notify(targetId, "friend_request", f, message);
        return toView(f, me);
    }

    /** 接受（只有收件方能操作）。 */
    public Map<String, Object> accept(String me, String id) {
        Friendship f = requireInvolving(me, id);
        requirePendingReceiver(f, me);
        f.setStatus(STATUS_ACCEPTED);
        f.setUpdated(now());
        f.setExpiresAt(null);
        friendshipMapper.updateById(f);
        notify(f.otherOf(me), "friend_accepted", f, null);
        return toView(f, me);
    }

    /** 拒绝（只有收件方能操作；拒绝后行保留为 declined，可重新申请）。 */
    public Map<String, Object> decline(String me, String id) {
        Friendship f = requireInvolving(me, id);
        requirePendingReceiver(f, me);
        f.setStatus(STATUS_DECLINED);
        f.setUpdated(now());
        friendshipMapper.updateById(f);
        return toView(f, me);
    }

    /** 删除：任一方都可删已存在的关系（对齐 PB removeFriendship）。 */
    public void remove(String me, String id) {
        Friendship f = requireInvolving(me, id);
        friendshipMapper.deleteById(f.getId());
        notify(f.otherOf(me), "friend_removed", f, null);
    }

    // ── 内部 ─────────────────────────────────────────────

    private Friendship findBetween(String x, String y) {
        return friendshipMapper.selectOne(new QueryWrapper<Friendship>()
                .eq("user_a", Friendship.smallerOf(x, y))
                .eq("user_b", Friendship.largerOf(x, y)));
    }

    private Friendship requireInvolving(String me, String id) {
        Friendship f = friendshipMapper.selectById(id);
        if (f == null || !f.involves(me)) {
            throw new SocialException(HttpStatus.NOT_FOUND, "好友关系不存在");
        }
        return f;
    }

    private void requirePendingReceiver(Friendship f, String me) {
        if (!STATUS_PENDING.equals(f.getStatus())) {
            throw new SocialException(HttpStatus.BAD_REQUEST, "该申请不在待处理状态");
        }
        if (me.equals(f.getInitiator())) {
            throw new SocialException(HttpStatus.FORBIDDEN, "发起方不能处理自己的申请");
        }
        if (isExpired(f)) { expired(f); throw new SocialException(HttpStatus.BAD_REQUEST, "申请已过期"); }
    }

    private boolean isExpired(Friendship f) {
        return STATUS_PENDING.equals(f.getStatus()) && f.getExpiresAt() != null
                && Instant.parse(f.getExpiresAt()).isBefore(Instant.now());
    }

    private void expired(Friendship f) {
        f.setStatus(STATUS_DECLINED);
        f.setUpdated(now());
        friendshipMapper.updateById(f);
    }

    private void notify(String receiver, String type, Friendship f, String message) {
        try {
            SocialNotification n = new SocialNotification();
            n.setId(newId());
            n.setReceiver(receiver);
            n.setType(type);
            Map<String, Object> payload = new HashMap<>();
            payload.put("friendshipId", f.getId());
            payload.put("fromId", f.getInitiator().equals(receiver) ? f.otherOf(receiver) : f.getInitiator());
            User from = socialUserService.requireUser(payload.get("fromId").toString());
            payload.put("fromName", from.getName());
            if (message != null && !message.isBlank()) payload.put("message", message);
            n.setPayload(json.writeValueAsString(payload));
            n.setReadFlag(0);
            n.setCreated(now());
            n.setUpdated(now());
            notificationMapper.insert(n);
        } catch (Exception e) {
            // 通知失败不阻断主流程（好友关系已落库）；第二阶段通知中心补重试
        }
    }

    /** 视图：关系字段 + expand 对方公开档案（对齐前端 mapFriendship 的展开语义）。 */
    private Map<String, Object> toView(Friendship f, String viewer) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", f.getId());
        m.put("userAId", f.getUserA());
        m.put("userBId", f.getUserB());
        m.put("initiatorId", f.getInitiator());
        m.put("status", f.getStatus());
        m.put("message", f.getMessage());
        m.put("expiresAt", f.getExpiresAt());
        m.put("created", f.getCreated());
        m.put("updated", f.getUpdated());
        User other = socialUserService.requireUser(f.otherOf(viewer));
        m.put("expand", Map.of("other", socialUserService.publicProfile(other)));
        return m;
    }

    private static String now() { return DateTimeFormatter.ISO_INSTANT.format(Instant.now()); }
    private static String expiresAt() { return DateTimeFormatter.ISO_INSTANT.format(Instant.now().plus(PENDING_TTL)); }
    /** 雪花风格 id：时间戳 + 随机尾（32 位内，与现有 users.id 形态一致） */
    private static String newId() {
        return Long.toHexString(System.currentTimeMillis()) + Long.toHexString((long) (Math.random() * 0xFFFFFFFFL));
    }

    /** 供测试断言排序稳定性 */
    static Comparator<Friendship> byCreatedDesc() {
        return Comparator.comparing(Friendship::getCreated).reversed();
    }
}
