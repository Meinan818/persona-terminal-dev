package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/** 社交通知行（social_notifications 表）。 */
@Data
@TableName("social_notifications")
public class SocialNotification {
    @TableId(type = IdType.INPUT)
    private String id;
    private String receiver;
    private String type;        // friend_request / friend_accepted
    private String payload;     // JSON
    @TableField("read_flag")
    private Integer readFlag;   // 0/1
    private String created;
    private String updated;
}
