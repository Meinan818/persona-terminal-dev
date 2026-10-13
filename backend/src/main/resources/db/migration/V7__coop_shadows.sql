-- V7：羁绊之影（coop_shadows + coop_attacks）—— 社交迁移 W3 第四波（PocketBase → 自研后端）
-- 镜像 PB 两个集合语义（见 src/services/coopShadows.ts 头注释）：
--   · 每对 COOP 同一时刻最多 1 个 active coop_shadow
--   · 每个 user × 每个 shadow × 每个本地日最多 1 次 attack（UNIQUE 硬拦；day='allout' 绕开）
--   · 血量的事实源是 coop_attacks 日志求和，hp_current 只是派生缓存
-- Phase 1 客户端驱动业务逻辑 → 现改为后端服务端驱动

CREATE TABLE IF NOT EXISTS coop_shadows (
  id                    VARCHAR(32)  NOT NULL PRIMARY KEY,  -- 可指定（前端 slotId，见 shadowSlotId）
  bond_id               VARCHAR(32)  NOT NULL,              -- → coop_bonds.id
  user_a                VARCHAR(32)  NOT NULL,              -- 讨伐者 A
  user_b                VARCHAR(32)  NOT NULL,              -- 讨伐者 B
  shadow_id             VARCHAR(64)  NOT NULL,              -- 原型 id（COOP_SHADOW_POOL）
  name_override         VARCHAR(64)  NULL,                  -- 花名
  spawned_at            VARCHAR(40)  NOT NULL,              -- ISO-8601
  expires_at            VARCHAR(40)  NOT NULL,              -- spawned_at + 10 天
  hp_max                INT          NOT NULL,
  hp_current            INT          NOT NULL,              -- 派生缓存；事实源见 coop_attacks
  status                VARCHAR(16)  NOT NULL,              -- active / defeated / retreated
  weakness_attribute    VARCHAR(32)  NOT NULL,              -- 弱点属性
  resonance_until       VARCHAR(40)  NULL,                  -- 共鸣印记过期时间
  resonance_by          VARCHAR(32)  NULL,                  -- 印记留下者
  combo_count           INT          NOT NULL DEFAULT 0,    -- 弱点命中 +1
  all_out_by_a          TINYINT      NOT NULL DEFAULT 0,    -- 总攻击使用标记（用 TINYINT 非 (1)，避 tinyInt1isBit）
  all_out_by_b          TINYINT      NOT NULL DEFAULT 0,
  identified_by_a       TINYINT      NOT NULL DEFAULT 0,    -- 识破标记
  identified_by_b       TINYINT      NOT NULL DEFAULT 0,
  shared_buffs          JSON         NULL,                  -- {attack_up:{remainingTurns}, vulnerability:{...}}
  defeated_at           VARCHAR(40)  NULL,
  memorial_stamp        JSON         NULL,                  -- 纪念图章
  created               VARCHAR(40)  NOT NULL,
  updated               VARCHAR(40)  NOT NULL,
  INDEX idx_shadow_a (user_a, status),
  INDEX idx_shadow_b (user_b, status),
  INDEX idx_shadow_bond (bond_id, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS coop_attacks (
  id                VARCHAR(32)  NOT NULL PRIMARY KEY,
  shadow_id         VARCHAR(32)  NOT NULL,                 -- → coop_shadows.id
  attacker          VARCHAR(32)  NOT NULL,                 -- user id
  day               VARCHAR(16)  NOT NULL,                 -- YYYY-MM-DD 或 'allout'（绕开每日限速）
  persona_id        VARCHAR(64)  NULL,
  persona_name      VARCHAR(64)  NULL,
  skill_kind        VARCHAR(16)  NOT NULL,                 -- damage/buff/debuff/crit/charge/heal/attack_boost
  skill_name        VARCHAR(64)  NOT NULL,
  damage_raw        INT          NOT NULL DEFAULT 0,
  damage_final      INT          NOT NULL DEFAULT 0,
  resonance_bonus   TINYINT      NOT NULL DEFAULT 0,
  weakness_bonus    TINYINT      NOT NULL DEFAULT 0,
  counter_damage    INT          NOT NULL DEFAULT 0,       -- 联机模式恒 0
  created           VARCHAR(40)  NOT NULL,
  -- 每日限速硬拦：同一影 × 同一人 × 同一日只能一条（day='allout' 用的是同一个键但值不同，故可共存）
  UNIQUE KEY uk_attack_daily (shadow_id, attacker, day),
  INDEX idx_attack_shadow (shadow_id, created)
) ENGINE=InnoDB;
