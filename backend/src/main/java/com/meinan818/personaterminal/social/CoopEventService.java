package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class CoopEventService {
    private final CoopBondMapper bonds;
    private final SocialNotificationMapper notifications;
    private final ObjectMapper json = new ObjectMapper();

    public Map<String, Object> broadcast(String me, Map<String, Object> input) {
        String recipient = text(input.get("recipientId"), 32, true);
        String eventId = text(input.get("eventId"), 100, true);
        String date = text(input.get("date"), 10, true);
        try { LocalDate.parse(date); } catch (Exception error) { throw badRequest(); }
        Object rawDelta = input.get("delta");
        if (!(rawDelta instanceof Number number) || !Double.isFinite(number.doubleValue()) || number.doubleValue() < 0 || number.doubleValue() > 5) throw badRequest();
        if (me.equals(recipient)) throw badRequest();
        CoopBond bond = bonds.selectOne(new QueryWrapper<CoopBond>()
                .eq("user_a", CoopBond.smallerOf(me, recipient)).eq("user_b", CoopBond.largerOf(me, recipient)).eq("status", "linked"));
        if (bond == null || !"linked".equals(bond.getStatus())
                || !Objects.equals(bond.getUserA(), CoopBond.smallerOf(me, recipient))
                || !Objects.equals(bond.getUserB(), CoopBond.largerOf(me, recipient))) {
            throw new SocialException(HttpStatus.NOT_FOUND, "有效羁绊不存在");
        }
        Map<String, Object> payload = new HashMap<>();
        payload.put("kind", "coop_event"); payload.put("event_id", eventId); payload.put("from_id", me);
        payload.put("date", date); payload.put("event_type", "conversation"); payload.put("delta", number.doubleValue());
        payload.put("narrative", text(input.get("narrative"), 400, false));
        payload.put("advice", text(input.get("advice"), 200, false));
        payload.put("user_input", text(input.get("userInput"), 200, false));
        String id = eventNotificationId(me, eventId);
        SocialNotification existing = notifications.selectById(id);
        if (existing != null) return existingResult(existing, me, recipient, eventId);
        SocialNotification notification = new SocialNotification();
        notification.setId(id); notification.setReceiver(recipient); notification.setType("event_logged"); notification.setReadFlag(0);
        notification.setCreated(Instant.now().toString()); notification.setUpdated(notification.getCreated());
        try { notification.setPayload(json.writeValueAsString(payload)); }
        catch (Exception error) { throw badRequest(); }
        try { if (notifications.insert(notification) != 1) throw new IllegalStateException("互动通知保存失败，请重试"); }
        catch (DuplicateKeyException conflict) {
            SocialNotification winner = notifications.selectById(id);
            if (winner == null) throw conflict;
            return existingResult(winner, me, recipient, eventId);
        }
        return Map.of("id", id, "created", true);
    }

    private Map<String, Object> existingResult(SocialNotification notification, String me, String recipient, String eventId) {
        try {
            var payload = json.readTree(notification.getPayload());
            if (!recipient.equals(notification.getReceiver()) || !"event_logged".equals(notification.getType())
                    || !me.equals(payload.path("from_id").asText()) || !eventId.equals(payload.path("event_id").asText())) {
                throw new SocialException(HttpStatus.CONFLICT, "事件标识冲突");
            }
            return Map.of("id", notification.getId(), "created", false);
        } catch (SocialException error) { throw error; }
        catch (Exception error) { throw new SocialException(HttpStatus.CONFLICT, "事件标识冲突"); }
    }

    private static String eventNotificationId(String me, String eventId) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest((me + ":" + eventId).getBytes(StandardCharsets.UTF_8))).substring(0, 32); }
        catch (Exception error) { throw new IllegalStateException(error); }
    }
    private static String text(Object value, int max, boolean required) {
        if (value == null && !required) return "";
        if (!(value instanceof String text) || (required && text.isBlank())) throw badRequest();
        if (required && text.length() > max) throw badRequest();
        return text.length() > max ? text.substring(0, text.offsetByCodePoints(0, Math.min(max, text.codePointCount(0, text.length())))) : text;
    }
    private static SocialException badRequest() { return new SocialException(HttpStatus.BAD_REQUEST, "互动事件参数不合法"); }
}
