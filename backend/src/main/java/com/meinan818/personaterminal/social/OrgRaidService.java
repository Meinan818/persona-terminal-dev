package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
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
 * 满月团战服务（社交迁移 W3 第五波 第四步）。镜像前端 {@code src/services/orgs.ts} 的团战部分。
 *
 * <p>契约逐字对齐前端：
 *  · createRaid：id 由前端确定（第一个打开据点的成员开团）；撞 (org,slot) 唯一 → 读回已有那场
 *  · createRaidHit：(raid,user,night) 唯一 → 撞了读回已有那条且 dup=true
 *  · 越权（非成员）→ 404
 */
@Service
@RequiredArgsConstructor
public class OrgRaidService {

    private static final ObjectMapper JSON = new ObjectMapper();

    private final OrgMapper orgMapper;
    private final OrgMemberMapper memberMapper;
    private final OrgRaidMapper raidMapper;
    private final OrgRaidHitMapper hitMapper;

    // ── 读 ────────────────────────────────────────────────

    public Map<String, Object> list(String me, String orgId) {
        requireMember(me, orgId);
        List<OrgRaidRow> raids = raidMapper.selectList(new QueryWrapper<OrgRaidRow>()
                .eq("org", orgId).orderByAsc("slot"));
        List<OrgRaidHitRow> hits = hitMapper.selectList(new QueryWrapper<OrgRaidHitRow>()
                .eq("org", orgId).orderByAsc("created"));
        List<Map<String, Object>> raidViews = new ArrayList<>(raids.size());
        for (OrgRaidRow r : raids) raidViews.add(toRaidView(r));
        List<Map<String, Object>> hitViews = new ArrayList<>(hits.size());
        for (OrgRaidHitRow h : hits) hitViews.add(toHitView(h));
        Map<String, Object> out = new HashMap<>();
        out.put("raids", raidViews);
        out.put("hits", hitViews);
        return out;
    }

    // ── 写 ───────────────────────────────────────────────

    /** 开团（确定 id）；撞 (org,slot) → 读回已有那场。 */
    public Map<String, Object> createRaid(String me, String orgId, String id, int slot, Map<String, Object> boss, int hpMax) {
        requireMember(me, orgId);
        if (id == null || id.isBlank()) throw new SocialException(HttpStatus.BAD_REQUEST, "缺少 id");
        OrgRaidRow r = new OrgRaidRow();
        r.setId(id);
        r.setOrg(orgId);
        r.setSlot(slot);
        r.setBoss(writeJsonOrNull(boss));
        r.setHpMax(hpMax);
        r.setCreated(iso(Instant.now()));
        try {
            raidMapper.insert(r);
            return toRaidView(r);
        } catch (DuplicateKeyException e) {
            // 别人刚开过同一场：读回已有的
            OrgRaidRow cur = raidMapper.selectOne(new QueryWrapper<OrgRaidRow>()
                    .eq("org", orgId).eq("slot", slot).last("LIMIT 1"));
            if (cur != null) return toRaidView(cur);
            throw new SocialException(HttpStatus.INTERNAL_SERVER_ERROR, "没开成，稍后再试");
        }
    }

    /**
     * 出手（strike / allout）。(raid,user,night) 唯一 → 撞了读回已有那条且 dup=true。
     * 返回 {hit, dup}。
     */
    public Map<String, Object> createHit(String me, String raidId, String kind, String night, String attr, String skill, int damage, boolean weak) {
        OrgRaidRow raid = raidMapper.selectById(raidId);
        if (raid == null) throw new SocialException(HttpStatus.NOT_FOUND, "找不到这场团战了");
        requireMember(me, raid.getOrg());

        OrgRaidHitRow h = new OrgRaidHitRow();
        h.setId(newId());
        h.setRaid(raidId);
        h.setOrg(raid.getOrg());
        h.setUser(me);
        h.setKind("allout".equals(kind) ? "allout" : "strike");
        h.setNight(nz(night));
        h.setAttr(attr);
        h.setSkill(nz(skill));
        h.setDamage(damage);
        h.setWeak(weak ? 1 : 0);
        h.setCreated(iso(Instant.now()));
        Map<String, Object> out = new HashMap<>();
        try {
            hitMapper.insert(h);
            out.put("hit", toHitView(h));
            out.put("dup", false);
            return out;
        } catch (DuplicateKeyException e) {
            OrgRaidHitRow cur = hitMapper.selectOne(new QueryWrapper<OrgRaidHitRow>()
                    .eq("raid", raidId).eq("user", me).eq("night", nz(night)).last("LIMIT 1"));
            if (cur == null) throw new SocialException(HttpStatus.INTERNAL_SERVER_ERROR, "没出手成功，稍后再试");
            out.put("hit", toHitView(cur));
            out.put("dup", true);
            return out;
        }
    }

    // ── 内部 ─────────────────────────────────────────────

    private void requireMember(String me, String orgId) {
        long n = memberMapper.selectCount(new QueryWrapper<OrgMember>().eq("org", orgId).eq("user", me));
        if (n == 0) throw new SocialException(HttpStatus.NOT_FOUND, "找不到这个组织了，可能已经解散");
    }

    private Map<String, Object> toRaidView(OrgRaidRow r) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", r.getId());
        m.put("orgId", r.getOrg());
        m.put("slot", r.getSlot());
        m.put("boss", parseJson(r.getBoss()));
        m.put("hpMax", r.getHpMax());
        m.put("createdAt", r.getCreated());
        return m;
    }

    private Map<String, Object> toHitView(OrgRaidHitRow h) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", h.getId());
        m.put("raidId", h.getRaid());
        m.put("orgId", h.getOrg());
        m.put("userId", h.getUser());
        m.put("kind", "allout".equals(h.getKind()) ? "allout" : "strike");
        m.put("night", nz(h.getNight()));
        m.put("attr", h.getAttr());
        m.put("skill", nz(h.getSkill()));
        m.put("damage", h.getDamage() == null ? 0 : h.getDamage());
        m.put("weak", h.getWeak() != null && h.getWeak() != 0);
        m.put("createdAt", h.getCreated());
        return m;
    }

    private static String nz(String v) { return v == null ? "" : v; }

    private static String iso(Instant i) { return DateTimeFormatter.ISO_INSTANT.format(i); }

    private static String writeJsonOrNull(Object o) {
        if (o == null) return null;
        try { return JSON.writeValueAsString(o); } catch (Exception e) { return null; }
    }

    private Object parseJson(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try { return JSON.readValue(raw, Object.class); } catch (Exception e) { return null; }
    }

    private static String newId() {
        return Long.toHexString(System.currentTimeMillis()) + Long.toHexString((long) (Math.random() * 0xFFFFFFFFL));
    }
}
