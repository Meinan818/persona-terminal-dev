-- V6：一起进步（coop_pacts）—— 社交迁移 W3 第三波（PocketBase → 自研后端）
-- 镜像 PB `coop_pacts` 集合语义（见 src/services/coopPacts.ts 头注释）：
--   · from_user / to_user 有方向语义（不归一化）
--   · 双方各只写自己那一栏（done_from / done_to、nudge_from_day / nudge_to_day）
--   · status 状态机 pending → active | declined | cancelled | expired；active → finished | cancelled
--   · 无唯一键（一个用户可有多条历史约定）

CREATE TABLE IF NOT EXISTS coop_pacts (
  id              VARCHAR(32)  NOT NULL PRIMARY KEY,     -- 雪花风格 ID
  from_user       VARCHAR(32)  NOT NULL,                 -- 发起人 user id
  to_user         VARCHAR(32)  NOT NULL,                 -- 受邀人 user id
  kind            VARCHAR(8)   NOT NULL,                 -- daily / once
  mode            VARCHAR(16)  NOT NULL,                 -- same / different
  title_from      VARCHAR(128) NOT NULL,                 -- 发起人任务（≤30 字）
  title_to        VARCHAR(128) NULL,                     -- 受邀人任务（different 模式接受时填）
  days            INT          NOT NULL DEFAULT 0,       -- 7/14/30；0 = 不设期限
  deadline        VARCHAR(10)  NULL,                     -- YYYY-MM-DD（一次性截止日）
  start_day       VARCHAR(10)  NULL,                     -- YYYY-MM-DD（受邀人接受当天）
  status          VARCHAR(16)  NOT NULL,                 -- pending/active/finished/cancelled/declined/expired
  done_from       JSON         NULL,                     -- 打卡日子数组 ["YYYY-MM-DD",…]
  done_to         JSON         NULL,
  nudge_from_day  VARCHAR(10)  NULL,                     -- 最近一次催对方的日子
  nudge_to_day    VARCHAR(10)  NULL,
  message         VARCHAR(256) NULL,                     -- 邀请附言（≤120 字）
  ended_by        VARCHAR(32)  NULL,                     -- 谁结束的
  created         VARCHAR(40)  NOT NULL,                 -- ISO-8601
  updated         VARCHAR(40)  NOT NULL,
  INDEX idx_pact_from (from_user, status),
  INDEX idx_pact_to (to_user, status)
) ENGINE=InnoDB;
