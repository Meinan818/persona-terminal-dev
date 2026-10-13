-- V12：弹幕（danmaku + danmaku_reports）—— 社交迁移 W5 弹幕
-- 镜像 PB 两个集合语义（见 src/services/danmaku.ts 头注释）：
--   · danmaku 刻意匿名：**不存作者**（没有任何指向用户的列）——匿名是这个功能的地基
--   · 先审后发：status = pending / approved / rejected；列表只出 approved
--     ⚠️ 自研后端无 PB Admin 后台，过审策略由服务层决定（本波 = 前端校验通过即 approved，
--        见 DanmakuService 头注释；如需人工把关再加 admin 开关）
--   · danmaku_reports 唯一索引 (danmaku, reporter_id) —— 同一人对同一条只记一次举报
-- 时间字段 ISO-8601 字符串；布尔用 TINYINT（非 TINYINT(1)）。

CREATE TABLE IF NOT EXISTS danmaku (
  id             VARCHAR(32)  NOT NULL PRIMARY KEY,
  text           VARCHAR(64)  NOT NULL,             -- 鼓励语（≤20 字，前端已截）
  theme          VARCHAR(16)  NOT NULL DEFAULT 'blue', -- blue / yellow / red
  status         VARCHAR(16)  NOT NULL DEFAULT 'approved', -- pending / approved / rejected
  is_seed        TINYINT      NOT NULL DEFAULT 0,   -- 官方种子（非 UGC，不可举报）
  report_count   INT          NOT NULL DEFAULT 0,
  approved_at    VARCHAR(40)  NULL,                 -- 过审时间
  created        VARCHAR(40)  NOT NULL,             -- ISO-8601
  updated        VARCHAR(40)  NOT NULL,
  INDEX idx_danmaku_status_created (status, created) -- 列表查询：approved + 倒序
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS danmaku_reports (
  id           VARCHAR(32)  NOT NULL PRIMARY KEY,
  danmaku      VARCHAR(32)  NOT NULL,               -- → danmaku.id
  reason       VARCHAR(128) NOT NULL DEFAULT '',
  reporter_id  VARCHAR(32)  NOT NULL,               -- 举报人（只存这个，不存弹幕作者——那本来就不存在）
  created      VARCHAR(40)  NOT NULL,
  UNIQUE KEY uk_danmaku_report (danmaku, reporter_id), -- 同一人对同一条只一次
  INDEX idx_danmaku_report_danmaku (danmaku)
) ENGINE=InnoDB;
