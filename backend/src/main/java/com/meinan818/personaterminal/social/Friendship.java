package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/** 好友关系行（friendships 表，字段语义镜像 PB friendships）。 */
@Data
@TableName("friendships")
public class Friendship {
    @TableId(type = IdType.INPUT)
    private String id;
    private String userA;       // 字典序较小
    private String userB;       // 字典序较大
    private String initiator;   // 发起方
    private String status;      // pending / accepted / declined
    private String message;
    private String created;
    private String updated;
    private String expiresAt;

    /** 两用户按字典序定 a/b（与 PB friendships 的 user_a/user_b 语义一致） */
    public static String smallerOf(String x, String y) { return x.compareTo(y) < 0 ? x : y; }
    public static String largerOf(String x, String y)  { return x.compareTo(y) < 0 ? y : x; }

    public boolean involves(String userId) { return userA.equals(userId) || userB.equals(userId); }
    public String otherOf(String userId)   { return userA.equals(userId) ? userB : userA; }
}
