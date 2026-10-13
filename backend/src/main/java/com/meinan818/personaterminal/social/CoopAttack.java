package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 羁绊之影的一次出手（coop_attacks 表，字段语义镜像 PB coop_attacks）。
 *
 * <p>只追加不改写 —— 它是血量的事实源（按 damage_final 求和得当前 HP）。
 * {@code day} 为 {@code 'allout'} 时是总攻击，绕开每日唯一索引。
 */
@Data
@TableName("coop_attacks")
public class CoopAttack {

    @TableId(type = IdType.INPUT)
    private String id;
    @TableField("shadow_id")
    private String shadowId;
    private String attacker;
    private String day;                 // YYYY-MM-DD 或 'allout'
    @TableField("persona_id")
    private String personaId;
    @TableField("persona_name")
    private String personaName;
    @TableField("skill_kind")
    private String skillKind;
    @TableField("skill_name")
    private String skillName;
    @TableField("damage_raw")
    private Integer damageRaw;
    @TableField("damage_final")
    private Integer damageFinal;
    @TableField("resonance_bonus")
    private Integer resonanceBonus;
    @TableField("weakness_bonus")
    private Integer weaknessBonus;
    @TableField("counter_damage")
    private Integer counterDamage;
    private String created;
}
