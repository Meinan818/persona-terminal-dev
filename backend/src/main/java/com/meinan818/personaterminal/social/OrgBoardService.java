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
 * 公告板服务（社交迁移 W3 第五波 第二步）。镜像前端 {@code src/services/orgs.ts} 的公告板部分。
 *
 * <p>契约逐字对齐前端：
 *  · 动态（org_posts）：moment（分享）/ minutes（会议纪要，id 前端确定）/ operation（达成卡，id 前端确定）
 *  · 标签（org_reactions）：(post,user) 唯一；再点同一个 = 撤，点别的 = 换
 *  · 举报（org_reports）：(post_id,reporter) 唯一；重复举报静默忽略
 *  · 越权（非成员）→ 404
 *
 * <p>minutes / op-card 用前端确定的 id：撞了 = 另一台设备已发 → 返回 null（调用方重拉）。
 * 屏蔽词 / 截断 / 快照清洗仍是前端纯逻辑，后端只落库 + 唯一索引兜底。
 */
@Service
@RequiredArgsConstructor
public class OrgBoardService {

    /** 默认拉最近 30 天、最多 100 条动态（对齐前端 ORG_BOARD_DAYS / ORG_BOARD_LIMIT） */
    private static final int BOARD_DAYS = 30;
    private static final int BOARD_LIMIT = 100;

    private static final ObjectMapper JSON = new ObjectMapper();

    private final OrgMapper orgMapper;
    private final OrgMemberMapper memberMapper;
    private final OrgPostMapper postMapper;
    private final OrgReactionMapper reactionMapper;
    private final OrgReportMapper reportMapper;

    // ── 读 ────────────────────────────────────────────────

    /** 最近 30 天最多 100 条动态（新在前）+ 这些动态上的标签。 */
    public Map<String, Object> board(String me, String orgId) {
        requireMember(me, orgId);
        String since = sinceIso(BOARD_DAYS);
        List<OrgPostRow> posts = postMapper.selectList(new QueryWrapper<OrgPostRow>()
                .eq("org", orgId).ge("created", since).orderByDesc("created").last("LIMIT " + BOARD_LIMIT));
        List<OrgReactionRow> reactions = reactionMapper.selectList(new QueryWrapper<OrgReactionRow>()
                .eq("org", orgId).ge("created", since));
        List<Map<String, Object>> postViews = new ArrayList<>(posts.size());
        for (OrgPostRow p : posts) postViews.add(toPostView(p));
        List<Map<String, Object>> reactionViews = new ArrayList<>(reactions.size());
        for (OrgReactionRow r : reactions) reactionViews.add(toReactionView(r));
        Map<String, Object> out = new HashMap<>();
        out.put("posts", postViews);
        out.put("reactions", reactionViews);
        return out;
    }

    /** 据点经验的来源：全部纪要与作战达成卡（不限 30 天）。 */
    public List<Map<String, Object>> ledger(String me, String orgId) {
        requireMember(me, orgId);
        List<OrgPostRow> rows = postMapper.selectList(new QueryWrapper<OrgPostRow>()
                .eq("org", orgId).in("kind", "minutes", "operation").orderByAsc("created"));
        List<Map<String, Object>> out = new ArrayList<>(rows.size());
        for (OrgPostRow p : rows) out.add(toPostView(p));
        return out;
    }

    // ── 写 ───────────────────────────────────────────────

    /** 分享一条动态。 */
    public Map<String, Object> createMoment(String me, String orgId, Map<String, Object> in) {
        requireMember(me, orgId);
        OrgPostRow p = new OrgPostRow();
        p.setId(newId());
        p.setOrg(orgId);
        p.setUser(me);
        p.setKind("moment");
        p.setText(nz(str(in.get("text"))));
        p.setSnapshot(writeJsonOrNull(in.get("snapshot")));
        p.setWeekKey("");
        p.setCreated(iso(Instant.now()));
        postMapper.insert(p);
        return toPostView(p);
    }

    /**
     * 贴 / 换 / 撤标签。再点自己贴的那个 = 撤；点别的 = 换。
     * 两台设备同时贴会撞 (post,user) 唯一 —— 撞了就读回已有那条，改成这次选的。
     */
    public Map<String, Object> setReaction(String me, String orgId, String postId, String tag) {
        requireMember(me, orgId);
        OrgReactionRow existing = reactionMapper.selectOne(new QueryWrapper<OrgReactionRow>()
                .eq("post", postId).eq("user", me).last("LIMIT 1"));
        if (existing != null && tag != null && tag.equals(existing.getTag())) {
            reactionMapper.deleteById(existing.getId());
            return null;   // 撤
        }
        if (existing != null) {
            existing.setTag(tag);
            existing.setUpdated(iso(Instant.now()));
            reactionMapper.updateById(existing);
            return toReactionView(existing);
        }
        OrgReactionRow r = new OrgReactionRow();
        r.setId(newId());
        r.setPost(postId);
        r.setOrg(orgId);
        r.setUser(me);
        r.setTag(tag);
        r.setCreated(iso(Instant.now()));
        r.setUpdated(r.getCreated());
        try {
            reactionMapper.insert(r);
            return toReactionView(r);
        } catch (DuplicateKeyException e) {
            // 撞唯一键（另一台设备刚贴）→ 读回已有改成这次选的
            OrgReactionRow cur = reactionMapper.selectOne(new QueryWrapper<OrgReactionRow>()
                    .eq("post", postId).eq("user", me).last("LIMIT 1"));
            if (cur == null) return null;
            cur.setTag(tag);
            cur.setUpdated(iso(Instant.now()));
            reactionMapper.updateById(cur);
            return toReactionView(cur);
        }
    }

    /** 删动态（自己的，或队长删任何一条）；标签跟着级联删。 */
    public void deletePost(String me, String postId) {
        OrgPostRow p = postMapper.selectById(postId);
        if (p == null) return;   // 已经不在了
        // 归属校验：自己发的，或该组织队长
        boolean mine = me.equals(p.getUser());
        if (!mine) {
            Org org = orgMapper.selectById(p.getOrg());
            if (org == null || !me.equals(org.getLeader())) {
                throw new SocialException(HttpStatus.NOT_FOUND, "找不到这条动态");
            }
        }
        reactionMapper.delete(new QueryWrapper<OrgReactionRow>().eq("post", postId));
        postMapper.deleteById(postId);
    }

    /** 举报一条动态：带原话副本。同一条举报过就静默忽略。 */
    public void report(String me, Map<String, Object> in) {
        String postId = str(in.get("postId"));
        String orgId = str(in.get("orgId"));
        String targetUser = str(in.get("targetUserId"));
        String reason = str(in.get("reason"));
        String textCopy = str(in.get("textCopy"));
        if (postId == null || orgId == null) throw new SocialException(HttpStatus.BAD_REQUEST, "参数缺失");
        if (textCopy != null && textCopy.length() > 60) textCopy = textCopy.substring(0, 60);
        OrgReportRow r = new OrgReportRow();
        r.setId(newId());
        r.setPostId(postId);
        r.setOrgId(orgId);
        r.setTargetUser(nz(targetUser));
        r.setReporter(me);
        r.setReason(nz(reason));
        r.setTextCopy(nz(textCopy));
        r.setCreated(iso(Instant.now()));
        try {
            reportMapper.insert(r);
        } catch (DuplicateKeyException e) {
            // 已经举报过：静默忽略
        }
    }

    /** 发纪要：用前端确定的 id；撞了（id 已存在）= 另一台设备已发 → 返回 null。 */
    public Map<String, Object> createMinutes(String me, String orgId, Map<String, Object> in) {
        requireMember(me, orgId);
        String id = str(in.get("id"));
        if (id == null || id.isBlank()) throw new SocialException(HttpStatus.BAD_REQUEST, "缺少 id");
        if (postMapper.selectById(id) != null) return null;
        OrgPostRow p = new OrgPostRow();
        p.setId(id);
        p.setOrg(orgId);
        p.setUser(me);
        p.setKind("minutes");
        p.setText("");
        p.setSnapshot(writeJsonOrNull(in.get("snapshot")));
        p.setWeekKey(nz(str(in.get("weekKey"))));
        p.setCreated(iso(Instant.now()));
        try {
            postMapper.insert(p);
        } catch (DuplicateKeyException e) {
            return null;
        }
        return toPostView(p);
    }

    /** 发作战达成卡：用前端确定的 id；撞了 → 返回 null。 */
    public Map<String, Object> createOpCard(String me, String orgId, Map<String, Object> in) {
        requireMember(me, orgId);
        String id = str(in.get("id"));
        if (id == null || id.isBlank()) throw new SocialException(HttpStatus.BAD_REQUEST, "缺少 id");
        if (postMapper.selectById(id) != null) return null;
        OrgPostRow p = new OrgPostRow();
        p.setId(id);
        p.setOrg(orgId);
        p.setUser(me);
        p.setKind("operation");
        p.setText("");
        p.setSnapshot(writeJsonOrNull(in.get("snapshot")));
        p.setWeekKey(nz(str(in.get("weekKey"))));
        p.setCreated(iso(Instant.now()));
        try {
            postMapper.insert(p);
        } catch (DuplicateKeyException e) {
            return null;
        }
        return toPostView(p);
    }

    /** 删掉某人在这个组织的动态和标签（退出时删自己的；请离时队长删对方的）。尽力而为。 */
    public void deleteUserContent(String me, String orgId, String userId) {
        // 只有本人或该组织队长能删
        boolean self = me.equals(userId);
        if (!self) {
            Org org = orgMapper.selectById(orgId);
            if (org == null || !me.equals(org.getLeader())) {
                throw new SocialException(HttpStatus.NOT_FOUND, "找不到这个组织了");
            }
        }
        List<OrgReactionRow> reactions = reactionMapper.selectList(new QueryWrapper<OrgReactionRow>()
                .eq("org", orgId).eq("user", userId));
        for (OrgReactionRow r : reactions) {
            try { reactionMapper.deleteById(r.getId()); } catch (Exception ignore) { }
        }
        List<OrgPostRow> posts = postMapper.selectList(new QueryWrapper<OrgPostRow>()
                .eq("org", orgId).eq("user", userId).eq("kind", "moment"));
        for (OrgPostRow p : posts) {
            try { postMapper.deleteById(p.getId()); } catch (Exception ignore) { }
        }
    }

    // ── 内部 ─────────────────────────────────────────────

    private void requireMember(String me, String orgId) {
        long n = memberMapper.selectCount(new QueryWrapper<OrgMember>().eq("org", orgId).eq("user", me));
        if (n == 0) throw new SocialException(HttpStatus.NOT_FOUND, "找不到这个组织了，可能已经解散");
    }

    private Map<String, Object> toPostView(OrgPostRow p) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", p.getId());
        m.put("orgId", p.getOrg());
        m.put("userId", p.getUser());
        m.put("kind", p.getKind());
        m.put("text", nz(p.getText()));
        m.put("snapshot", parseJsonOrNull(p.getSnapshot()));
        m.put("weekKey", p.getWeekKey() == null || p.getWeekKey().isBlank() ? null : p.getWeekKey());
        m.put("createdAt", p.getCreated());
        return m;
    }

    private Map<String, Object> toReactionView(OrgReactionRow r) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", r.getId());
        m.put("postId", r.getPost());
        m.put("orgId", r.getOrg());
        m.put("userId", r.getUser());
        m.put("tag", r.getTag());
        m.put("createdAt", r.getCreated());
        m.put("updatedAt", r.getUpdated());
        return m;
    }

    private static String sinceIso(int days) {
        return DateTimeFormatter.ISO_INSTANT.format(Instant.now().minusSeconds((long) days * 86400));
    }

    private static String str(Object v) { return v == null ? null : String.valueOf(v); }

    private static String nz(String v) { return v == null ? "" : v; }

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
