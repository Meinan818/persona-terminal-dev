package com.meinan818.personaterminal.sync;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 云同步 KV 记录。
 *
 * 对齐前端 src/services/sync.ts 把 PocketBase 集合当 KV 用的模型：
 *   keyName = 本地表名 / 分片 '表名#n' / '_meta'；value = 该表的行数组（原生 JSON）。
 *
 * 注意：MySQL 的 KEY 是保留字，故列名为 key_name，字段用 @TableField 映射。
 */
@Data
@TableName("user_data")
public class UserData {
    @TableId(type = IdType.ASSIGN_ID)
    private String id;

    @TableField("user_id")
    private String userId;

    /** 同步键：表名 / '表名#n' / '_meta' */
    @TableField("key_name")
    private String keyName;

    /** 行数组（原生 JSON）。MyBatis-Plus 需 TypeHandler 以 JSON 字符串承载，见 mapper XML/注解 */
    private String value;

    private String created;
    private String updated;
}
