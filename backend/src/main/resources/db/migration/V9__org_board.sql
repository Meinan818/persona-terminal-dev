-- V9：公告板（org_posts + org_reactions + org_reports）—— 社交迁移 W3 第五波 第二步
-- 镜像 PB 三个集合语义（见 src/services/orgs.ts 头注释）：
--   · (post, user) 唯一 —— 一人在一条动态上只有一个标签（再点同一个是撤、点别的换）
--   · (post_id, reporter) 唯一 —— 同一人对同一条只举报一次
-- org_posts 三种 kind：moment（分享动态）/ minutes（会议纪要）/ operation（作战达成卡）；
-- snapshot 列按 kind 存不同 JSON（moment→OrgPostSnapshot、minutes→OrgMinutesSnapshot、operation→OrgOpCardSnapshot）。
-- minutes / operation 卡的 id 由前端确定（minutesId / opCardId），撞了 = 另一台设备已发，读回即可。
-- 时间字段 ISO-8601 字符串；布尔用 TINYINT（非 TINYINT(1)）。

CREATE TABLE IF NOT EXISTS org_posts (
  id        VARCHAR(64)  NOT NULL PRIMARY KEY,  -- 可指定（minutesId / opCardId）
  org       VARCHAR(32)  NOT NULL,              -- → orgs.id
  user      VARCHAR(32)  NOT NULL,              -- → users.id（分享者）
  kind      VARCHAR(16)  NOT NULL,              -- moment / minutes / operation
  text      VARCHAR(256) NOT NULL DEFAULT '',   -- 动态附的一句话（≤20 字）；纪要/达成卡为空
  snapshot  JSON         NULL,                  -- 按 kind 解释的 JSON
  week_key  VARCHAR(16)  NOT NULL DEFAULT '',   -- 纪要/达成卡所属周
  created   VARCHAR(40)  NOT NULL,              -- ISO-8601
  INDEX idx_post_org (org, created),
  INDEX idx_post_org_user (org, user)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS org_reactions (
  id        VARCHAR(32) NOT NULL PRIMARY KEY,
  post      VARCHAR(64) NOT NULL,               -- → org_posts.id
  org       VARCHAR(32) NOT NULL,               -- → orgs.id
  user      VARCHAR(32) NOT NULL,               -- → users.id
  tag       VARCHAR(16) NOT NULL,               -- strong/same/steady/envy/metoo/hug
  created   VARCHAR(40) NOT NULL,
  updated   VARCHAR(40) NOT NULL,
  UNIQUE KEY uk_reaction_post_user (post, user),-- 一人在一条动态上只有一个标签
  INDEX idx_reaction_org (org)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS org_reports (
  id           VARCHAR(32) NOT NULL PRIMARY KEY,
  post_id      VARCHAR(64) NOT NULL,            -- 被举报动态 id（纯文本，动态删了也留档）
  org_id       VARCHAR(32) NOT NULL,
  target_user  VARCHAR(32) NOT NULL,            -- 被举报动态的作者
  reporter     VARCHAR(32) NOT NULL,            -- 举报人
  reason       VARCHAR(16) NOT NULL,            -- harass/inappropriate/ads/other
  text_copy    VARCHAR(256) NOT NULL DEFAULT '',-- 原话副本（动态删了后台也看得到）
  created      VARCHAR(40) NOT NULL,
  UNIQUE KEY uk_report_post_reporter (post_id, reporter), -- 同一人对同一条只举报一次
  INDEX idx_report_org (org_id)
) ENGINE=InnoDB;
