-- V11：满月团战（org_raids + org_raid_hits）—— 社交迁移 W3 第五波 第四步
-- 镜像 PB 两个集合语义（见 src/services/orgs.ts 头注释）：
--   · (org, slot) 唯一 —— 一次满月一个组织只有一场团战（slot = 满月序号）
--   · (raid, user, night) 唯一 —— 同一人同一晚只出手一次（总攻击算一个特殊 night='allout'）
--   · 开团 id 由前端确定（撞了 = 别人刚开过，读回那条）
--   · boss：{v,name,weak,lv} JSON；hp_max 开团时定下（据点等级每级 +5%）
--   · raid_hits.kind：strike（出手）/ allout（总攻击）；weak 表示是否打中弱点
-- 时间字段 ISO-8601 字符串；布尔用 TINYINT（非 TINYINT(1)）。

CREATE TABLE IF NOT EXISTS org_raids (
  id       VARCHAR(32) NOT NULL PRIMARY KEY,   -- 可指定（前端确定性 id）
  org      VARCHAR(32) NOT NULL,               -- → orgs.id
  slot     INT         NOT NULL,               -- 满月序号（一次满月一个组织一场）
  boss     JSON        NULL,                   -- {v,name,weak,lv}
  hp_max   INT         NOT NULL,               -- 开团时定下的血量上限
  created  VARCHAR(40) NOT NULL,               -- ISO-8601
  UNIQUE KEY uk_raid_org_slot (org, slot),     -- 一个组织一次满月只有一场
  INDEX idx_raid_org (org)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS org_raid_hits (
  id       VARCHAR(32) NOT NULL PRIMARY KEY,
  raid     VARCHAR(32) NOT NULL,               -- → org_raids.id
  org      VARCHAR(32) NOT NULL,               -- → orgs.id
  user     VARCHAR(32) NOT NULL,               -- → users.id
  kind     VARCHAR(16) NOT NULL,               -- strike / allout
  night    VARCHAR(16) NOT NULL,               -- 出手那一晚（YYYY-MM-DD）；总攻击为 'allout'
  attr     VARCHAR(16) NULL,                   -- 武器属性（可能没有）
  skill    VARCHAR(64) NOT NULL DEFAULT '',    -- 招式名（≤20 字）
  damage   INT         NOT NULL DEFAULT 0,
  weak     TINYINT     NOT NULL DEFAULT 0,     -- 是否打中弱点
  created  VARCHAR(40) NOT NULL,
  UNIQUE KEY uk_hit_raid_user_night (raid, user, night), -- 同一人同一晚只一次
  INDEX idx_hit_org (org)
) ENGINE=InnoDB;
