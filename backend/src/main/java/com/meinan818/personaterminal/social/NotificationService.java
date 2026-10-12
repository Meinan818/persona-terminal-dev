package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.meinan818.personaterminal.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 通知中心读取服务（社交迁移 W2）。
 *
 * <p>职责：把 social_notifications 表里的行读给收件人（含发件人公开档案、payload 解析），
 * 以及标记已读 / 删除。**写入**仍由各业务域负责（FriendService.notify 等），本服务只读改。
 *
 * <p>契约对齐前端 {@code NotificationEntry}（types/index.ts）：
 *  · id / userId / type / fromId / fromProfile / payload / read / createdAt
 *  · payload 键为 **snake_case**（friendship_id / from_id …）——前端 NotificationsPanel
 *    按 snake_case 读（`n.payload?.friendship_id`）。历史上后端 notify() 写过 camelCase
 *    （friendshipId），已在此统一归一化，避免「接受好友申请」按钮拿不到 id。
 *  · fromProfile 复用 SocialUserService.publicProfile（email 永不出去）。
 */
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final SocialNotificationMapper notificationMapper;
    private final SocialUserService socialUserService;
    private final ObjectMapper json = new ObjectMapper();

    /** 我的通知：按时间倒序。viewer 只能看到 receiver = 自己的行。 */
    public List<Map<String, Object>> listFor(String me) {
        List<SocialNotification> rows = notificationMapper.selectList(
                new QueryWrapper<SocialNotification>()
                        .eq("receiver", me)
                        .orderByDesc("created"));
        List<Map<String, Object>> out = new ArrayList<>(rows.size());
        for (SocialNotification r : rows) out.add(toView(r));
        return out;
    }

    /** 标记一条为已读。不属于自己的行 → 404（不泄露存在性）。 */
    public Map<String, Object> markRead(String me, String id) {
        SocialNotification n = requireMine(me, id);
        n.setReadFlag(1);
        n.setUpdated(now());
        notificationMapper.updateById(n);
        return toView(n);
    }

    /** 删除一条。不属于自己的行 → 404。 */
    public void delete(String me, String id) {
        SocialNotification n = requireMine(me, id);
        notificationMapper.deleteById(n.getId());
    }

    // ── 内部 ─────────────────────────────────────────────

    private SocialNotification requireMine(String me, String id) {
        SocialNotification n = notificationMapper.selectById(id);
        if (n == null || !me.equals(n.getReceiver())) {
            throw new SocialException(HttpStatus.NOT_FOUND, "通知不存在");
        }
        return n;
    }

    /** 通知行 → 前端 NotificationEntry 形状（camelCase 外层，snake_case payload）。 */
    private Map<String, Object> toView(SocialNotification n) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", n.getId());
        m.put("userId", n.getReceiver());
        m.put("type", n.getType());
        m.put("read", n.getReadFlag() != null && n.getReadFlag() == 1);
        m.put("createdAt", n.getCreated());
        m.put("created", n.getCreated());
        Map<String, Object> payload = parsePayload(n.getPayload());
        // 兼容早期 camelCase 写入：归一化为前端约定的 snake_case
        normalizeLegacyKeys(payload);
        m.put("payload", payload);
        // 发件人：从 payload.fromId 解析（好友类通知都有）；查不到就不带（不阻断列表）
        Object fromId = payload.get("from_id");
        if (fromId != null) {
            m.put("fromId", String.valueOf(fromId));
            try {
                User from = socialUserService.resolve(String.valueOf(fromId));
                if (from != null) m.put("fromProfile", socialUserService.publicProfile(from));
            } catch (Exception ignore) {
                // 发件人已注销等：列表照常显示，仅缺头像/昵称
            }
        }
        return m;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parsePayload(String raw) {
        if (raw == null || raw.isBlank()) return new HashMap<>();
        try {
            return json.readValue(raw, Map.class);
        } catch (Exception e) {
            return new HashMap<>();
        }
    }

    /** 早期后端 notify() 写的是 friendshipId/fromId/fromName；统一成前端读的 snake_case。 */
    private void normalizeLegacyKeys(Map<String, Object> payload) {
        rename(payload, "friendshipId", "friendship_id");
        rename(payload, "fromId", "from_id");
        rename(payload, "fromName", "from_name");
    }

    private void rename(Map<String, Object> m, String from, String to) {
        if (m.containsKey(from) && !m.containsKey(to)) m.put(to, m.remove(from));
    }

    private static String now() { return DateTimeFormatter.ISO_INSTANT.format(Instant.now()); }
}
