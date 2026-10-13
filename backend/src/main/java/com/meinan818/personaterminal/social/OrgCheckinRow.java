package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 打卡行（org_checkins 表，镜像 PB org_checkins）。
 *
 * <p>UNIQUE(operation, user, kind)：一个人对同一次作战的同一类记录
 * （done 完成 / out 不参加 / plan 那一份）只有一条。
 */
@Data
@TableName("org_checkins")
public class OrgCheckinRow {

    @TableId(type = IdType.INPUT)
    private String id;
    /** → org_operations.id */
    private String operation;
    /** → orgs.id */
    private String org;
    /** → users.id */
    private String user;
    /** done / out / plan */
    private String kind;
    private String day;
    private String text;
    private String created;
}
