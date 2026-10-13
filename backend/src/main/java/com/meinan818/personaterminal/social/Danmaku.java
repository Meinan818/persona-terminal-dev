package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 弹幕行（danmaku 表，镜像 PB danmaku）。
 *
 * <p>⚠️ 刻意匿名：**本表没有任何指向用户的列**（没有 author/createdBy）。这是设计地基，
 * 不是遗漏——迁移时必须保持，别顺手加个作者字段。
 *
 * <p>status：pending / approved / rejected。列表只出 approved。
 */
@Data
@TableName("danmaku")
public class Danmaku {

    @TableId(type = IdType.INPUT)
    private String id;
    private String text;
    private String theme;
    private String status;
    @TableField("is_seed")
    private Integer isSeed;
    @TableField("report_count")
    private Integer reportCount;
    @TableField(value = "approved_at", updateStrategy = FieldStrategy.ALWAYS)
    private String approvedAt;
    private String created;
    private String updated;
}
