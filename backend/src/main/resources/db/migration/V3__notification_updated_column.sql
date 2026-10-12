-- V3：补 social_notifications.updated 列
--
-- 背景（2026-10-14 发现）：V2 建 social_notifications 时漏了 updated 列，
-- 但 SocialNotification 实体声明了 private String updated，MyBatis-Plus 的
-- insert/updateById 会带上该字段 → 撞 "Unknown column 'updated' in 'field list'"。
-- 而 FriendService.notify() 的写入包在 catch(Exception){) 里（通知失败不阻断主流程），
-- 该错误被静默吞掉 → 好友通知从未真正落库（实测 social_notifications 行数为 0）。
-- 本迁移补齐列；friendships 表本就有 updated，语义保持一致（均为 ISO-8601 字符串）。
ALTER TABLE social_notifications
  ADD COLUMN updated VARCHAR(40) NOT NULL DEFAULT '' AFTER created;
