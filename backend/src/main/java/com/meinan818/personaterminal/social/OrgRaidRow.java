package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 满月团战行（org_raids 表，镜像 PB org_raids）。
 *
 * <p>UNIQUE(org, slot)：一个组织一次满月只有一场团战。boss 是 JSON（{v,name,weak,lv}）。
 */
@Data
@TableName("org_raids")
public class OrgRaidRow {

    @TableId(type = IdType.INPUT)
    private String id;
    /** → orgs.id */
    private String org;
    /** 满月序号 */
    private Integer slot;
    @TableField(value = "boss", updateStrategy = FieldStrategy.ALWAYS)
    private String boss;
    @TableField("hp_max")
    private Integer hpMax;
    private String created;
}
