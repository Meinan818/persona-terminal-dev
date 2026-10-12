package com.meinan818.personaterminal.social;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Wave1.1 验证：Flyway V2 迁移后三张社交表与关键索引/唯一键真实存在。
 * 查 information_schema（ground truth），不 mock 中间层。
 */
@SpringBootTest
class SocialSchemaMigrationTest {

    @Autowired
    private DataSource dataSource;

    private Set<String> tableNames() throws Exception {
        Set<String> names = new HashSet<>();
        try (Connection c = dataSource.getConnection(); Statement st = c.createStatement()) {
            ResultSet rs = st.executeQuery(
                "SELECT table_name FROM information_schema.tables " +
                "WHERE table_schema = DATABASE() AND table_name IN " +
                "('friendships','social_notifications')");
            while (rs.next()) names.add(rs.getString(1));
        }
        return names;
    }

    @Test
    void V2迁移建出两张社交表() throws Exception {
        Set<String> tables = tableNames();
        assertThat(tables).contains("friendships", "social_notifications");
    }

    @Test
    void friendships有双人唯一键防重复申请() throws Exception {
        try (Connection c = dataSource.getConnection(); Statement st = c.createStatement()) {
            ResultSet rs = st.executeQuery(
                "SELECT COUNT(*) FROM information_schema.statistics " +
                "WHERE table_schema = DATABASE() AND table_name = 'friendships' " +
                "AND index_name = 'uk_friend_pair'");
            rs.next();
            assertThat(rs.getInt(1)).isGreaterThanOrEqualTo(2); // user_a + user_b 两列参与唯一键
        }
    }

    @Test
    void social_notifications有收件人索引() throws Exception {
        try (Connection c = dataSource.getConnection(); Statement st = c.createStatement()) {
            ResultSet rs = st.executeQuery(
                "SELECT COUNT(*) FROM information_schema.statistics " +
                "WHERE table_schema = DATABASE() AND table_name = 'social_notifications' " +
                "AND index_name = 'idx_notif_receiver'");
            rs.next();
            assertThat(rs.getInt(1)).isGreaterThanOrEqualTo(1);
        }
    }
}
