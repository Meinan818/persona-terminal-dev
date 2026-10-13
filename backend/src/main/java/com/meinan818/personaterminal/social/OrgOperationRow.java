package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 作战行（org_operations 表，镜像 PB org_operations）。
 *
 * <p>kind：small（小目标）/ big（大战）。participants 是参与人 id 数组；
 * assignments 是 big 作战里每人负责的那一份（{userId: task}）。都用 JSON 列存。
 */
@Data
@TableName("org_operations")
public class OrgOperationRow {

    @TableId(type = IdType.INPUT)
    private String id;
    /** → orgs.id */
    private String org;
    /** 发起人 user id */
    private String initiator;
    /** small / big */
    private String kind;
    private String attr;
    private String title;
    private String deadline;
    @TableField(value = "participants", updateStrategy = FieldStrategy.ALWAYS)
    private String participants;
    @TableField(value = "assignments", updateStrategy = FieldStrategy.ALWAYS)
    private String assignments;
    /** active / cancelled */
    private String status;
    private String created;
    private String updated;
}
