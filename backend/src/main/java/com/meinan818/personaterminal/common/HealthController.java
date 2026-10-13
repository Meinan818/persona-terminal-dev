package com.meinan818.personaterminal.common;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;
import java.util.Map;

/**
 * 极简健康检查：给部署手册自检、systemd 与将来的监控用，路径在 SecurityConfig 里放行。
 *
 * <p>没有引入 spring-boot-starter-actuator —— 这台 2 GB 的机器上不需要一整套管理端点，
 * 多一个 starter 就多一份内存与依赖。这里只回答两件事：进程活着、数据库连得上。
 */
@RestController
public class HealthController {

    private final DataSource dataSource;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping("/api/health")
    public ResponseEntity<Map<String, String>> health() {
        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement()) {
            statement.execute("SELECT 1");
            return ResponseEntity.ok(Map.of("status", "UP", "db", "UP"));
        } catch (Exception error) {
            return ResponseEntity.status(503)
                    .body(Map.of("status", "DOWN", "db", "DOWN", "reason", String.valueOf(error.getMessage())));
        }
    }
}
