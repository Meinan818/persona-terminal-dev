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
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 作战服务（社交迁移 W3 第五波 第三步）。镜像前端 {@code src/services/orgs.ts} 的作战部分。
 *
 * <p>契约逐字对齐前端：
 *  · listOrgOps：最近 62 天建的作战 + 它们的打卡
 *  · createOperation：big 作战只有队长能发；initiator = 我
 *  · cancelOperation：发起人或队长；status → cancelled
 *  · createCheckin：(operation,user,kind) 唯一 —— 撞了读回已有那条；
 *    作战已取消 / 我不在名单里 → 返回 null（调用方按「不用再写了」处理）
 *  · deleteCheckin：已没了也算成功
 *  · 越权（非成员）→ 404
 *
 * <p>屏蔽词 / 长度截断 / 草稿校验仍是前端纯逻辑；后端只落库 + 唯一索引兜底 + 权限校验。
 */
@Service
@RequiredArgsConstructor
public class OrgOpService {

    private static final int FETCH_DAYS = 62;

    private static final ObjectMapper JSON = new ObjectMapper();

    private final OrgMapper orgMapper;
    private final OrgMemberMapper memberMapper;
    private final OrgOperationMapper opMapper;
    private final OrgCheckinMapper checkinMapper;

    // ── 读 ────────────────────────────────────────────────

    public Map<String, Object> listOps(String me, String orgId) {
        requireMember(me, orgId);
        String since = sinceIso(FETCH_DAYS);
        List<OrgOperationRow> ops = opMapper.selectList(new QueryWrapper<OrgOperationRow>()
                .eq("org", orgId).ge("created", since).orderByAsc("created"));
        List<OrgCheckinRow> checkins = checkinMapper.selectList(new QueryWrapper<OrgCheckinRow>()
                .eq("org", orgId).ge("created", since));
        List<Map<String, Object>> opViews = new ArrayList<>(ops.size());
        for (OrgOperationRow o : ops) opViews.add(toOpView(o));
        List<Map<String, Object>> checkinViews = new ArrayList<>(checkins.size());
        for (OrgCheckinRow c : checkins) checkinViews.add(toCheckinView(c));
        Map<String, Object> out = new HashMap<>();
        out.put("ops", opViews);
        out.put("checkins", checkinViews);
        return out;
    }

    // ── 写 ───────────────────────────────────────────────

    /** 发起作战。big 只有队长能发。 */
    public Map<String, Object> create(String me, String orgId, Map<String, Object> in) {
        requireMember(me, orgId);
        String kind = "big".equals(str(in.get("kind"))) ? "big" : "small";
        if ("big".equals(kind)) {
            Org org = orgMapper.selectById(orgId);
            if (org == null || !me.equals(org.getLeader())) {
                throw new SocialException(HttpStatus.BAD_REQUEST, "只有队长能发作战");
            }
        }
        OrgOperationRow o = new OrgOperationRow();
        o.setId(newId());
        o.setOrg(orgId);
        o.setInitiator(me);
        o.setKind(kind);
        o.setAttr(nz(str(in.get("attr")), "knowledge"));
        o.setTitle(nz(str(in.get("title"))));
        o.setDeadline(nz(str(in.get("deadline"))));
        o.setParticipants(writeJsonOrNull(in.get("participants") == null ? List.of() : in.get("participants")));
        // assignments 只对 big 存
        o.setAssignments("big".equals(kind) ? writeJsonOrNull(in.get("assignments") == null ? Map.of() : in.get("assignments")) : "{}");
        o.setStatus("active");
        o.setCreated(iso(Instant.now()));
        o.setUpdated(o.getCreated());
        opMapper.insert(o);
        return toOpView(o);
    }

    /** 取消作战（发起人或队长）。 */
    public Map<String, Object> cancel(String me, String opId) {
        OrgOperationRow o = opMapper.selectById(opId);
        if (o == null) throw new SocialException(HttpStatus.NOT_FOUND, "只有发起人或队长能取消");
        boolean allowed = me.equals(o.getInitiator());
        if (!allowed) {
            Org org = orgMapper.selectById(o.getOrg());
            allowed = org != null && me.equals(org.getLeader());
        }
        if (!allowed) throw new SocialException(HttpStatus.NOT_FOUND, "只有发起人或队长能取消");
        o.setStatus("cancelled");
        o.setUpdated(iso(Instant.now()));
        opMapper.updateById(o);
        return toOpView(o);
    }

    /**
     * 写一条打卡（done/out/plan）。(operation,user,kind) 唯一 —— 撞了读回已有那条。
     * 作战已取消 / 我不在名单里 → 返回 null。
     */
    public Map<String, Object> createCheckin(String me, String opId, String kind, String day, String text) {
        OrgOperationRow op = opMapper.selectById(opId);
        if (op == null) throw new SocialException(HttpStatus.NOT_FOUND, "找不到这次作战了");
        requireMember(me, op.getOrg());
        if (!"active".equals(op.getStatus())) return null;         // 已取消：不用再写了
        List<String> participants = idList(parseJson(op.getParticipants()));
        if (!participants.isEmpty() && !participants.contains(me)) return null;  // 不在名单里

        OrgCheckinRow c = new OrgCheckinRow();
        c.setId(newId());
        c.setOperation(opId);
        c.setOrg(op.getOrg());
        c.setUser(me);
        c.setKind("out".equals(kind) ? "out" : "plan".equals(kind) ? "plan" : "done");
        c.setDay(nz(day));
        c.setText(nz(text));
        c.setCreated(iso(Instant.now()));
        try {
            checkinMapper.insert(c);
            return toCheckinView(c);
        } catch (DuplicateKeyException e) {
            OrgCheckinRow cur = checkinMapper.selectOne(new QueryWrapper<OrgCheckinRow>()
                    .eq("operation", opId).eq("user", me).eq("kind", c.getKind()).last("LIMIT 1"));
            return cur == null ? null : toCheckinView(cur);
        }
    }

    /** 删自己的一条（撤销完成 / 改写那一份）；已经没了也算成功。 */
    public void deleteCheckin(String me, String id) {
        OrgCheckinRow c = checkinMapper.selectById(id);
        if (c == null) return;
        // 只能删自己的
        if (!me.equals(c.getUser())) throw new SocialException(HttpStatus.NOT_FOUND, "找不到这条记录");
        checkinMapper.deleteById(id);
    }

    // ── 内部 ─────────────────────────────────────────────

    private void requireMember(String me, String orgId) {
        long n = memberMapper.selectCount(new QueryWrapper<OrgMember>().eq("org", orgId).eq("user", me));
        if (n == 0) throw new SocialException(HttpStatus.NOT_FOUND, "找不到这个组织了，可能已经解散");
    }

    private Map<String, Object> toOpView(OrgOperationRow o) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", o.getId());
        m.put("orgId", o.getOrg());
        m.put("initiatorId", o.getInitiator());
        m.put("kind", "big".equals(o.getKind()) ? "big" : "small");
        m.put("attr", nz(o.getAttr(), "knowledge"));
        m.put("title", nz(o.getTitle()));
        m.put("deadline", nz(o.getDeadline()));
        m.put("participants", idList(parseJson(o.getParticipants())));
        m.put("assignments", strMap(parseJson(o.getAssignments())));
        m.put("status", "cancelled".equals(o.getStatus()) ? "cancelled" : "active");
        m.put("createdAt", o.getCreated());
        m.put("updatedAt", o.getUpdated());
        return m;
    }

    private Map<String, Object> toCheckinView(OrgCheckinRow c) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", c.getId());
        m.put("operationId", c.getOperation());
        m.put("orgId", c.getOrg());
        m.put("userId", c.getUser());
        m.put("kind", "out".equals(c.getKind()) ? "out" : "plan".equals(c.getKind()) ? "plan" : "done");
        m.put("day", nz(c.getDay()));
        m.put("text", nz(c.getText()));
        m.put("createdAt", c.getCreated());
        return m;
    }

    @SuppressWarnings("unchecked")
    private static List<String> idList(Object v) {
        List<String> out = new ArrayList<>();
        if (v instanceof Collection<?> col) {
            for (Object x : col) if (x != null) out.add(String.valueOf(x));
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, String> strMap(Object v) {
        Map<String, String> out = new HashMap<>();
        if (v instanceof Map<?, ?> map) {
            for (Map.Entry<?, ?> e : map.entrySet()) {
                if (e.getValue() instanceof String s && !s.isBlank()) out.put(String.valueOf(e.getKey()), s);
            }
        }
        return out;
    }

    private static String sinceIso(int days) {
        return DateTimeFormatter.ISO_INSTANT.format(Instant.now().minusSeconds((long) days * 86400));
    }

    private static String str(Object v) { return v == null ? null : String.valueOf(v); }

    private static String nz(String v) { return v == null ? "" : v; }

    private static String nz(String v, String dflt) { return (v == null || v.isBlank()) ? dflt : v; }

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
