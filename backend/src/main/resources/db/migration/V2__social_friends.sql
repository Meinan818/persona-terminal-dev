-- 社交迁移第一阶段：好友模块（PocketBase → 自研后端）
-- 设计偏离说明（相对计划文档）：计划原定独立 social_users 表存公开档案；
-- 实施探针发现 users.profile JSON 列已含全部档案字段（MeController.updateProfile 维护、
-- sync.ts 持续写入），故省去 social_users 层——社交身份直接 = velvet 用户，
-- 对外展示 ID 用 users.id（social_id 语义由 users.id 承担），档案读 users.profile。

-- 好友关系：镜像 PB friendships 字段语义
-- user_a/user_b 按 id 字典序存放（与 PB 一致），保证 (a,b) 与 (b,a) 唯一
CREATE TABLE IF NOT EXISTS friendships (
  id          VARCHAR(32)  NOT NULL PRIMARY KEY,          -- 雪花 ID
  user_a      VARCHAR(32)  NOT NULL,                      -- 字典序较小的用户 id
  user_b      VARCHAR(32)  NOT NULL,                      -- 字典序较大的用户 id
  initiator   VARCHAR(32)  NOT NULL,                      -- 发起方（可能 = user_a 或 user_b）
  status      VARCHAR(16)  NOT NULL,                      -- pending / accepted / declined
  message     VARCHAR(512) NULL,                          -- 申请附言
  created     VARCHAR(40)  NOT NULL,                      -- ISO-8601 字符串（与前端一致）
  updated     VARCHAR(40)  NOT NULL,
  expires_at  VARCHAR(40)  NULL,                          -- pending 过期时间（PB 语义：过期未处理自动失效）
  UNIQUE KEY uk_friend_pair (user_a, user_b),
  INDEX idx_friend_a (user_a, status),
  INDEX idx_friend_b (user_b, status)
) ENGINE=InnoDB;

-- 社交通知：本阶段只写 friend_request / friend_accepted 两类，第二阶段扩展
CREATE TABLE IF NOT EXISTS social_notifications (
  id          VARCHAR(32)  NOT NULL PRIMARY KEY,
  receiver    VARCHAR(32)  NOT NULL,                      -- 收件人用户 id
  type        VARCHAR(32)  NOT NULL,                      -- friend_request / friend_accepted
  payload     JSON         NOT NULL,                      -- {fromId, fromName, friendshipId, message…}
  read_flag   TINYINT      NOT NULL DEFAULT 0,            -- 0 未读 / 1 已读
  created     VARCHAR(40)  NOT NULL,
  INDEX idx_notif_receiver (receiver, read_flag, created)
) ENGINE=InnoDB;
