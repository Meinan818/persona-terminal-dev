-- V8：组织核心（orgs + org_members）—— 社交迁移 W3 第五波 第一步（PocketBase → 自研后端）
-- 镜像 PB 两个集合语义（见 src/services/orgs.ts 头注释）：
--   · (org, user) 唯一 —— 同一人在一个组织里只有一行
--   · (user, slot) 唯一 —— 每人最多「自己建一个」+「加入一个」
--   · (org, seat)  唯一 —— 一个组织最多 7 人，座位号 1–7 不重复
--   · orgs.leader  唯一 —— 每人最多建一个组织（队长只能当一个组织的队长）
--   · invite_code  唯一 —— 8 位邀请码唯一
--   · 非成员凭邀请码可读那一个组织（预览），迁移后由服务端接口保证（不能再靠 PB 规则）
-- 时间字段全部 ISO-8601 字符串（与 friendships / coop_* 一致，前端 new Date(...) 直接消费）
-- 可空且可能被清空回的列，实体挂 FieldStrategy.ALWAYS（否则改回 null 不生效）
-- 布尔用 TINYINT（非 TINYINT(1)），避 Connector/J 的 tinyInt1isBit

CREATE TABLE IF NOT EXISTS orgs (
  id            VARCHAR(32)  NOT NULL PRIMARY KEY,   -- 可指定（沿用 PB 记录 id 形状）
  name          VARCHAR(64)  NOT NULL,               -- 组织名（≤12 字，前端截断）
  motto         VARCHAR(128) NOT NULL DEFAULT '',    -- 座右铭（≤30 字）
  emblem        VARCHAR(32)  NOT NULL DEFAULT 'star',-- 徽记 id
  leader        VARCHAR(32)  NOT NULL,               -- 队长 user id
  invite_code   VARCHAR(16)  NOT NULL,               -- 8 位邀请码
  tz            VARCHAR(64)  NOT NULL DEFAULT 'UTC', -- 建立时的创建者时区（IANA）
  custom        JSON         NULL,                   -- 队长自定义（等级名/称号改名/自定义称号）
  created       VARCHAR(40)  NOT NULL,               -- ISO-8601
  updated       VARCHAR(40)  NOT NULL,
  UNIQUE KEY uk_org_leader (leader),                 -- 每人最多建一个组织
  UNIQUE KEY uk_org_invite (invite_code),            -- 邀请码唯一
  INDEX idx_org_created (created)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS org_members (
  id             VARCHAR(32)  NOT NULL PRIMARY KEY,  -- 可指定
  org            VARCHAR(32)  NOT NULL,              -- → orgs.id
  user           VARCHAR(32)  NOT NULL,              -- → users.id
  slot           VARCHAR(16)  NOT NULL,              -- own（自己建的）/ joined（加入的）
  seat           INT          NOT NULL,              -- 1–7；队长建立时坐 1 号
  code           VARCHAR(16)  NOT NULL DEFAULT '',   -- 加入时用的邀请码（留档）
  codename       VARCHAR(64)  NOT NULL DEFAULT '',   -- 代号（≤8 字）
  codename_kind  VARCHAR(16)  NOT NULL DEFAULT 'nickname', -- custom / nickname / tarot
  tarot_id       VARCHAR(64)  NULL,                  -- 代表牌（大阿卡纳 id）
  card           JSON         NULL,                  -- 成员牌上的数字（streak/week/attrs/persona 等）
  goal           VARCHAR(128) NULL,                  -- 本周目标（周日会议写）
  goal_week      VARCHAR(16)  NULL,                  -- 目标属于哪一周
  result         VARCHAR(16)  NULL,                  -- done / partial / missed（对上上周目标的自评）
  result_week    VARCHAR(16)  NULL,                  -- 自评针对哪一周
  created        VARCHAR(40)  NOT NULL,              -- ISO-8601
  updated        VARCHAR(40)  NOT NULL,
  UNIQUE KEY uk_member_org_user (org, user),         -- 一人在一个组织里只有一行
  UNIQUE KEY uk_member_user_slot (user, slot),       -- 每人最多自建一个 + 加入一个
  UNIQUE KEY uk_member_org_seat (org, seat),         -- 一个组织最多 7 人，座位不重复
  INDEX idx_member_org (org, seat)
) ENGINE=InnoDB;
