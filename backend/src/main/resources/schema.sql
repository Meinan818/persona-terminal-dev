-- MASKARIA 数据库初始化（MySQL 8）
-- 复杂嵌套结构按策划书 4.2 用 JSON 列，与前端 TS 类型直接对应
CREATE DATABASE IF NOT EXISTS persona_terminal
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE persona_terminal;

CREATE TABLE IF NOT EXISTS users (
  id         VARCHAR(32)  NOT NULL PRIMARY KEY,          -- 雪花 ID，与 PocketBase record id 对齐
  email      VARCHAR(255) NOT NULL UNIQUE,
  name       VARCHAR(255) NULL,
  password   VARCHAR(100) NOT NULL,                      -- BCrypt
  avatar     VARCHAR(512) NULL,
  created    VARCHAR(40)  NOT NULL,                      -- ISO-8601 字符串，与前端一致
  updated    VARCHAR(40)  NOT NULL,
  INDEX idx_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS settings (
  id         VARCHAR(32) NOT NULL PRIMARY KEY,
  user_id    VARCHAR(32) NOT NULL,
  payload    JSON        NOT NULL,                       -- Settings 全量结构
  created    VARCHAR(40) NOT NULL,
  updated    VARCHAR(40) NOT NULL,
  UNIQUE KEY uk_settings_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sync_log (
  id         BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id    VARCHAR(32)  NOT NULL,
  entity     VARCHAR(64)  NOT NULL,                      -- 同步的集合名
  watermark  VARCHAR(40)  NOT NULL,                      -- updated_at 水位
  synced_at  VARCHAR(40)  NOT NULL,
  INDEX idx_sync_user (user_id, entity)
) ENGINE=InnoDB;
