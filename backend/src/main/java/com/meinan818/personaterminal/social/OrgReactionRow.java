package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 公告板标签行（org_reactions 表，镜像 PB org_reactions）。
 *
 * <p>UNIQUE(post, user)：一人在一条动态上只有一个标签；再点同一个 = 撤，点别的 = 换。
 */
@Data
@TableName("org_reactions")
public class OrgReactionRow {

    @TableId(type = IdType.INPUT)
    private String id;
    /** → org_posts.id */
    private String post;
    /** → orgs.id */
    private String org;
    /** → users.id */
    private String user;
    /** strong / same / steady / envy / metoo / hug */
    private String tag;
    private String created;
    private String updated;
}
