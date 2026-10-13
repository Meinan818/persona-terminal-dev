package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 组织成员行（org_members 表，字段语义镜像 PB org_members 集合）。
 *
 * <p>三条唯一键（DB 硬拦）：
 *  · (org, user) —— 一人在一个组织里只有一行
 *  · (user, slot) —— 每人最多「自己建一个」+「加入一个」
 *  · (org, seat)  —— 一个组织最多 7 人，座位 1–7 不重复
 */
@Data
@TableName("org_members")
public class OrgMember {

    @TableId(type = IdType.INPUT)
    private String id;
    /** → orgs.id */
    private String org;
    /** → users.id */
    private String user;
    /** own（自己建的）/ joined（加入的） */
    private String slot;
    /** 1–7 */
    private Integer seat;
    private String code;
    private String codename;
    @TableField("codename_kind")
    private String codenameKind;
    @TableField(value = "tarot_id", updateStrategy = FieldStrategy.ALWAYS)
    private String tarotId;
    /** 成员牌（JSON）；可被清空 → ALWAYS */
    @TableField(value = "card", updateStrategy = FieldStrategy.ALWAYS)
    private String card;
    @TableField(value = "goal", updateStrategy = FieldStrategy.ALWAYS)
    private String goal;
    @TableField(value = "goal_week", updateStrategy = FieldStrategy.ALWAYS)
    private String goalWeek;
    @TableField(value = "result", updateStrategy = FieldStrategy.ALWAYS)
    private String result;
    @TableField(value = "result_week", updateStrategy = FieldStrategy.ALWAYS)
    private String resultWeek;
    private String created;
    private String updated;
}
