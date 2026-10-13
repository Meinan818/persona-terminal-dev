-- V13：邮件重置密码的一次性令牌落库。
--
-- 原先令牌只存在后端进程内存里（ConcurrentHashMap），重启后端会让用户邮件里还没有用过的
-- 重置链接立即失效——上线后每次部署 / 重启都可能撞上，用户只能重新申请。改成落库后，
-- 重启不影响未使用的链接。
--
-- 两条安全口径保持不变：
--   · 只存令牌原文的 SHA-256（digest 列），库被读走也拿不到可用令牌；
--   · 「一次性」由 deleteById 的删除行数保证：并发提交同一令牌时只有一个请求能删到那一行，
--     其余拿到 0 行即拒绝（与内存版 store.remove(key, entry) 的语义一致）。
-- 时间列与 users.created / updated 同口径：ISO-8601 字符串。

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  digest     CHAR(64)    NOT NULL PRIMARY KEY,   -- 令牌原文的 SHA-256（十六进制）
  user_id    VARCHAR(32) NOT NULL,
  created    VARCHAR(40) NOT NULL,               -- ISO-8601
  expires_at VARCHAR(40) NOT NULL,               -- ISO-8601
  INDEX idx_prt_user (user_id),
  INDEX idx_prt_expires (expires_at)
) ENGINE=InnoDB;
