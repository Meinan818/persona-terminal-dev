package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.meinan818.personaterminal.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 羁绊之影服务（社交迁移 W3 第四波）。
 *
 * <p>契约逐字对齐前端 {@code src/services/coopShadows.ts}：
 *  · 每对 COOP 同一时刻最多 1 个 active 影
 *  · 每人 × 每影 × 每日最多 1 次攻击 —— 靠 {@code UNIQUE(shadow_id,attacker,day)} 硬拦，
 *    冲突返回 <b>409 + code=already_attacked_today</b>（不再依赖 PB 的 message 含 'unique' 字符串匹配）
 *  · 总攻击用 {@code day='allout'} 绕开每日限速，每人每影仅一次（all_out_by_*）
 *  · <b>血量事实源是 coop_attacks 日志求和</b>，hp_current 只是派生缓存（写入时基于日志重算）
 *  · 越权（不涉及自己）→ 404
 *
 * <p>伤害由前端算好（依赖本地 persona 数据）后传入，后端负责落库 + 不变量校验。
 */
@Service
@RequiredArgsConstructor
public class CoopShadowService {

    /** 每次 buff 技能延长的回合数，封顶 */
    private static final int BUFF_DURATION_INC = 3;
    private static final int BUFF_DURATION_CAP = 6;

    private final CoopShadowMapper shadowMapper;
    private final CoopAttackMapper attackMapper;
    private final SocialNotificationMapper notificationMapper;
    private final SocialUserService socialUserService;
    private final ObjectMapper json = new ObjectMapper();

    // ── 读 ────────────────────────────────────────────────

    /** 与我相关的全部影（含 active / defeated / retreated），按降临倒序。 */
    public List<Map<String, Object>> listFor(String me) {
        List<CoopShadow> rows = shadowMapper.selectList(new QueryWrapper<CoopShadow>()
                .and(w -> w.eq("user_a", me).or().eq("user_b", me))
                .orderByDesc("spawned_at"));
        List<Map<String, Object>> out = new ArrayList<>(rows.size());
        for (CoopShadow s : rows) out.add(toView(s));
        return out;
    }

    /** 单只影（出手前取最新）。 */
    public Map<String, Object> get(String me, String id) {
        return toView(requireInvolving(me, id));
    }

    /** 该影的全部出手记录（按 created 倒序）。 */
    public List<Map<String, Object>> attacks(String me, String shadowId) {
        requireInvolving(me, shadowId);
        List<CoopAttack> rows = attackMapper.selectList(new QueryWrapper<CoopAttack>()
                .eq("shadow_id", shadowId).orderByDesc("created"));
        List<Map<String, Object>> out = new ArrayList<>(rows.size());
        for (CoopAttack a : rows) out.add(toAttackView(a));
        return out;
    }

    // ── 降临 ──────────────────────────────────────────────

    /**
     * 降临一只影。前端算好 slotId（同一对 COOP 同一个月夜同一个 id）并传入；
     * 冲突（对方/另一路同步已建）→ 读回已有，{@code created=false}，不再通知。
     */
    public Map<String, Object> spawn(String me, Map<String, Object> in) {
        String bondId = str(in.get("bondId"));
        String userA = str(in.get("userAId"));
        String userB = str(in.get("userBId"));
        String id = str(in.get("id"));
        if (bondId == null || userA == null || userB == null || id == null) {
            throw new SocialException(HttpStatus.BAD_REQUEST, "参数缺失");
        }
        if (!userA.equals(me) && !userB.equals(me)) {
            throw new SocialException(HttpStatus.NOT_FOUND, "羁绊之影不存在");
        }
        String partnerId = userA.equals(me) ? userB : userA;

        CoopShadow existing = shadowMapper.selectById(id);
        if (existing != null) {
            Map<String, Object> v = toView(existing);
            v.put("created", false);
            return v;
        }

        Instant now = Instant.now();
        CoopShadow s = new CoopShadow();
        s.setId(id);
        s.setBondId(bondId);
        s.setUserA(userA);
        s.setUserB(userB);
        s.setShadowId(str(in.get("shadowId")));
        s.setNameOverride(str(in.get("nameOverride")));
        s.setSpawnedAt(str(in.get("spawnedAt")) != null ? str(in.get("spawnedAt")) : iso(now));
        s.setExpiresAt(str(in.get("expiresAt")));
        Integer hpMax = asInt(in.get("hpMax"));
        s.setHpMax(hpMax == null ? 200 : hpMax);
        s.setHpCurrent(s.getHpMax());
        s.setStatus("active");
        s.setWeaknessAttribute(str(in.get("weaknessAttribute")));
        s.setComboCount(0);
        s.setAllOutByA(0);
        s.setAllOutByB(0);
        s.setIdentifiedByA(0);
        s.setIdentifiedByB(0);
        s.setCreated(iso(now));
        s.setUpdated(iso(now));
        try {
            shadowMapper.insert(s);
        } catch (DuplicateKeyException e) {
            // 撞 id = 对方/另一路同步抢先建了：读回已有
            CoopShadow dup = shadowMapper.selectById(id);
            if (dup != null) {
                Map<String, Object> v = toView(dup);
                v.put("created", false);
                return v;
            }
            throw e;
        }

        Map<String, Object> extra = new HashMap<>();
        extra.put("archetype_id", s.getShadowId());
        notify(me, partnerId, "coop_shadow_spawned", s.getId(), extra);
        Map<String, Object> v = toView(s);
        v.put("created", true);
        return v;
    }

    // ── 识破 ──────────────────────────────────────────────

    /** 登记识破（幂等）。写一条 type=coop_shadow_spawned + payload.event='identify' 通知。 */
    public Map<String, Object> identify(String me, String id) {
        CoopShadow s = requireInvolving(me, id);
        if (!"active".equals(s.getStatus())) {
            throw new SocialException(HttpStatus.BAD_REQUEST, "这只羁绊之影已经不在战斗中");
        }
        boolean iAmA = s.isA(me);
        boolean already = iAmA ? s.getIdentifiedByA() != 0 : s.getIdentifiedByB() != 0;
        if (already) return toView(s);

        if (iAmA) s.setIdentifiedByA(1); else s.setIdentifiedByB(1);
        s.setUpdated(iso(Instant.now()));
        shadowMapper.updateById(s);

        Map<String, Object> extra = new HashMap<>();
        extra.put("event", "identify");
        notify(me, s.otherOf(me), "coop_shadow_spawned", s.getId(), extra);
        return toView(s);
    }

    // ── 攻击 ──────────────────────────────────────────────

    /**
     * 一次攻击。前端算好 damageFinal / bonus 后传入；后端落库 + 重算血量 + 推进 buff。
     * 每日限速冲突 → 409 already_attacked_today。
     */
    public Map<String, Object> attack(String me, String id, Map<String, Object> in) {
        CoopShadow s = requireInvolving(me, id);
        assertStillBattling(s);

        String skillKind = str(in.get("skillKind"));
        boolean isUtility = "buff".equals(skillKind) || "debuff".equals(skillKind);
        boolean isDamaging = !isUtility && !"heal".equals(skillKind);
        int damageFinal = isDamaging ? Math.max(0, asIntOr0(in.get("damageFinal"))) : 0;
        boolean resonanceBonus = asBool(in.get("resonanceBonus"));
        boolean weaknessBonus = isDamaging && asBool(in.get("weaknessBonus"));

        Instant now = Instant.now();
        String day = str(in.get("day"));
        if (day == null || !day.matches("\\d{4}-\\d{2}-\\d{2}")) {
            throw new SocialException(HttpStatus.BAD_REQUEST, "缺少 day");
        }

        // 1) 落出手日志（唯一键冲突 = 今天已出过手）
        CoopAttack a = new CoopAttack();
        a.setId(newId());
        a.setShadowId(s.getId());
        a.setAttacker(me);
        a.setDay(day);
        a.setPersonaId(str(in.get("personaId")));
        a.setPersonaName(str(in.get("personaName")));
        a.setSkillKind(skillKind);
        a.setSkillName(str(in.get("skillName")));
        a.setDamageRaw(isDamaging ? Math.max(0, asIntOr0(in.get("damageRaw"))) : 0);
        a.setDamageFinal(damageFinal);
        a.setResonanceBonus(resonanceBonus ? 1 : 0);
        a.setWeaknessBonus(weaknessBonus ? 1 : 0);
        a.setCounterDamage(0);
        a.setCreated(iso(now));
        try {
            attackMapper.insert(a);
        } catch (DuplicateKeyException e) {
            throw new ConflictException("already_attacked_today", "今天你已经对这只羁绊之影出过手了，明天再来");
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new ConflictException("already_attacked_today", "今天你已经对这只羁绊之影出过手了，明天再来");
        }

        try {
            // 2) 推进 shared_buffs
            Map<String, Object> nextBuffs = advanceBuffs(s.getSharedBuffs(), skillKind, isUtility, isDamaging);
            // 3) 血量从日志重算（含刚插入这条）
            int hpAfter = recomputeHp(s.getHpMax(), s.getId());
            boolean defeatedNow = isDamaging && hpAfter == 0;

            s.setHpCurrent(hpAfter);
            s.setSharedBuffs(nextBuffs.isEmpty() ? null : writeJson(nextBuffs));
            s.setComboCount(weaknessBonus ? (s.getComboCount() == null ? 1 : s.getComboCount() + 1) : (s.getComboCount() == null ? 0 : s.getComboCount()));
            if (isDamaging) {
                s.setResonanceUntil(iso(now.plusSeconds(12 * 3600L)));
                s.setResonanceBy(me);
            }
            if (defeatedNow) {
                s.setStatus("defeated");
                s.setDefeatedAt(iso(now));
                s.setMemorialStamp(writeJson(buildMemorial(s, now, me)));
            }
            s.setUpdated(iso(now));
            shadowMapper.updateById(s);
        } catch (RuntimeException e) {
            // 两步写非原子：第二步失败撤掉第一步（对齐前端补偿语义）
            try { attackMapper.deleteById(a.getId()); } catch (Exception ignore) { }
            throw e;
        }

        Map<String, Object> extra = new HashMap<>();
        extra.put("damage", damageFinal);
        extra.put("resonance_bonus", resonanceBonus);
        extra.put("weakness_bonus", weaknessBonus);
        extra.put("persona_name", a.getPersonaName());
        extra.put("skill_name", a.getSkillName());
        extra.put("hp_remaining", s.getHpCurrent());
        notify(me, s.otherOf(me), defeated(s) ? "coop_shadow_defeated" : "coop_shadow_attacked", s.getId(), extra);

        Map<String, Object> res = new HashMap<>();
        res.put("attack", toAttackView(a));
        res.put("updatedShadow", toView(s));
        res.put("weaknessBonus", weaknessBonus);
        res.put("resonanceBonus", resonanceBonus);
        res.put("isBuffCast", isUtility);
        res.put("defeatedNow", defeated(s));
        return res;
    }

    /** 总攻击：day='allout' 绕开每日限速；每人每影一次。 */
    public Map<String, Object> allOut(String me, String id, Map<String, Object> in) {
        CoopShadow s = requireInvolving(me, id);
        assertStillBattling(s);
        if (s.getComboCount() == null || s.getComboCount() < 5) {
            throw new SocialException(HttpStatus.BAD_REQUEST, "COMBO 未到 5，还不能释放总攻击");
        }
        boolean iAmA = s.isA(me);
        if ((iAmA ? s.getAllOutByA() : s.getAllOutByB()) != 0) {
            throw new SocialException(HttpStatus.BAD_REQUEST, "你已经对这只羁绊之影释放过总攻击了");
        }
        int damage = Math.max(1, asIntOr0(in.get("damage")));
        Instant now = Instant.now();

        CoopAttack a = new CoopAttack();
        a.setId(newId());
        a.setShadowId(s.getId());
        a.setAttacker(me);
        a.setDay("allout");
        a.setPersonaId(str(in.get("personaId")));
        a.setPersonaName(str(in.get("personaName")));
        a.setSkillKind("attack_boost");
        a.setSkillName("总攻击 · ALL-OUT");
        a.setDamageRaw(damage);
        a.setDamageFinal(damage);
        a.setResonanceBonus(0);
        a.setWeaknessBonus(0);
        a.setCounterDamage(0);
        a.setCreated(iso(now));
        attackMapper.insert(a);

        try {
            int hpAfter = recomputeHp(s.getHpMax(), s.getId());
            boolean defeatedNow = hpAfter == 0;
            s.setHpCurrent(hpAfter);
            if (iAmA) s.setAllOutByA(1); else s.setAllOutByB(1);
            if (defeatedNow) {
                s.setStatus("defeated");
                s.setDefeatedAt(iso(now));
                s.setMemorialStamp(writeJson(buildMemorial(s, now, me)));
            }
            s.setUpdated(iso(now));
            shadowMapper.updateById(s);
        } catch (RuntimeException e) {
            try { attackMapper.deleteById(a.getId()); } catch (Exception ignore) { }
            throw e;
        }

        Map<String, Object> extra = new HashMap<>();
        extra.put("damage", damage);
        extra.put("resonance_bonus", false);
        extra.put("weakness_bonus", false);
        extra.put("persona_name", a.getPersonaName());
        extra.put("skill_name", "总攻击 · ALL-OUT");
        extra.put("all_out", true);
        extra.put("hp_remaining", s.getHpCurrent());
        notify(me, s.otherOf(me), defeated(s) ? "coop_shadow_defeated" : "coop_shadow_attacked", s.getId(), extra);

        Map<String, Object> res = new HashMap<>();
        res.put("attack", toAttackView(a));
        res.put("updatedShadow", toView(s));
        res.put("defeatedNow", defeated(s));
        return res;
    }

    // ── 撤退 ──────────────────────────────────────────────

    /** 已过期但仍 active → retreated。未到期/非 active 原样返回。 */
    public Map<String, Object> retreat(String me, String id) {
        CoopShadow s = requireInvolving(me, id);
        if (!"active".equals(s.getStatus())) return toView(s);
        if (s.getExpiresAt() == null || Instant.now().isBefore(Instant.parse(s.getExpiresAt()))) return toView(s);

        s.setStatus("retreated");
        s.setUpdated(iso(Instant.now()));
        shadowMapper.updateById(s);
        notify(me, s.otherOf(me), "coop_shadow_retreated", s.getId(), null);
        return toView(s);
    }

    // ── 内部 ─────────────────────────────────────────────

    private CoopShadow requireInvolving(String me, String id) {
        CoopShadow s = shadowMapper.selectById(id);
        if (s == null || !s.involves(me)) {
            throw new SocialException(HttpStatus.NOT_FOUND, "羁绊之影不存在");
        }
        return s;
    }

    private void assertStillBattling(CoopShadow s) {
        if ("defeated".equals(s.getStatus())) {
            throw new SocialException(HttpStatus.BAD_REQUEST, "这只羁绊之影已经被封印了，刷新看看结算");
        }
        if ("retreated".equals(s.getStatus())
                || (s.getExpiresAt() != null && !Instant.now().isBefore(Instant.parse(s.getExpiresAt())))) {
            throw new SocialException(HttpStatus.BAD_REQUEST, "这只羁绊之影已经撤退了");
        }
        if (!"active".equals(s.getStatus())) {
            throw new SocialException(HttpStatus.BAD_REQUEST, "这只羁绊之影已经不在战斗中");
        }
    }

    private static boolean defeated(CoopShadow s) { return "defeated".equals(s.getStatus()); }

    /** 血量 = max(0, hpMax - Σ damage_final)。日志是只追加的事实源。 */
    private int recomputeHp(int hpMax, String shadowId) {
        List<CoopAttack> rows = attackMapper.selectList(new QueryWrapper<CoopAttack>().eq("shadow_id", shadowId));
        int sum = 0;
        for (CoopAttack r : rows) sum += Math.max(0, r.getDamageFinal() == null ? 0 : r.getDamageFinal());
        return Math.max(0, hpMax - sum);
    }

    /** buff 推进：utility 延长（封顶 6），伤害类全体 -1 并清理 ≤0。 */
    @SuppressWarnings("unchecked")
    private Map<String, Object> advanceBuffs(String raw, String skillKind, boolean isUtility, boolean isDamaging) {
        Map<String, Object> cur = new HashMap<>();
        if (raw != null && !raw.isBlank()) {
            try { cur = json.readValue(raw, Map.class); } catch (Exception ignore) { }
        }
        if (isUtility) {
            String key = "buff".equals(skillKind) ? "attack_up" : "vulnerability";
            int existing = readTurns(cur.get(key));
            Map<String, Object> entry = new HashMap<>();
            entry.put("remainingTurns", Math.min(BUFF_DURATION_CAP, existing + BUFF_DURATION_INC));
            cur.put(key, entry);
            return cur;
        }
        if (isDamaging) {
            Map<String, Object> next = new HashMap<>();
            for (String key : new String[]{"attack_up", "vulnerability"}) {
                int t = readTurns(cur.get(key));
                if (t - 1 > 0) {
                    Map<String, Object> entry = new HashMap<>();
                    entry.put("remainingTurns", t - 1);
                    next.put(key, entry);
                }
            }
            return next;
        }
        return cur;
    }

    @SuppressWarnings("unchecked")
    private static int readTurns(Object entry) {
        if (entry instanceof Map<?, ?> m && m.get("remainingTurns") instanceof Number n) return n.intValue();
        return 0;
    }

    /** 纪念图章（对齐前端 buildMemorialStamp 形状；streak 由前端结算时补）。 */
    private Map<String, Object> buildMemorial(CoopShadow s, Instant now, String finisherId) {
        Map<String, Object> m = new HashMap<>();
        m.put("shadowId", s.getShadowId());
        m.put("shadowName", s.getNameOverride() != null && !s.getNameOverride().isBlank() ? s.getNameOverride() : "羁绊之影");
        m.put("weaknessAttribute", s.getWeaknessAttribute());
        m.put("defeatedAt", iso(now));
        List<Map<String, Object>> winners = new ArrayList<>();
        winners.add(Map.of("userId", s.getUserA(), "nickname", ""));
        winners.add(Map.of("userId", s.getUserB(), "nickname", ""));
        m.put("winners", winners);
        m.put("totalDamage", s.getHpMax());
        m.put("finisherId", finisherId);
        return m;
    }

    private void notify(String fromId, String receiver, String type, String shadowId, Map<String, Object> extra) {
        try {
            SocialNotification n = new SocialNotification();
            n.setId(newId());
            n.setReceiver(receiver);
            n.setType(type);
            Map<String, Object> payload = new HashMap<>();
            payload.put("shadow_id", shadowId);
            payload.put("from_id", fromId);
            try {
                User from = socialUserService.resolve(fromId);
                if (from != null) payload.put("from_name", from.getName());
            } catch (Exception ignore) { }
            if (extra != null) payload.putAll(extra);
            n.setPayload(json.writeValueAsString(payload));
            n.setReadFlag(0);
            n.setCreated(iso(Instant.now()));
            n.setUpdated(iso(Instant.now()));
            notificationMapper.insert(n);
        } catch (Exception e) {
            // 通知失败不阻断主流程
        }
    }

    /** CoopShadow → 前端形状（camelCase）。 */
    private Map<String, Object> toView(CoopShadow s) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", s.getId());
        m.put("bondId", s.getBondId());
        m.put("userAId", s.getUserA());
        m.put("userBId", s.getUserB());
        m.put("shadowId", s.getShadowId());
        m.put("nameOverride", s.getNameOverride());
        m.put("spawnedAt", s.getSpawnedAt());
        m.put("expiresAt", s.getExpiresAt());
        m.put("hpMax", s.getHpMax());
        m.put("hpCurrent", s.getHpCurrent());
        m.put("status", s.getStatus());
        m.put("weaknessAttribute", s.getWeaknessAttribute());
        m.put("resonanceUntil", s.getResonanceUntil());
        m.put("resonanceBy", s.getResonanceBy());
        m.put("comboCount", s.getComboCount());
        m.put("allOutByA", s.getAllOutByA() != null && s.getAllOutByA() != 0);
        m.put("allOutByB", s.getAllOutByB() != null && s.getAllOutByB() != 0);
        m.put("identifiedByA", s.getIdentifiedByA() != null && s.getIdentifiedByA() != 0);
        m.put("identifiedByB", s.getIdentifiedByB() != null && s.getIdentifiedByB() != 0);
        m.put("sharedBuffs", parseJsonOrEmpty(s.getSharedBuffs()));
        m.put("defeatedAt", s.getDefeatedAt());
        m.put("memorialStamp", s.getMemorialStamp() == null ? null : parseJsonOrEmpty(s.getMemorialStamp()));
        return m;
    }

    private Map<String, Object> toAttackView(CoopAttack a) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", a.getId());
        m.put("shadowId", a.getShadowId());
        m.put("attackerId", a.getAttacker());
        m.put("day", a.getDay());
        m.put("personaId", a.getPersonaId());
        m.put("personaName", a.getPersonaName());
        m.put("skillKind", a.getSkillKind());
        m.put("skillName", a.getSkillName());
        m.put("damageRaw", a.getDamageRaw());
        m.put("damageFinal", a.getDamageFinal());
        m.put("resonanceBonus", a.getResonanceBonus() != null && a.getResonanceBonus() != 0);
        m.put("weaknessBonus", a.getWeaknessBonus() != null && a.getWeaknessBonus() != 0);
        m.put("created", a.getCreated());
        return m;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseJsonOrEmpty(String raw) {
        if (raw == null || raw.isBlank()) return new HashMap<>();
        try { return json.readValue(raw, Map.class); } catch (Exception e) { return new HashMap<>(); }
    }

    private String writeJson(Object o) {
        try { return json.writeValueAsString(o); } catch (Exception e) { return null; }
    }

    // ── 小工具 ───────────────────────────────────────────

    private static Integer asInt(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.intValue();
        try { return Integer.valueOf(String.valueOf(v)); } catch (Exception e) { return null; }
    }

    private static int asIntOr0(Object v) { Integer i = asInt(v); return i == null ? 0 : i; }

    private static boolean asBool(Object v) {
        if (v instanceof Boolean b) return b;
        return "true".equalsIgnoreCase(String.valueOf(v));
    }

    private static String str(Object v) { return v == null ? null : String.valueOf(v); }

    private static String iso(Instant i) { return DateTimeFormatter.ISO_INSTANT.format(i); }

    private static String newId() {
        return Long.toHexString(System.currentTimeMillis()) + Long.toHexString((long) (Math.random() * 0xFFFFFFFFL));
    }
}
