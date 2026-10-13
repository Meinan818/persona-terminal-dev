-- V5：同伴羁绊（coop_bonds）—— 社交迁移 W3 第二波（PocketBase → 自研后端）
-- 镜像 PB `coop_bonds` 集合语义（见 src/services/coopBonds.ts 头注释）：
--   · user_a / user_b 按 id 字典序存放（小者=a），UNIQUE 保证同一对用户只有一条记录
--   · A/B 对称字段成对出现（两侧各自的选择），物化时按规则合并
--   · status 状态机：pending → linked | rejected | severed | expired
--   · 时间字段全部 ISO-8601 字符串（与 friendships 一致，前端 new Date(...) 直接消费）

CREATE TABLE IF NOT EXISTS coop_bonds (
  id                    VARCHAR(32)  NOT NULL PRIMARY KEY,   -- 雪花风格 ID
  user_a                VARCHAR(32)  NOT NULL,               -- 字典序较小的用户 id
  user_b                VARCHAR(32)  NOT NULL,               -- 字典序较大的用户 id
  initiator             VARCHAR(32)  NOT NULL,               -- 提议发起方（= user_a 或 user_b）
  status                VARCHAR(16)  NOT NULL,               -- pending/linked/rejected/severed/expired

  -- A 侧选择的塔罗（代表「Ta 在我眼中的样子」）
  arcana_a_id           VARCHAR(64)  NULL,
  arcana_a_orientation  VARCHAR(16)  NULL,                   -- upright / reversed
  -- B 侧选择的塔罗（linked 之前可能为空）
  arcana_b_id           VARCHAR(64)  NULL,
  arcana_b_orientation  VARCHAR(16)  NULL,

  -- 两侧各自期望的初始亲密度（1-10）；物化时 floor((a+b)/2)
  intimacy_a_level      INT          NULL,
  intimacy_b_level      INT          NULL,
  -- 两侧各自选定的能力加成属性
  skill_attribute_a     VARCHAR(32)  NULL,
  skill_attribute_b     VARCHAR(32)  NULL,
  -- 两侧各自的「逆流」开关；NULL = 未选择（区别于显式 false）
  -- 用 TINYINT（非 TINYINT(1)）避免 Connector/J 的 tinyInt1isBit 把它当 boolean 映射
  decay_a               TINYINT      NULL,
  decay_b               TINYINT      NULL,

  -- 提议 / 接受时附带的短消息（≤200 字）
  message_a             VARCHAR(512) NULL,
  message_b             VARCHAR(512) NULL,

  expires_at            VARCHAR(40)  NULL,                   -- 提议 TTL（14 天）
  responded_at          VARCHAR(40)  NULL,                   -- 接受/拒绝/解除时间
  re_request_after      VARCHAR(40)  NULL,                   -- 拒绝后冷却（3 天）
  re_link_after         VARCHAR(40)  NULL,                   -- 解除后冷却（7 天）

  created               VARCHAR(40)  NOT NULL,               -- ISO-8601
  updated               VARCHAR(40)  NOT NULL,

  UNIQUE KEY uk_coop_pair (user_a, user_b),
  INDEX idx_coop_a (user_a, status),
  INDEX idx_coop_b (user_b, status)
) ENGINE=InnoDB;
