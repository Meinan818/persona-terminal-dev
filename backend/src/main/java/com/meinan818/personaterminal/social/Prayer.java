package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/** 祈愿行（prayers 表）。一天一对用户只能有一条。 */
@Data
@TableName("prayers")
public class Prayer {
    @TableId(type = IdType.INPUT)
    private String id;
    @TableField("from_user")
    private String fromUser;
    @TableField("to_user")
    private String toUser;
    /** 「祈愿日」key：YYYY-MM-DD，本地 04:00 为日界（前端算好传入） */
    private String day;
    private String created;
}
