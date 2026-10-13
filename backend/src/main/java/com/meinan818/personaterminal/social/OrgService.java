package com.meinan818.personaterminal.social;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.meinan818.personaterminal.user.User;
import com.meinan818.personaterminal.user.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 组织核心服务（社交迁移 W3 第五波 第一步）。镜像前端 {@code src/services/orgs.ts} 的语义。
 *
 * <p>契约逐字对齐前端：
 *  · leader 唯一 —— 每人最多建一个组织；invite_code 唯一 —— 邀请码不重复
 *  · (org,user) 唯一 / (user,slot) 唯一 / (org,seat) 唯一 —— 座位 1–7，最多 7 人
 *  · 越权（非成员 / 非队长）→ 404（与不存在不可区分，避免资源探测，同 coopShadows）
 *
 * <p>设计决策：PB 时代靠「字段级唯一错误码」在前端做多步写入重试（joinOrg 从座位 1
 * 试到 7、createOrg/rotateInviteCode 撞码换一个）。迁移后这些循环**收敛到服务端**
 * ——前端一次请求拿结果。注意这类循环不能用单个 @Transactional 包（捕获唯一冲突后
 * 继续会触发 rollback-only），改为逐次自动提交 + 补偿删除。
 *
 * <p>屏蔽词 / 长度校验 / 卡片计算仍是前端纯逻辑（分流前已做），后端只做落库 +
 * 唯一索引兜底 + 队长身份校验。
 */
@Service
@RequiredArgsConstructor
public class OrgService {

    /** 邀请码字符表（去掉易混的 0/O/1/I），与前端 orgLogic.INVITE_ALPHABET 逐字一致 */
    private static final String INVITE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final int INVITE_LEN = 8;
    private static final int MAX_SEATS = 7;
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final ObjectMapper JSON = new ObjectMapper();

    private final OrgMapper orgMapper;
    private final OrgMemberMapper memberMapper;
    private final UserMapper userMapper;

    // ── 读 ────────────────────────────────────────────────

    /** 我的全部成员行 + 所属组织。没有 = 空列表（不返回 null，前端自己区分「一个都没有」）。 */
    public List<Map<String, Object>> listMine(String me) {
        List<OrgMember> rows = memberMapper.selectList(
                new QueryWrapper<OrgMember>().eq("user", me).orderByAsc("created"));
        List<Map<String, Object>> out = new ArrayList<>(rows.size());
        Map<String, String> avatars = avatarMap(userIds(rows));
        for (OrgMember m : rows) {
            Org o = orgMapper.selectById(m.getOrg());
            if (o == null) continue; // 组织已解散但成员行残留：跳过
            Map<String, Object> item = new HashMap<>();
            item.put("member", toMemberView(m, avatars));
            item.put("org", toOrgView(o));
            out.add(item);
        }
        return out;
    }

    /** 某组织的全体成员（按座位）。非成员 → 404。 */
    public List<Map<String, Object>> members(String me, String orgId) {
        requireMember(me, orgId);
        List<OrgMember> rows = memberMapper.selectList(
                new QueryWrapper<OrgMember>().eq("org", orgId).orderByAsc("seat"));
        Map<String, String> avatars = avatarMap(userIds(rows));
        List<Map<String, Object>> out = new ArrayList<>(rows.size());
        for (OrgMember m : rows) out.add(toMemberView(m, avatars));
        return out;
    }

    /** 单个组织。非成员 → 404。 */
    public Map<String, Object> fetch(String me, String orgId) {
        requireMember(me, orgId);
        Org o = orgMapper.selectById(orgId);
        if (o == null) throw new SocialException(HttpStatus.NOT_FOUND, "找不到这个组织了，可能已经解散");
        return toOrgView(o);
    }

    /** 凭邀请码看一眼（加入前预览）。码不对 / 换了新码 → null。 */
    public Map<String, Object> preview(String me, String code) {
        if (code == null || !code.matches("^[2-9A-HJ-NP-Z]{8}$")) {
            throw new SocialException(HttpStatus.BAD_REQUEST, "邀请码是 8 位字母和数字");
        }
        Org o = orgMapper.selectOne(new QueryWrapper<Org>().eq("invite_code", code).last("LIMIT 1"));
        return o == null ? null : toOrgView(o);
    }

    // ── 建立 / 加入 ───────────────────────────────────────

    /** 建立组织：先建组织（队长 = 我），再建我的成员行（1 号座位）；第二步失败删掉组织。 */
    public Map<String, Object> create(String me, Map<String, Object> in) {
        String name = str(in.get("name"));
        if (name == null || name.isBlank()) throw new SocialException(HttpStatus.BAD_REQUEST, "给组织起个名字");
        // 每人最多建一个：leader 唯一索引兜底，先给出友好文案
        if (orgMapper.selectCount(new QueryWrapper<Org>().eq("leader", me)) > 0) {
            throw new SocialException(HttpStatus.BAD_REQUEST, "你已经建过一个组织了（每人最多建一个）");
        }

        Org org = new Org();
        org.setId(newId());
        org.setName(name);
        org.setMotto(nz(str(in.get("motto"))));
        org.setEmblem(nz(str(in.get("emblem")), "star"));
        org.setLeader(me);
        org.setTz(nz(str(in.get("tz")), "UTC"));
        org.setCreated(iso(Instant.now()));
        org.setUpdated(org.getCreated());

        // 撞码重试（极少）；撞 leader 唯一 → 已建过
        boolean inserted = false;
        for (int i = 0; i < 3 && !inserted; i++) {
            org.setInviteCode(genInviteCode());
            try {
                orgMapper.insert(org);
                inserted = true;
            } catch (DuplicateKeyException e) {
                if (isUnique(e, "uk_org_leader")) throw new SocialException(HttpStatus.BAD_REQUEST, "你已经建过一个组织了（每人最多建一个）");
                // 其余（invite_code 撞码）换一个再来
            }
        }
        if (!inserted) throw new SocialException(HttpStatus.INTERNAL_SERVER_ERROR, "组织没建成，稍后再试");

        try {
            OrgMember m = newMember(org.getId(), me, "own", 1, "", nz(str(in.get("codename")), "队长"));
            memberMapper.insert(m);
            Map<String, Object> res = new HashMap<>();
            res.put("org", toOrgView(org));
            res.put("member", toMemberView(m, avatarMap(List.of(me))));
            return res;
        } catch (DuplicateKeyException e) {
            try { orgMapper.deleteById(org.getId()); } catch (Exception ignore) { }
            if (isUnique(e, "uk_member_user_slot")) throw new SocialException(HttpStatus.BAD_REQUEST, "你已经建过一个组织了（每人最多建一个）");
            throw new SocialException(HttpStatus.INTERNAL_SERVER_ERROR, "组织没建成，稍后再试");
        }
    }

    /** 凭码加入：从 1 号座位往后试，撞了换下一个；7 个都满就进不去。逐次自动提交（见类注释）。 */
    public Map<String, Object> join(String me, Map<String, Object> in) {
        String code = str(in.get("code"));
        if (code == null || !code.matches("^[2-9A-HJ-NP-Z]{8}$")) {
            throw new SocialException(HttpStatus.BAD_REQUEST, "邀请码是 8 位字母和数字");
        }
        // 每人最多加入一个
        if (memberMapper.selectCount(new QueryWrapper<OrgMember>().eq("user", me).eq("slot", "joined")) > 0) {
            throw new SocialException(HttpStatus.BAD_REQUEST, "你已经加入了一个组织（每人最多加入一个）");
        }
        Org org = orgMapper.selectOne(new QueryWrapper<Org>().eq("invite_code", code).last("LIMIT 1"));
        if (org == null) throw new SocialException(HttpStatus.BAD_REQUEST, "邀请码不对，或者组织已经换了新码");
        if (org.getLeader().equals(me)) throw new SocialException(HttpStatus.BAD_REQUEST, "你已经在这个组织里了");
        if (memberMapper.selectCount(new QueryWrapper<OrgMember>().eq("org", org.getId()).eq("user", me)) > 0) {
            throw new SocialException(HttpStatus.BAD_REQUEST, "你已经在这个组织里了");
        }

        for (int seat = 1; seat <= MAX_SEATS; seat++) {
            OrgMember m = newMember(org.getId(), me, "joined", seat, code, nz(str(in.get("codename")), "新成员"));
            try {
                memberMapper.insert(m);
                Map<String, Object> res = new HashMap<>();
                res.put("org", toOrgView(org));
                res.put("member", toMemberView(m, avatarMap(List.of(me))));
                return res;
            } catch (DuplicateKeyException e) {
                if (isUnique(e, "uk_member_user_slot")) throw new SocialException(HttpStatus.BAD_REQUEST, "你已经加入了一个组织（每人最多加入一个）");
                if (isUnique(e, "uk_member_org_user")) throw new SocialException(HttpStatus.BAD_REQUEST, "你已经在这个组织里了");
                // 撞座位 → 换下一个座位继续
            }
        }
        throw new SocialException(HttpStatus.BAD_REQUEST, "这个组织已经满 7 人了");
    }

    // ── 改 ───────────────────────────────────────────────

    /** 队长改组织资料。 */
    public Map<String, Object> updateProfile(String me, String orgId, Map<String, Object> in) {
        Org org = requireLeader(me, orgId, "只有队长能改");
        String name = str(in.get("name"));
        if (name != null && !name.isBlank()) org.setName(name);
        if (in.containsKey("motto")) org.setMotto(nz(str(in.get("motto"))));
        String emblem = str(in.get("emblem"));
        if (emblem != null && !emblem.isBlank()) org.setEmblem(emblem);
        org.setUpdated(iso(Instant.now()));
        orgMapper.updateById(org);
        return toOrgView(org);
    }

    /** 队长改自定义（等级名字 / 称号改名 / 自定义称号）。传 null 表示清空。 */
    public Map<String, Object> updateCustom(String me, String orgId, Map<String, Object> in) {
        Org org = requireLeader(me, orgId, "只有队长能改");
        Object custom = in.get("custom");
        if (custom == null) {
            org.setCustom(null);
        } else {
            try {
                org.setCustom(JSON.writeValueAsString(custom));
            } catch (Exception e) {
                throw new SocialException(HttpStatus.BAD_REQUEST, "没存上，稍后再试");
            }
        }
        org.setUpdated(iso(Instant.now()));
        orgMapper.updateById(org);
        return toOrgView(org);
    }

    /** 队长换邀请码（旧码立即作废）。 */
    public Map<String, Object> rotate(String me, String orgId) {
        Org org = requireLeader(me, orgId, "只有队长能改");
        for (int i = 0; i < 3; i++) {
            org.setInviteCode(genInviteCode());
            org.setUpdated(iso(Instant.now()));
            try {
                orgMapper.updateById(org);
                return toOrgView(org);
            } catch (DuplicateKeyException e) {
                // 撞码：换一个再来
            }
        }
        throw new SocialException(HttpStatus.INTERNAL_SERVER_ERROR, "没换成，稍后再试");
    }

    /** 改自己那一行（代号 / 代表牌 / 成员牌 / 会议目标）。只允许改自己的行。 */
    public Map<String, Object> updateMember(String me, String memberId, Map<String, Object> patch) {
        OrgMember m = memberMapper.selectById(memberId);
        if (m == null || !m.getUser().equals(me)) {
            throw new SocialException(HttpStatus.NOT_FOUND, "找不到这条成员记录");
        }
        if (patch.containsKey("codename")) {
            String c = str(patch.get("codename"));
            if (c == null || c.isBlank()) throw new SocialException(HttpStatus.BAD_REQUEST, "代号不能空着");
            m.setCodename(c);
        }
        if (patch.containsKey("codenameKind")) m.setCodenameKind(nz(str(patch.get("codenameKind")), "nickname"));
        if (patch.containsKey("tarotId")) m.setTarotId(str(patch.get("tarotId")));
        if (patch.containsKey("card")) m.setCard(writeJsonOrNull(patch.get("card")));
        // 会议目标（saveMeeting）
        if (patch.containsKey("goal")) m.setGoal(str(patch.get("goal")));
        if (patch.containsKey("goalWeek")) m.setGoalWeek(str(patch.get("goalWeek")));
        if (patch.containsKey("result")) m.setResult(str(patch.get("result")));
        if (patch.containsKey("resultWeek")) m.setResultWeek(str(patch.get("resultWeek")));
        m.setUpdated(iso(Instant.now()));
        memberMapper.updateById(m);
        return toMemberView(m, avatarMap(List.of(me)));
    }

    /** 位置校正：只改 slot 一个字段。 */
    public Map<String, Object> setSlot(String me, String memberId, String slot) {
        OrgMember m = memberMapper.selectById(memberId);
        if (m == null || !m.getUser().equals(me)) {
            throw new SocialException(HttpStatus.NOT_FOUND, "找不到这条成员记录");
        }
        m.setSlot("own".equals(slot) ? "own" : "joined");
        m.setUpdated(iso(Instant.now()));
        memberMapper.updateById(m);
        return toMemberView(m, avatarMap(List.of(me)));
    }

    // ── 退出 / 请离 / 转让 / 解散 ─────────────────────────

    /** 退出组织（队长不能直接退）。 */
    public void leave(String me, String orgId) {
        Org org = orgMapper.selectById(orgId);
        if (org != null && org.getLeader().equals(me)) {
            throw new SocialException(HttpStatus.BAD_REQUEST, "队长要先把队长转让出去，或者解散组织");
        }
        OrgMember m = myRow(me, orgId);
        if (m != null) memberMapper.deleteById(m.getId());
    }

    /** 队长请离一位成员；随后自动换码。换码失败不算请离失败（rotated=null，界面提示手动换）。 */
    public Map<String, Object> kick(String me, String orgId, String memberId) {
        Org org = requireLeader(me, orgId, "只有队长能请离成员");
        OrgMember target = memberMapper.selectById(memberId);
        if (target == null || !target.getOrg().equals(orgId) || target.getUser().equals(me)) {
            throw new SocialException(HttpStatus.BAD_REQUEST, "不能请离自己");
        }
        memberMapper.deleteById(memberId);
        Map<String, Object> res = new HashMap<>();
        try {
            res.put("rotated", rotate(me, orgId));
        } catch (Exception e) {
            res.put("rotated", null);
        }
        return res;
    }

    /** 转让队长：先改组织队长（对方已是别处队长 → 唯一索引挡住）；再把我的行改成「加入」或退出。 */
    public void transfer(String me, String orgId, String toMemberId, boolean alsoLeave) {
        Org org = requireLeader(me, orgId, "只有队长能转让");
        OrgMember target = memberMapper.selectById(toMemberId);
        if (target == null || !target.getOrg().equals(orgId) || target.getUser().equals(me)) {
            throw new SocialException(HttpStatus.BAD_REQUEST, "选一位成员");
        }
        try {
            org.setLeader(target.getUser());
            org.setUpdated(iso(Instant.now()));
            orgMapper.updateById(org);
        } catch (DuplicateKeyException e) {
            throw new SocialException(HttpStatus.BAD_REQUEST, "对方已经是另一个组织的队长了，没法再接手");
        }
        // 转让之后我已经不是队长：能失败的检查都在上一步之前。这一步没成也不要紧，下次对账校正。
        try {
            OrgMember mineRow = myRow(me, orgId);
            if (mineRow != null) {
                if (alsoLeave) memberMapper.deleteById(mineRow.getId());
                else { mineRow.setSlot("joined"); mineRow.setUpdated(iso(Instant.now())); memberMapper.updateById(mineRow); }
            }
        } catch (Exception ignore) { }
    }

    /** 队长解散：删组织，成员行级联删除。 */
    public void dissolve(String me, String orgId) {
        requireLeader(me, orgId, "只有队长能解散组织");
        memberMapper.delete(new QueryWrapper<OrgMember>().eq("org", orgId));
        orgMapper.deleteById(orgId);
    }

    // ── 内部 ─────────────────────────────────────────────

    private OrgMember myRow(String me, String orgId) {
        return memberMapper.selectOne(new QueryWrapper<OrgMember>().eq("org", orgId).eq("user", me).last("LIMIT 1"));
    }

    /** 必须是该组织成员，否则 404。 */
    private void requireMember(String me, String orgId) {
        if (myRow(me, orgId) == null) {
            throw new SocialException(HttpStatus.NOT_FOUND, "找不到这个组织了，可能已经解散");
        }
    }

    /** 必须是该组织队长，否则 404。 */
    private Org requireLeader(String me, String orgId, String fallback) {
        Org org = orgMapper.selectById(orgId);
        if (org == null) throw new SocialException(HttpStatus.NOT_FOUND, fallback);
        if (!org.getLeader().equals(me)) throw new SocialException(HttpStatus.NOT_FOUND, fallback);
        return org;
    }

    private OrgMember newMember(String orgId, String userId, String slot, int seat, String code, String codename) {
        Instant now = Instant.now();
        OrgMember m = new OrgMember();
        m.setId(newId());
        m.setOrg(orgId);
        m.setUser(userId);
        m.setSlot(slot);
        m.setSeat(seat);
        m.setCode(code);
        m.setCodename(codename);
        m.setCodenameKind("nickname");
        m.setCreated(iso(now));
        m.setUpdated(iso(now));
        return m;
    }

    private List<String> userIds(List<OrgMember> rows) {
        List<String> ids = new ArrayList<>(rows.size());
        for (OrgMember m : rows) if (m.getUser() != null) ids.add(m.getUser());
        return ids;
    }

    /** 批量取头像（users.avatar 本身就是 /api/avatar/{id} 地址）。 */
    private Map<String, String> avatarMap(List<String> userIds) {
        Map<String, String> out = new HashMap<>();
        if (userIds.isEmpty()) return out;
        List<User> users = userMapper.selectBatchIds(userIds);
        for (User u : users) {
            String a = u.getAvatar();
            if (a != null && !a.isBlank()) out.put(u.getId(), a);
        }
        return out;
    }

    private Map<String, Object> toOrgView(Org o) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", o.getId());
        m.put("name", o.getName());
        m.put("motto", nz(o.getMotto()));
        m.put("emblem", nz(o.getEmblem(), "star"));
        m.put("leaderId", o.getLeader());
        m.put("inviteCode", o.getInviteCode());
        m.put("tz", nz(o.getTz(), "UTC"));
        m.put("custom", parseJsonOrNull(o.getCustom()));
        m.put("createdAt", o.getCreated());
        m.put("updatedAt", o.getUpdated());
        return m;
    }

    private Map<String, Object> toMemberView(OrgMember m, Map<String, String> avatars) {
        Map<String, Object> r = new HashMap<>();
        r.put("id", m.getId());
        r.put("orgId", m.getOrg());
        r.put("userId", m.getUser());
        r.put("slot", "own".equals(m.getSlot()) ? "own" : "joined");
        r.put("seat", m.getSeat() == null ? 0 : m.getSeat());
        r.put("codename", nz(m.getCodename()));
        r.put("codenameKind", nz(m.getCodenameKind(), "nickname"));
        r.put("tarotId", m.getTarotId());
        r.put("avatarUrl", avatars.get(m.getUser()));
        r.put("card", parseJsonOrNull(m.getCard()));
        r.put("goal", m.getGoal());
        r.put("goalWeek", m.getGoalWeek());
        r.put("result", m.getResult());
        r.put("resultWeek", m.getResultWeek());
        r.put("createdAt", m.getCreated());
        r.put("updatedAt", m.getUpdated());
        return r;
    }

    // ── 小工具 ───────────────────────────────────────────

    private static boolean isUnique(DuplicateKeyException e, String keyName) {
        String msg = String.valueOf(e.getMessage());
        return msg.contains(keyName);
    }

    private static String genInviteCode() {
        StringBuilder sb = new StringBuilder(INVITE_LEN);
        for (int i = 0; i < INVITE_LEN; i++) sb.append(INVITE_ALPHABET.charAt(RANDOM.nextInt(INVITE_ALPHABET.length())));
        return sb.toString();
    }

    private static String str(Object v) { return v == null ? null : String.valueOf(v); }

    private static String nz(String v) { return v == null ? "" : v; }

    private static String nz(String v, String dflt) { return (v == null || v.isBlank()) ? dflt : v; }

    private static String iso(Instant i) { return DateTimeFormatter.ISO_INSTANT.format(i); }

    private static String writeJsonOrNull(Object o) {
        if (o == null) return null;
        try { return JSON.writeValueAsString(o); } catch (Exception e) { return null; }
    }

    private static Object parseJsonOrNull(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try { return JSON.readValue(raw, Object.class); } catch (Exception e) { return null; }
    }

    private static String newId() {
        return Long.toHexString(System.currentTimeMillis()) + Long.toHexString((long) (Math.random() * 0xFFFFFFFFL));
    }
}
