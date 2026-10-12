package com.meinan818.personaterminal.user;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * users.profile JSON 列（档案扩展字段）的读写辅助。
 *
 * <p>这些字段本是从 PocketBase 的 users 集合平铺列迁过来的（nickname / total_lv /
 * attribute_* / level_difficulty / status / goal …），前端 sync.ts 的 pushUserProfile
 * 与 pushProfilePresence 推的就是它们。后端此前只认 name/username/avatar，其余静默丢弃，
 * 导致「云端档案永远是空的」。用单个 JSON 列承载，避免为每个会演进的字段加列。
 *
 * <p>三个入口（AuthController 登录、MeController /api/me、SyncController /api/sync/profile）
 * 共用本类，保证「写入什么、读出什么」两侧形状一致。
 */
public final class UserProfileFields {

    private UserProfileFields() {}

    private static final ObjectMapper JSON = new ObjectMapper();

    /** 允许从客户端写入的扩展字段白名单（未知键忽略，防脏数据写进 profile） */
    public static final Set<String> EXTENSION_KEYS = Set.of(
            "nickname",
            "total_lv",
            "level_difficulty",
            "attribute_names",
            "attribute_levels",
            "attribute_level_titles",
            "attribute_points",
            "total_points",
            "unlocked_count",
            "status",
            "goal"
    );

    /** 解析存量 profile JSON；空/坏数据一律当空对象，不让一条脏行炸掉整个登录 */
    public static Map<String, Object> parse(String raw) {
        if (raw == null || raw.isBlank()) return new LinkedHashMap<>();
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> m = JSON.readValue(raw, Map.class);
            return m == null ? new LinkedHashMap<>() : new LinkedHashMap<>(m);
        } catch (Exception e) {
            return new LinkedHashMap<>();
        }
    }

    /**
     * 把 patch 里白名单内的键并入存量 profile。
     *
     * <p>语义：patch 里出现且值非 null → 覆盖；值为 null → 删除该键
     * （前端用 null 表达「清掉云端那份」，如 pushProfilePresence 里过期的 status）。
     * 键若根本不在 patch 里，则保持存量不动（对齐 PB 的字段级 update）。
     */
    public static String merge(String existingJson, Map<String, Object> patch) {
        Map<String, Object> merged = parse(existingJson);
        for (String key : EXTENSION_KEYS) {
            if (!patch.containsKey(key)) continue;
            Object v = patch.get(key);
            if (v == null) merged.remove(key);
            else merged.put(key, v);
        }
        return write(merged);
    }

    /** 序列化；空对象存成 "{}"（而非 null），读出侧无需特判 */
    public static String write(Map<String, Object> m) {
        try {
            return JSON.writeValueAsString(m == null ? new LinkedHashMap<>() : m);
        } catch (Exception e) {
            return "{}";
        }
    }

    /** 把 profile 里的扩展字段平铺进 record（与 id/email/name 同层，前端 cloudUser.nickname 直接可读） */
    public static void flatten(String profileJson, Map<String, Object> target) {
        target.putAll(parse(profileJson));
    }
}
