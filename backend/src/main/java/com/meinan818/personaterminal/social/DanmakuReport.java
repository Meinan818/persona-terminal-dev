package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 弹幕举报行（danmaku_reports 表，镜像 PB danmaku_reports）。
 *
 * <p>UNIQUE(danmaku, reporter_id)：同一人对同一条只记一次举报。
 */
@Data
@TableName("danmaku_reports")
public class DanmakuReport {

    @TableId(type = IdType.INPUT)
    private String id;
    private String danmaku;
    private String reason;
    @TableField("reporter_id")
    private String reporterId;
    private String created;
}
