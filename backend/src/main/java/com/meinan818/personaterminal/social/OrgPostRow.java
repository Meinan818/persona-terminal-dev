package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 公告板动态行（org_posts 表，镜像 PB org_posts）。
 *
 * <p>kind：moment（分享动态）/ minutes（会议纪要）/ operation（作战达成卡）。
 * snapshot 按 kind 解释为不同 JSON。minutes / operation 的 id 由前端确定（撞了 = 已发）。
 */
@Data
@TableName("org_posts")
public class OrgPostRow {

    @TableId(type = IdType.INPUT)
    private String id;
    /** → orgs.id */
    private String org;
    /** → users.id */
    private String user;
    /** moment / minutes / operation */
    private String kind;
    private String text;
    @TableField(value = "snapshot", updateStrategy = FieldStrategy.ALWAYS)
    private String snapshot;
    @TableField("week_key")
    private String weekKey;
    private String created;
}
