package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 一起进步约定行（coop_pacts 表，字段语义镜像 PB coop_pacts）。
 *
 * <p>与 coop_bonds 不同：from_user / to_user 有**方向语义**（发起人 → 受邀人），不做字典序归一化。
 *
 * <p>双方各只写自己那一栏（done_from / done_to、nudge_from_day / nudge_to_day），
 * 这样两人同时打卡也不会互相覆盖 —— 故这些列的更新必须**只碰对应列**。
 */
@Data
@TableName("coop_pacts")
public class CoopPact {

    @TableId(type = IdType.INPUT)
    private String id;
    @TableField("from_user")
    private String fromUser;
    @TableField("to_user")
    private String toUser;
    private String kind;        // daily / once
    private String mode;        // same / different
    @TableField("title_from")
    private String titleFrom;
    @TableField(value = "title_to", updateStrategy = FieldStrategy.ALWAYS)
    private String titleTo;
    private Integer days;
    @TableField(value = "deadline", updateStrategy = FieldStrategy.ALWAYS)
    private String deadline;
    @TableField(value = "start_day", updateStrategy = FieldStrategy.ALWAYS)
    private String startDay;
    private String status;
    /** 打卡日子数组的 JSON 文本（["YYYY-MM-DD",…]）；Service 层负责编解码 */
    @TableField(value = "done_from", updateStrategy = FieldStrategy.ALWAYS)
    private String doneFrom;
    @TableField(value = "done_to", updateStrategy = FieldStrategy.ALWAYS)
    private String doneTo;
    @TableField(value = "nudge_from_day", updateStrategy = FieldStrategy.ALWAYS)
    private String nudgeFromDay;
    @TableField(value = "nudge_to_day", updateStrategy = FieldStrategy.ALWAYS)
    private String nudgeToDay;
    private String message;
    @TableField(value = "ended_by", updateStrategy = FieldStrategy.ALWAYS)
    private String endedBy;
    private String created;
    private String updated;

    public boolean involves(String userId) { return fromUser.equals(userId) || toUser.equals(userId); }
    public boolean isFrom(String userId)    { return fromUser.equals(userId); }
    /** 我是不是受邀人 */
    public boolean isTo(String userId)      { return toUser.equals(userId); }
    public String otherOf(String userId)    { return fromUser.equals(userId) ? toUser : fromUser; }
}
