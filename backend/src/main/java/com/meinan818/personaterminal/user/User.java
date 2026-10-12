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

    private String created;
    private String updated;
}
