package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 团战出手行（org_raid_hits 表，镜像 PB org_raid_hits）。
 *
 * <p>UNIQUE(raid, user, night)：同一人同一晚只出手一次（总攻击的 night 是 'allout'）。
 */
@Data
@TableName("org_raid_hits")
public class OrgRaidHitRow {

    @TableId(type = IdType.INPUT)
    private String id;
    /** → org_raids.id */
    private String raid;
    /** → orgs.id */
    private String org;
    /** → users.id */
    private String user;
    /** strike / allout */
    private String kind;
    private String night;
    @TableField(value = "attr", updateStrategy = FieldStrategy.ALWAYS)
    private String attr;
    private String skill;
    private Integer damage;
    private Integer weak;
    private String created;
}
