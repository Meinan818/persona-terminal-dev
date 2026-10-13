package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 举报行（org_reports 表，镜像 PB org_reports）。
 *
 * <p>UNIQUE(post_id, reporter)：同一人对同一条只举报一次（重复举报静默忽略）。
 * text_copy 是原话副本——动态被删了后台也看得到。
 */
@Data
@TableName("org_reports")
public class OrgReportRow {

    @TableId(type = IdType.INPUT)
    private String id;
    @TableField("post_id")
    private String postId;
    @TableField("org_id")
    private String orgId;
    @TableField("target_user")
    private String targetUser;
    private String reporter;
    private String reason;
    @TableField("text_copy")
    private String textCopy;
    private String created;
}
