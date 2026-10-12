package com.meinan818.personaterminal.social;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.meinan818.personaterminal.user.User;
import com.meinan818.personaterminal.user.UserMapper;
import com.meinan818.personaterminal.user.UserProfileFields;
import lombok.RequiredArgsConstructor;
import com.meinan818.personaterminal.social.SocialException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;


import java.util.HashMap;
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

    /** JWT 用户 → 社交行（懒注册语义退化为「存在性校验」：users 表在注册时已建）。 */
    public User requireUser(String velvetUserId) {
        User u = userMapper.selectById(velvetUserId);
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
        m.put("id", u.getId());
        m.put("username", u.getId());            // 前端以 id 作为「用户ID」查找键
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
