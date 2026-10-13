package com.meinan818.personaterminal.auth;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 邮件重置密码的一次性令牌（表结构见 V13 迁移）。
 *
 * <p>digest 是令牌原文的 SHA-256；原始令牌只出现在发给用户的邮件链接里，不落库。
 */
@Data
@TableName("password_reset_tokens")
public class PasswordResetToken {

    @TableId(type = IdType.INPUT)
    private String digest;

    private String userId;

    /** 签发时刻，ISO-8601 */
    private String created;

    /** 失效时刻，ISO-8601 */
    private String expiresAt;
}
