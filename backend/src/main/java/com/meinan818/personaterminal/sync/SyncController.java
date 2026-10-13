package com.meinan818.personaterminal.sync;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.meinan818.personaterminal.security.JwtAuthFilter;
import com.meinan818.personaterminal.user.User;
import com.meinan818.personaterminal.user.UserMapper;
import com.meinan818.personaterminal.user.UserProfileFields;
import com.meinan818.personaterminal.user.UserIdPolicy;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 云同步接口（JWT 保护）。对齐前端 src/services/sync.ts 用 PocketBase 集合当 KV 的语义。
 *
 *   GET    /api/sync/rows[?fields=id,key,updated] → [{id,key,value,created,updated},…]（当前用户全部）
 *   GET    /api/sync/rows/count                   → {totalItems:n}
 *   GET    /api/sync/rows/{id}                    → {id,key,value,created,updated}
 *   POST   /api/sync/rows   {key,value}           → {id,key,value,created,updated}
 *   PUT    /api/sync/rows/{id} {value}            → {id,updated}
 *   DELETE /api/sync/rows/{id}                    → 204
 *
 * 关键约束：
 *   1. user_id 一律取当前登录用户，**不信任**客户端传的 user —— 防越权。
 *   2. 每次写入由服务端生成单调 updated（ISO-8601），前端用它做乐观并发与分片新旧判定。
 *   3. 行不属于当前用户 → 404（不泄漏存在性）。
 */
@RestController
@RequestMapping("/api/sync")
@RequiredArgsConstructor
public class SyncController {

    private final UserDataMapper userDataMapper;
    private final UserMapper userMapper;
    private static final ObjectMapper JSON = new ObjectMapper();

    private String currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof JwtAuthFilter.UserIdPrincipal p)) {
            return null;
        }
        return p.userId();
    }

    private static ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(401).body(Map.of("velvet", "not_found"));
    }

    private static ResponseEntity<?> notFound() {
        return ResponseEntity.status(404).body(Map.of("velvet", "not_found"));
    }

    private static String now() {
        return DateTimeFormatter.ISO_INSTANT.format(Instant.now());
    }

    /** 投影模式：fields 含 'value' 才带 value（对齐 PB 的 fields 投影） */
    private Map<String, Object> toRecord(UserData d, boolean includeValue) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", d.getId());
        m.put("key", d.getKeyName());
        if (includeValue) m.put("value", parseValue(d.getValue()));
        m.put("created", d.getCreated());
        m.put("updated", d.getUpdated());
        return m;
    }

    /** value 以 JSON 字符串存储，输出时反序列化为原生结构（数组/对象） */
    private Object parseValue(String raw) {
        if (raw == null) return null;
        try {
            return JSON.readValue(raw, Object.class);
        } catch (Exception e) {
            return raw; // 理论上不会发生（列类型是 JSON）
        }
    }

    /** 把请求体里的 value（JsonNode）序列化成 JSON 字符串存库 */
    private static String serializeValue(JsonNode value) {
        return value == null ? "null" : value.toString();
    }

    @GetMapping("/rows")
    public ResponseEntity<?> list(@RequestParam(value = "fields", required = false) String fields) {
        String userId = currentUserId();
        if (userId == null) return unauthorized();
        boolean includeValue = fields == null || fields.contains("value");
        List<UserData> rows = userDataMapper.selectList(
                new QueryWrapper<UserData>().eq("user_id", userId).orderByAsc("created"));
        List<Map<String, Object>> out = new ArrayList<>();
        for (UserData d : rows) out.add(toRecord(d, includeValue));
        return ResponseEntity.ok(out);
    }

    @GetMapping("/rows/count")
    public ResponseEntity<?> count() {
        String userId = currentUserId();
        if (userId == null) return unauthorized();
        Long n = userDataMapper.selectCount(new QueryWrapper<UserData>().eq("user_id", userId));
        return ResponseEntity.ok(Map.of("totalItems", n == null ? 0 : n));
    }

    @GetMapping("/rows/{id}")
    public ResponseEntity<?> getOne(@PathVariable String id) {
        String userId = currentUserId();
        if (userId == null) return unauthorized();
        UserData d = userDataMapper.selectById(id);
        if (d == null || !userId.equals(d.getUserId())) return notFound();
        return ResponseEntity.ok(toRecord(d, true));
    }

    @PostMapping("/rows")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        String userId = currentUserId();
        if (userId == null) return unauthorized();
        Object keyObj = body.get("key");
        if (keyObj == null || String.valueOf(keyObj).isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("velvet", "key_required"));
        }
        String key = String.valueOf(keyObj);

        // 幂等：同一 (user,key) 已存在则更新（对齐原 create-or-update 兜底语义）
        UserData existing = userDataMapper.selectOne(
                new QueryWrapper<UserData>().eq("user_id", userId).eq("key_name", key).last("LIMIT 1"));
        String ts = now();
        Object valueObj = body.get("value");
        String valueJson = valueObj == null ? "null" : JSON.valueToTree(valueObj).toString();

        if (existing != null) {
            existing.setValue(valueJson);
            existing.setUpdated(ts);
            userDataMapper.updateById(existing);
            return ResponseEntity.ok(toRecord(existing, true));
        }

        UserData d = new UserData();
        d.setUserId(userId);
        d.setKeyName(key);
        d.setValue(valueJson);
        d.setCreated(ts);
        d.setUpdated(ts);
        userDataMapper.insert(d);
        return ResponseEntity.ok(toRecord(d, true));
    }

    @PutMapping("/rows/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String userId = currentUserId();
        if (userId == null) return unauthorized();
        UserData d = userDataMapper.selectById(id);
        if (d == null || !userId.equals(d.getUserId())) return notFound();
        Object valueObj = body.get("value");
        if (body.containsKey("value")) {
            d.setValue(valueObj == null ? "null" : JSON.valueToTree(valueObj).toString());
        }
        String ts = now();
        d.setUpdated(ts);
        userDataMapper.updateById(d);
        Map<String, Object> m = new HashMap<>();
        m.put("id", d.getId());
        m.put("updated", d.getUpdated());
        return ResponseEntity.ok(m);
    }

    @DeleteMapping("/rows/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        String userId = currentUserId();
        if (userId == null) return unauthorized();
        UserData d = userDataMapper.selectById(id);
        if (d == null || !userId.equals(d.getUserId())) return notFound();
        userDataMapper.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * 用户档案写（对齐原 pb.collection('users').update）。支持 name/username/avatar/
     * total_lv/level_difficulty/attribute_level_titles 等字段，返回完整 record。
     */
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, Object> patch) {
        String userId = currentUserId();
        if (userId == null) return unauthorized();
        User u = userMapper.selectById(userId);
        if (u == null) return unauthorized();
        if (patch.containsKey("username") || patch.containsKey("name")) {
            Object raw = patch.containsKey("username") ? patch.get("username") : patch.get("name");
            return UserIdPolicy.write(userMapper, raw, u.getId(), name -> {
                u.setName(name);
                return saveProfile(u, patch);
            });
        }
        return saveProfile(u, patch);
    }

    private ResponseEntity<?> saveProfile(User u, Map<String, Object> patch) {
        if (patch.containsKey("avatar")) u.setAvatar(asString(patch.get("avatar")));
        // 档案扩展字段（nickname / total_lv / attribute_* / status / goal …）并入 profile JSON 列
        u.setProfile(UserProfileFields.merge(u.getProfile(), patch));
        u.setUpdated(now());
        userMapper.updateById(u);
        return ResponseEntity.ok(toRecord(u));
    }

    private static String asString(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private static Map<String, Object> toRecord(User u) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", u.getId());
        m.put("email", u.getEmail());
        m.put("name", u.getName());
        m.put("username", u.getName());
        m.put("avatar", u.getAvatar());
        // 档案扩展字段与基础字段同层（前端 cloudUser.nickname 等直接可读）
        UserProfileFields.flatten(u.getProfile(), m);
        m.put("created", u.getCreated());
        m.put("updated", u.getUpdated());
        return m;
    }
}
