-- V4：祈愿（prayers）—— 社交迁移 W3 第一波（PocketBase → 自研后端）
-- 镜像 PB `prayers` 集合语义：一天一对用户只能有一条祈愿。
--   day = 「祈愿日」key（YYYY-MM-DD，本地 04:00 为日界，由前端算好传入）
--   UNIQUE (from_user, to_user, day) —— 与 PB 的 unique 索引语义一致
-- 祈愿不可改、不可撤回（与 PB 设计一致，故无 update 接口）。

CREATE TABLE IF NOT EXISTS prayers (
  id         VARCHAR(32) NOT NULL PRIMARY KEY,          -- 雪花 ID
  from_user  VARCHAR(32) NOT NULL,                      -- 发起者 user id
  to_user    VARCHAR(32) NOT NULL,                      -- 接收者 user id
  day        VARCHAR(10) NOT NULL,                      -- YYYY-MM-DD（本地 04:00 日界）
  created    VARCHAR(40) NOT NULL,                      -- ISO-8601
  UNIQUE KEY uk_prayer_day (from_user, to_user, day),
  INDEX idx_prayer_day_from (day, from_user),
  INDEX idx_prayer_day_to (day, to_user)
) ENGINE=InnoDB;
