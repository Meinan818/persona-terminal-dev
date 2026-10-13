-- V10：作战（org_operations + org_checkins）—— 社交迁移 W3 第五波 第三步
-- 镜像 PB 两个集合语义（见 src/services/orgs.ts 头注释）：
--   · (operation, user, kind) 唯一 —— 一个人对同一次作战的同一类记录（完成/不参加/那一份）只有一条
--   · 作战 status：active / cancelled；取消后不能再打卡（服务端规则拒）
--   · participants：参与人 id 数组（JSON）；assignments：big 作战里每人负责的那一份（JSON 对象）
--   · 名单外的人 / 已取消的作战 打卡 → 服务端返回 null（调用方按「不用再写了」处理）
-- 时间字段 ISO-8601 字符串；布尔用 TINYINT（非 TINYINT(1)）。

CREATE TABLE IF NOT EXISTS org_operations (
  id           VARCHAR(32)  NOT NULL PRIMARY KEY,
  org          VARCHAR(32)  NOT NULL,              -- → orgs.id
  initiator    VARCHAR(32)  NOT NULL,              -- 发起人 user id
  kind         VARCHAR(16)  NOT NULL,              -- small / big
  attr         VARCHAR(16)  NOT NULL,              -- 属性（knowledge 等 8 种）
  title        VARCHAR(64)  NOT NULL DEFAULT '',   -- 作战名（≤20 字）
  deadline     VARCHAR(16)  NOT NULL DEFAULT '',   -- 截止日（YYYY-MM-DD）
  participants JSON         NULL,                  -- 参与人 id 数组
  assignments  JSON         NULL,                  -- big 作战：每人负责的那一份 {userId: task}
  status       VARCHAR(16)  NOT NULL DEFAULT 'active', -- active / cancelled
  created      VARCHAR(40)  NOT NULL,              -- ISO-8601
  updated      VARCHAR(40)  NOT NULL,
  INDEX idx_op_org (org, created)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS org_checkins (
  id         VARCHAR(32) NOT NULL PRIMARY KEY,
  operation  VARCHAR(32) NOT NULL,                 -- → org_operations.id
  org        VARCHAR(32) NOT NULL,                 -- → orgs.id
  user       VARCHAR(32) NOT NULL,                 -- → users.id
  kind       VARCHAR(16) NOT NULL,                 -- done（完成）/ out（不参加）/ plan（那一份）
  day        VARCHAR(16) NOT NULL DEFAULT '',      -- done 的那一天（YYYY-MM-DD）
  text       VARCHAR(64) NOT NULL DEFAULT '',      -- plan 的那一句话（≤20 字）
  created    VARCHAR(40) NOT NULL,
  UNIQUE KEY uk_checkin_op_user_kind (operation, user, kind), -- 同一人同一类只一条
  INDEX idx_checkin_org (org)
) ENGINE=InnoDB;
