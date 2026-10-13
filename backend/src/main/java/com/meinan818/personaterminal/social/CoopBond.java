package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 同伴羁绊行（coop_bonds 表，字段语义镜像 PB coop_bonds）。
 *
 * <p>user_a / user_b 按 id 字典序存放（小者=a），(user_a,user_b) 唯一 —— 与前端
 * {@code coopBonds.ts} 的 {@code orderPair()} 语义一致：同一对用户无论谁先发起，
 * 都命中同一条记录。
 *
 * <p>A/B 对称字段（arcana_a / arcana_b、intimacy_a / intimacy_b、skill_attribute_a / skill_attribute_b、
 * decay_a / decay_b、message_a / message_b）是两侧
 * 各自的选择，操作时按「我是 A 还是 B」决定写哪一侧。
 *
 * <p><b>FieldStrategy.ALWAYS</b>：这些可空列在「复用已有行重新提议」/「接受」时需要
 * 被显式置 null 清空（例如新提议要清掉对面的旧 arcana）。MyBatis-Plus 默认 NOT_NULL
 * 会跳过 null 字段，导致旧值残留 —— 故对需要可空清空的列声明 ALWAYS。
 */
@Data
@TableName("coop_bonds")
public class CoopBond {

    @TableId(type = IdType.INPUT)
    private String id;
    private String userA;       // 字典序较小
    private String userB;       // 字典序较大
    private String initiator;   // 发起方
    private String status;      // pending / linked / rejected / severed / expired

    @TableField(value = "arcana_a_id", updateStrategy = FieldStrategy.ALWAYS)
    private String arcanaAId;
    @TableField(value = "arcana_a_orientation", updateStrategy = FieldStrategy.ALWAYS)
    private String arcanaAOrientation;
    @TableField(value = "arcana_b_id", updateStrategy = FieldStrategy.ALWAYS)
    private String arcanaBId;
    @TableField(value = "arcana_b_orientation", updateStrategy = FieldStrategy.ALWAYS)
    private String arcanaBOrientation;

    @TableField(value = "intimacy_a_level", updateStrategy = FieldStrategy.ALWAYS)
    private Integer intimacyALevel;
    @TableField(value = "intimacy_b_level", updateStrategy = FieldStrategy.ALWAYS)
    private Integer intimacyBLevel;

    @TableField(value = "skill_attribute_a", updateStrategy = FieldStrategy.ALWAYS)
    private String skillAttributeA;
    @TableField(value = "skill_attribute_b", updateStrategy = FieldStrategy.ALWAYS)
    private String skillAttributeB;

    /** 0/1；null = 未选择（区别于显式 false） */
    @TableField(value = "decay_a", updateStrategy = FieldStrategy.ALWAYS)
    private Integer decayA;
    @TableField(value = "decay_b", updateStrategy = FieldStrategy.ALWAYS)
    private Integer decayB;

    @TableField(value = "message_a", updateStrategy = FieldStrategy.ALWAYS)
    private String messageA;
    @TableField(value = "message_b", updateStrategy = FieldStrategy.ALWAYS)
    private String messageB;

    @TableField(value = "expires_at", updateStrategy = FieldStrategy.ALWAYS)
    private String expiresAt;
    @TableField(value = "responded_at", updateStrategy = FieldStrategy.ALWAYS)
    private String respondedAt;
    @TableField(value = "re_request_after", updateStrategy = FieldStrategy.ALWAYS)
    private String reRequestAfter;
    @TableField(value = "re_link_after", updateStrategy = FieldStrategy.ALWAYS)
    private String reLinkAfter;

    private String created;
    private String updated;

    /** 两用户按字典序定 a/b（与前端 orderPair 语义一致） */
    public static String smallerOf(String x, String y) { return x.compareTo(y) < 0 ? x : y; }
    public static String largerOf(String x, String y)  { return x.compareTo(y) < 0 ? y : x; }

    public boolean involves(String userId) { return userA.equals(userId) || userB.equals(userId); }
    public String otherOf(String userId)   { return userA.equals(userId) ? userB : userA; }
    public boolean isA(String userId)      { return userA.equals(userId); }
}
