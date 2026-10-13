package com.meinan818.personaterminal.user;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 注销账号：删掉用户本人以及其名下所有关联行（App 内必须能注销）。
 *
 * <p>为什么用 JdbcTemplate 而不是逐个 Mapper：本库**没有任何外键**，
 * 删账号不会级联，必须逐表删。把「哪张表、哪几列指向用户」集中写成一张清单，
 * 一眼能审；漏表比多写几行 SQL 危险得多。
 *
 * <p>整个删除在一个事务里：任何一步失败都回滚，不留半删状态。
 *
 * <p>故意不删的：`social_notifications` 里**别人收件箱中**由本用户发出的通知
 * （payload.from_id 指向已删用户）。那是对方的记录，删掉等于篡改他人数据；
 * 对方拉列表时查不到发件人档案，只是缺头像昵称，不报错。
 */
@Service
@RequiredArgsConstructor
public class AccountDeletionService {

    private final JdbcTemplate jdbc;

    /** 表 → 指向用户 id 的列（任一列命中即属于该用户） */
    private static final List<String[]> USER_ROWS = List.of(
            new String[]{"user_data", "user_id"},
            new String[]{"settings", "user_id"},
            new String[]{"sync_log", "user_id"},
            new String[]{"social_notifications", "receiver"},
            new String[]{"danmaku_reports", "reporter_id"},
            new String[]{"friendships", "user_a", "user_b"},
            new String[]{"coop_bonds", "user_a", "user_b"},
            new String[]{"coop_pacts", "from_user", "to_user"},
            new String[]{"coop_shadows", "user_a", "user_b"},
            new String[]{"coop_attacks", "attacker"},
            new String[]{"prayers", "from_user", "to_user"},
            new String[]{"org_checkins", "user"},
            new String[]{"org_members", "user"},
            new String[]{"org_reactions", "user"},
            new String[]{"org_posts", "user"},
            new String[]{"org_raid_hits", "user"},
            new String[]{"org_operations", "initiator"},
            new String[]{"org_reports", "reporter", "target_user"}
    );

    /** 删除该用户及其名下数据。返回是否存在该用户（false 表示已经不存在，幂等） */
    @Transactional
    public boolean deleteAccount(String userId) {
        Integer exists = jdbc.queryForObject(
                "SELECT COUNT(*) FROM users WHERE id = ?", Integer.class, userId);
        if (exists == null || exists == 0) return false;

        for (String[] entry : USER_ROWS) {
            StringBuilder sql = new StringBuilder("DELETE FROM ").append(entry[0]).append(" WHERE ");
            List<Object> args = new java.util.ArrayList<>();
            for (int i = 1; i < entry.length; i++) {
                if (i > 1) sql.append(" OR ");
                sql.append(entry[i]).append(" = ?");
                args.add(userId);
            }
            jdbc.update(sql.toString(), args.toArray());
        }

        // 自己创建的组织：先删组织内的团战/命中，再删组织本身
        jdbc.update("DELETE FROM org_raid_hits WHERE org IN (SELECT id FROM orgs WHERE leader = ?)", userId);
        jdbc.update("DELETE FROM org_raids WHERE org IN (SELECT id FROM orgs WHERE leader = ?)", userId);
        jdbc.update("DELETE FROM orgs WHERE leader = ?", userId);

        return jdbc.update("DELETE FROM users WHERE id = ?", userId) > 0;
    }
}
