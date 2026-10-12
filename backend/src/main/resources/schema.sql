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

-- 云同步 KV 存储（对齐前端 sync.ts 把 PocketBase 当 KV 用的模型）
-- 一条记录 = 一张本地表（key_name = 表名）或一个分片（key_name = '表名#n'）或 '_meta'
-- value 存该表的行数组（原生 JSON）；服务端每次写入生成单调 updated，供前端乐观并发判定
CREATE TABLE IF NOT EXISTS user_data (
  id         VARCHAR(32)  NOT NULL PRIMARY KEY,          -- 雪花 ID，对齐原 PocketBase record id
  user_id    VARCHAR(32)  NOT NULL,
  key_name   VARCHAR(128) NOT NULL,                      -- 表名 / '表名#n' 分片 / '_meta'
  value      JSON         NOT NULL,                      -- 行数组，原生 JSON 不做二次 stringify
  created    VARCHAR(40)  NOT NULL,                      -- ISO-8601
  updated    VARCHAR(40)  NOT NULL,                      -- 服务端生成，单调
  UNIQUE KEY uk_userdata_user_key (user_id, key_name),
  INDEX idx_userdata_user (user_id)
) ENGINE=InnoDB;
