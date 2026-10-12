package com.meinan818.personaterminal.user;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("users")
public class User {
    @TableId(type = IdType.ASSIGN_ID)
    private String id;

    private String email;

    private String name;

    /** BCrypt 摘要，不对外输出 */
    private String password;

    /** PocketBase users 集合的字段，用 JSON 列保结构灵活 */
    @TableField("avatar")
    private String avatar;

    /**
     * 档案扩展字段（nickname / total_lv / attribute_* / level_difficulty / status / goal …）
     * 的 JSON 列。这些字段从 PB users 集合迁来、会随功能演进增删，用单列承载避免频繁加列。
     * 读写统一走 {@link UserProfileFields}。
     */
    private String profile;

    private String created;
    private String updated;
}
