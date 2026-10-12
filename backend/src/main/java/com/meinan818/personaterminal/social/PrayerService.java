package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.meinan818.personaterminal.user.User;
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
 * 祈愿服务（社交迁移 W3 第一波）。
 *
 * <p>契约对齐前端 {@code prayers.ts} 的 {@code Prayer} 类型：
 * {@code id / fromId / toId / day / createdAt / fromProfile / toProfile}。
 *
 * <p>语义：
 *  · 一天一对用户只能有一条祈愿（唯一键 from_user,to_user,day）——重复 → 409。
 *  · 不能对自己祈愿 → 400。
 *  · 当天列表返回「与我相关」的（from=me 或 to=me）双向记录。
 *  · 发祈愿时给对方写一条 {@code prayer_received} 通知（对齐前端原 PB 行为）。
 *  · 祈愿不可改、不可撤回（与 PB 一致，无 update/delete 接口）。
 */
@Service
@RequiredArgsConstructor
public class PrayerService {

    private final PrayerMapper prayerMapper;
    private final SocialNotificationMapper notificationMapper;
    private final SocialUserService socialUserService;
    private final ObjectMapper json = new ObjectMapper();

    /** 今日与「我」相关的祈愿（双向，倒序）。day 由前端按本地 04:00 日界算好传入。 */
    public List<Map<String, Object>> listToday(String me, String day, String meUserId) {
        if (day == null || day.isBlank()) throw new SocialException(HttpStatus.BAD_REQUEST, "缺少 day");
        List<Prayer> rows = prayerMapper.selectList(new QueryWrapper<Prayer>()
                .eq("day", day)
                .and(w -> w.eq("from_user", me).or().eq("to_user", me))
                .orderByDesc("created"));
        List<Map<String, Object>> out = new ArrayList<>(rows.size());
        for (Prayer p : rows) out.add(toView(p));
        return out;
    }

    /** 发送祈愿：from=me，to=targetId。同日同对重复 → 409；对自己 → 400。 */
    public Map<String, Object> send(String me, String targetId, String day) {
        if (targetId == null || targetId.isBlank()) throw new SocialException(HttpStatus.BAD_REQUEST, "缺少 to");
        if (day == null || day.isBlank()) throw new SocialException(HttpStatus.BAD_REQUEST, "缺少 day");
        if (me.equals(targetId)) throw new SocialException(HttpStatus.BAD_REQUEST, "不能对自己祈愿");
        User target = socialUserService.requireUser(targetId);   // 不存在 → 401

        Prayer p = new Prayer();
        p.setId(newId());
        p.setFromUser(me);
        p.setToUser(target.getId());
        p.setDay(day);
        p.setCreated(now());
        try {
            prayerMapper.insert(p);
        } catch (DuplicateKeyException e) {
            // 唯一键 (from_user,to_user,day) 命中——同日重复祈愿
            throw new SocialException(HttpStatus.CONFLICT, "今天已经为 Ta 祈愿过了");
        }

        notifyPrayerReceived(me, target.getId());
        return toView(p);
    }

    // ── 内部 ─────────────────────────────────────────────

    /** 给对方写一条 prayer_received 通知（失败不阻断主流程，与 FriendService.notify 同策略）。 */
    private void notifyPrayerReceived(String from, String to) {
        try {
            SocialNotification n = new SocialNotification();
            n.setId(newId());
            n.setReceiver(to);
            n.setType("prayer_received");
            Map<String, Object> payload = new HashMap<>();
            payload.put("from_id", from);
            try {
                User fu = socialUserService.resolve(from);
                if (fu != null) payload.put("from_name", fu.getName());
            } catch (Exception ignore) { /* 通知照写，缺名字不阻断 */ }
            n.setPayload(json.writeValueAsString(payload));
            n.setReadFlag(0);
            n.setCreated(now());
            n.setUpdated(now());
            notificationMapper.insert(n);
        } catch (Exception e) {
            // 通知失败不阻断祈愿本身（祈愿已落库）
        }
    }

    /** Prayer → 前端 Prayer 形状（外层 camelCase，与 prayers.ts 的 mapPrayer 对应）。 */
    private Map<String, Object> toView(Prayer p) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", p.getId());
        m.put("fromId", p.getFromUser());
        m.put("toId", p.getToUser());
        m.put("day", p.getDay());
        m.put("createdAt", p.getCreated());
        m.put("fromProfile", profileOf(p.getFromUser()));
        m.put("toProfile", profileOf(p.getToUser()));
        return m;
    }

    private Map<String, Object> profileOf(String userId) {
        try {
            User u = socialUserService.resolve(userId);
            return u == null ? null : socialUserService.publicProfile(u);
        } catch (Exception e) {
            return null;
        }
    }

    private static String now() { return DateTimeFormatter.ISO_INSTANT.format(Instant.now()); }
    private static String newId() {
        return Long.toHexString(System.currentTimeMillis()) + Long.toHexString((long) (Math.random() * 0xFFFFFFFFL));
    }
}
