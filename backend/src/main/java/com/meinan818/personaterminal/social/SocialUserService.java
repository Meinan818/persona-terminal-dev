package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.meinan818.personaterminal.user.User;
import com.meinan818.personaterminal.user.UserMapper;
import com.meinan818.personaterminal.user.UserProfileFields;
import lombok.RequiredArgsConstructor;
import com.meinan818.personaterminal.social.SocialException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;


import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 社交侧用户辅助（第一阶段简化版）。
 *
 * 设计偏离记录（相对计划文档）：计划原定独立 social_users 表；实施探针发现
 * users.profile JSON 列已含全部公开档案字段（MeController.updateProfile 维护、
 * sync.ts 持续写入），故社交身份直接 = velvet 用户，不建 social_users 层。
 * 对外「社交 ID」= users.id（雪花 ID，与前端 cloudUser.id 同源）。
 *
 * 隐私边界（沿用 PB 时代设计）：对外档案绝不包含 email——friends.ts:46 注释
 * 记录了 PII 外泄教训。公开字段白名单 = UserProfileFields.EXTENSION_KEYS
 * + id/name（展示名），email/password 永不出这个服务。
 */
@Service
@RequiredArgsConstructor
public class SocialUserService {

    private static final ObjectMapper JSON = new ObjectMapper();

    private final UserMapper userMapper;

    /**
     * 按 id 或 UserID 解析用户。
     *
     * <p>两种键都要认：前端搜索框让用户输入的是 **UserID**（users.name，如 bob123），
     * 而关系行里存的是 **雪花 id**（users.id）——加好友时先按 UserID 查人、
     * 拿到 id 后后续操作全用 id。任一命中即可，都没有返回 null。
     *
     * <p>name 列没有唯一索引（历史数据可能重名），排序取第一条，避免 selectOne 抛异常。
     */
    public User resolve(String key) {
        if (key == null || key.isBlank()) return null;
        User byId = userMapper.selectById(key);
        if (byId != null) return byId;
        List<User> byName = userMapper.selectList(
                new QueryWrapper<User>().eq("name", key).last("LIMIT 1"));
        return byName.isEmpty() ? null : byName.get(0);
    }

    /** JWT 用户 → 社交行（懒注册语义退化为「存在性校验」：users 表在注册时已建）。 */
    public User requireUser(String velvetUserId) {
        User u = resolve(velvetUserId);
        if (u == null) {
            throw new SocialException(HttpStatus.UNAUTHORIZED, "用户不存在");
        }
        return u;
    }

    /**
     * 组装对外公开档案（CloudProfile 形状）。email 永不出现。
     * 字段语义与前端 friends.ts mapCloudProfile 一一对应。
     */
    public Map<String, Object> publicProfile(User u) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", u.getId());                  // 关系行/后续操作用的内部键（雪花 id）
        m.put("username", u.getName());          // 对外「UserID」= users.name（用户可读、可输入的查找键）
        m.put("nickname", u.getName());
        m.put("avatarUrl", u.getAvatar());
        UserProfileFields.flatten(u.getProfile(), m);   // total_lv/attribute_*/status/goal…
        m.remove("email");
        return m;
    }

    /** 解析 users.profile JSON（坏数据当空对象，与 UserProfileFields.parse 同语义）。 */
    public Map<String, Object> parseProfile(User u) {
        try {
            return u.getProfile() == null || u.getProfile().isBlank()
                    ? new HashMap<>() : JSON.readValue(u.getProfile(), Map.class);
        } catch (Exception e) {
            return new HashMap<>();
        }
    }
}
