package com.meinan818.personaterminal.auth;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.meinan818.personaterminal.user.User;
import com.meinan818.personaterminal.user.UserMapper;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 邮件重置密码（自研后端）。
 *
 * <p>此前这条链路仍挂在 PocketBase 上：自研账号点「忘记密码」拿不到任何邮件，
 * 一旦忘记密码就永久进不去。这里补齐：按身份（邮箱或 UserID）发一封带一次性令牌的邮件，
 * 用户点链接回来设置新密码。
 *
 * <p>三条与安全有关的取舍：
 * · **不泄露账号是否存在**：身份查不到也返回成功，只是不发信；
 * · **只存摘要**：库里保存的是令牌的 SHA-256（表见 V13 迁移），库被读走也拿不到可用令牌；
 *   令牌本身落库、不再留在进程内存里——否则每次重启后端，用户手里还没点开的邮件链接就白发了；
 * · **一次性**：用「删除行数」保证同一个令牌并发提交只有一次成功（与 OTP 消费同款做法）。
 *
 * <p>改密成功即让旧会话失效——JWT 里带的是密码哈希摘要（credentialVersion），
 * 改密后旧 token 自然对不上（见 JwtAuthFilter）。
 */
@Service
public class PasswordResetService {

    private final UserMapper users;
    private final PasswordResetTokenMapper tokens;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;
    private final String fromUser;
    private final String publicUrl;
    private final long expireMillis;
    private final long cooldownMillis;

    /** 规范化身份 → 下次允许发送的时刻 */
    private final Map<String, Instant> cooldown = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    public PasswordResetService(UserMapper users,
                                PasswordResetTokenMapper tokens,
                                PasswordEncoder passwordEncoder,
                                JavaMailSender mailSender,
                                @Value("${spring.mail.username}") String fromUser,
                                @Value("${app.public-url:http://localhost:5173}") String publicUrl,
                                @Value("${velvet.reset.expire-minutes:30}") long expireMinutes,
                                @Value("${velvet.reset.send-cooldown-seconds:60}") long cooldownSeconds) {
        this.users = users;
        this.tokens = tokens;
        this.passwordEncoder = passwordEncoder;
        this.mailSender = mailSender;
        this.fromUser = fromUser;
        this.publicUrl = publicUrl == null ? "" : publicUrl.replaceAll("/+$", "");
        this.expireMillis = expireMinutes * 60_000L;
        this.cooldownMillis = cooldownSeconds * 1000L;
    }

    /** 受理一次重置申请。身份不存在时**静默返回**（不泄露账号是否存在）。 */
    public void request(String rawIdentity) {
        String identity = normalize(rawIdentity);
        Instant now = Instant.now();
        Instant allowedAt = cooldown.get(identity);
        if (allowedAt != null && now.isBefore(allowedAt)) {
            long seconds = (allowedAt.toEpochMilli() - now.toEpochMilli()) / 1000 + 1;
            throw new CooldownException(seconds);
        }
        User user = findByIdentity(identity);
        if (user == null) {
            // 不存在的身份也占一次冷却，避免"能不能发信"成为探测手段
            cooldown.put(identity, now.plusMillis(cooldownMillis));
            return;
        }
        byte[] raw = new byte[32];
        random.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        // 先清掉这一位用户还没用的旧令牌，以及表里已经过期的行，免得表随时间无限长
        tokens.delete(new QueryWrapper<PasswordResetToken>().eq("user_id", user.getId()));
        tokens.delete(new QueryWrapper<PasswordResetToken>().lt("expires_at", iso(now)));
        PasswordResetToken row = new PasswordResetToken();
        row.setDigest(hash(token));
        row.setUserId(user.getId());
        row.setCreated(iso(now));
        row.setExpiresAt(iso(now.plusMillis(expireMillis)));
        tokens.insert(row);
        sendMail(user.getEmail(), token);
        cooldown.put(identity, now.plusMillis(cooldownMillis));
    }

    /**
     * 用令牌设置新密码，返回被改密的用户 id。
     * 令牌不存在 / 过期 → InvalidTokenException（调用方回 401，不区分是哪种）。
     */
    public String reset(String rawToken, String newPassword) {
        if (rawToken == null || rawToken.isBlank()) throw new InvalidTokenException();
        String key = hash(rawToken.trim());
        PasswordResetToken row = tokens.selectById(key);
        if (row == null || !Instant.now().isBefore(parseInstant(row.getExpiresAt()))) {
            if (row != null) tokens.deleteById(key);
            throw new InvalidTokenException();
        }
        // 一次性：并发提交同一令牌时只有一个请求能删到那一行，其余拿到 0 行
        if (tokens.deleteById(key) == 0) throw new InvalidTokenException();
        User user = users.selectById(row.getUserId());
        if (user == null) throw new InvalidTokenException();
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setUpdated(DateTimeFormatter.ISO_INSTANT.format(Instant.now()));
        users.updateById(user);
        return user.getId();
    }

    /** 邮箱或 UserID（users.name）都能作为身份，忽略大小写与首尾空白 */
    private User findByIdentity(String identity) {
        User byEmail = users.selectOne(new QueryWrapper<User>()
                .apply("LOWER(TRIM(email)) = {0}", identity).last("LIMIT 1"));
        if (byEmail != null) return byEmail;
        return users.selectOne(new QueryWrapper<User>()
                .apply("LOWER(TRIM(name)) = {0}", identity).last("LIMIT 1"));
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private static String hash(String token) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception error) {
            throw new IllegalStateException(error);
        }
    }

    /** ISO-8601 时刻串（与 users.created / updated 同口径） */
    private static String iso(Instant instant) {
        return DateTimeFormatter.ISO_INSTANT.format(instant);
    }

    /** 解析库里的失效时刻；脏数据一律按已过期处理 */
    private static Instant parseInstant(String value) {
        try {
            return Instant.parse(value);
        } catch (RuntimeException malformed) {
            return Instant.EPOCH;
        }
    }

    private void sendMail(String to, String token) {
        String link = publicUrl + "/reset-password?token=" + token;
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, false, "UTF-8");
            helper.setFrom(fromUser);
            helper.setTo(to);
            helper.setSubject("重置你的密码 · MASKARIA");
            helper.setText("""
                <div style="margin:0;padding:40px 0;background:#ffffff;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
                  <div style="max-width:420px;margin:0 auto;padding:0 24px;">
                    <div style="width:48px;height:48px;background:#000000;color:#ffffff;font-size:28px;font-weight:700;line-height:48px;text-align:center;margin-bottom:32px;">M</div>
                    <h1 style="font-size:22px;font-weight:700;color:#0f1419;margin:0 0 32px;">重置你的密码</h1>
                    <p style="font-size:15px;color:#0f1419;margin:0 0 12px;">点击下面的按钮设置新密码。如果这不是你本人操作的，忽略这封邮件即可，密码不会改变。</p>
                    <p style="margin:0 0 12px;"><a href="%s" style="display:inline-block;padding:12px 24px;background:#000000;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">设置新密码</a></p>
                    <p style="font-size:13px;color:#536471;margin:0 0 32px;">链接 %d 分钟内有效，且只能用一次。</p>
                    <p style="font-size:12px;color:#8899a6;text-align:center;margin-top:8px;">
                      MASKARIA · 此邮件由系统自动发送，请勿回复
                    </p>
                  </div>
                </div>
                """.formatted(link, expireMillis / 60_000), true);
            mailSender.send(msg);
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(PasswordResetService.class)
                    .error("[reset] SMTP 发送失败 to={} err={}", to, e.toString());
            throw new MailSendException("重置邮件发送失败: " + e.getMessage(), e);
        }
    }

    public static class CooldownException extends IllegalStateException {
        public final long retrySeconds;
        public CooldownException(long retrySeconds) {
            super("cooldown " + retrySeconds + "s");
            this.retrySeconds = retrySeconds;
        }
    }

    public static class InvalidTokenException extends RuntimeException {
        public InvalidTokenException() { super("重置链接无效或已过期"); }
    }

    public static class MailSendException extends RuntimeException {
        public MailSendException(String m, Throwable c) { super(m, c); }
    }
}
