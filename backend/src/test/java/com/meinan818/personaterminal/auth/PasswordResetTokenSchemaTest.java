package com.meinan818.personaterminal.auth;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * V13 迁移验证：password_reset_tokens 与其索引真的建出来了（查 information_schema，不 mock 中间层）。
 *
 * <p>这张表是「重启后端不影响用户手里还没点开的邮件链接」的地基——迁移没生效时服务层不会报错，
 * 只会静默退回旧行为，所以必须有人盯着表本身。
 *
 * <p>同时钉住「一次性」所依赖的那条语义：deleteById 的返回值就是真实删除行数，
 * 第二次删同一个 digest 拿到 0。
 */
@SpringBootTest
class PasswordResetTokenSchemaTest {

    @Autowired
    private DataSource dataSource;

    @Autowired
    private PasswordResetTokenMapper tokens;

    private int count(String sql) throws Exception {
        try (Connection c = dataSource.getConnection(); Statement st = c.createStatement()) {
            ResultSet rs = st.executeQuery(sql);
            rs.next();
            return rs.getInt(1);
        }
    }

    @Test
    void V13建出令牌表() throws Exception {
        int tables = count("SELECT COUNT(*) FROM information_schema.tables "
                + "WHERE table_schema = DATABASE() AND table_name = 'password_reset_tokens'");
        assertThat(tables).as("V13 应当建出 password_reset_tokens").isEqualTo(1);
    }

    @Test
    void 令牌表有用户与过期时间两级索引() throws Exception {
        int indexes = count("SELECT COUNT(DISTINCT index_name) FROM information_schema.statistics "
                + "WHERE table_schema = DATABASE() AND table_name = 'password_reset_tokens' "
                + "AND index_name IN ('idx_prt_user','idx_prt_expires')");
        assertThat(indexes).isEqualTo(2);
    }

    @Test
    void 删除返回真实行数_第二次删同一个令牌拿到零() {
        String digest = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        PasswordResetToken row = new PasswordResetToken();
        row.setDigest(digest.substring(0, 64));
        row.setUserId("schema-probe-user");
        row.setCreated(DateTimeFormatter.ISO_INSTANT.format(Instant.now()));
        row.setExpiresAt(DateTimeFormatter.ISO_INSTANT.format(Instant.now().plusSeconds(600)));

        tokens.insert(row);
        try {
            assertThat(tokens.selectById(row.getDigest())).isNotNull();
            assertThat(tokens.deleteById(row.getDigest())).as("第一次删到 1 行").isEqualTo(1);
            assertThat(tokens.deleteById(row.getDigest())).as("第二次删不到，一次性就靠这个").isEqualTo(0);
        } finally {
            tokens.deleteById(row.getDigest());
        }
    }
}
