package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 组织行（orgs 表，字段语义镜像 PB orgs 集合）。
 *
 * <p>关键不变量：
 *  · leader 唯一 —— 每人最多建一个组织（DB UNIQUE uk_org_leader 硬拦）
 *  · invite_code 唯一 —— 8 位邀请码不重复（撞码由服务层换一个重试）
 */
@Data
@TableName("orgs")
public class Org {

    @TableId(type = IdType.INPUT)
    private String id;
    private String name;
    private String motto;
    private String emblem;
    /** 队长 user id（唯一） */
    private String leader;
    @TableField("invite_code")
    private String inviteCode;
    /** 建立时记下的创建者时区（IANA） */
    private String tz;
    /** 队长自定义（JSON ≤ 4KB）；可被清空回 null → ALWAYS */
    @TableField(value = "custom", updateStrategy = FieldStrategy.ALWAYS)
    private String custom;
    private String created;
    private String updated;
}
