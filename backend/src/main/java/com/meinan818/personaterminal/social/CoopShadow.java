package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 羁绊之影行（coop_shadows 表，字段语义镜像 PB coop_shadows）。
 *
 * <p>关键不变量：
 *  · 每对 COOP 同一时刻最多 1 个 active（服务层保证）
 *  · hp_current 是**派生缓存**，事实源是 coop_attacks 日志求和（见 CoopShadowService.recomputeHp）
 */
@Data
@TableName("coop_shadows")
public class CoopShadow {

    @TableId(type = IdType.INPUT)
    private String id;
    @TableField("bond_id")
    private String bondId;
    @TableField("user_a")
    private String userA;
    @TableField("user_b")
    private String userB;
    @TableField("shadow_id")
    private String shadowId;
    @TableField(value = "name_override", updateStrategy = FieldStrategy.ALWAYS)
    private String nameOverride;
    @TableField("spawned_at")
    private String spawnedAt;
    @TableField("expires_at")
    private String expiresAt;
    @TableField("hp_max")
    private Integer hpMax;
    @TableField("hp_current")
    private Integer hpCurrent;
    private String status;
    @TableField("weakness_attribute")
    private String weaknessAttribute;
    @TableField(value = "resonance_until", updateStrategy = FieldStrategy.ALWAYS)
    private String resonanceUntil;
    @TableField(value = "resonance_by", updateStrategy = FieldStrategy.ALWAYS)
    private String resonanceBy;
    @TableField("combo_count")
    private Integer comboCount;
    @TableField("all_out_by_a")
    private Integer allOutByA;
    @TableField("all_out_by_b")
    private Integer allOutByB;
    @TableField("identified_by_a")
    private Integer identifiedByA;
    @TableField("identified_by_b")
    private Integer identifiedByB;
    @TableField(value = "shared_buffs", updateStrategy = FieldStrategy.ALWAYS)
    private String sharedBuffs;
    @TableField(value = "defeated_at", updateStrategy = FieldStrategy.ALWAYS)
    private String defeatedAt;
    @TableField(value = "memorial_stamp", updateStrategy = FieldStrategy.ALWAYS)
    private String memorialStamp;
    private String created;
    private String updated;

    public boolean involves(String userId) { return userA.equals(userId) || userB.equals(userId); }
    public boolean isA(String userId) { return userA.equals(userId); }
    public String otherOf(String userId) { return userA.equals(userId) ? userB : userA; }
}
