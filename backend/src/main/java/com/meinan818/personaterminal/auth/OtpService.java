package com.meinan818.personaterminal.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 邮箱验证码服务：生成、发送（SMTP）、校验。
 * 内存存储（单实例毕设够用）；重启即失效，无需持久化。
 */
@Service
public class OtpService {

    private final JavaMailSender mailSender;
    private final String fromUser;
    private final long expireMillis;
    private final long cooldownMillis;

    private record Entry(String code, Instant expiresAt, Instant nextAllowedAt) {}

    private final Map<String, Entry> store = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    public OtpService(JavaMailSender mailSender,
                      @Value("${spring.mail.username}") String fromUser,
                      @Value("${velvet.otp.expire-minutes:10}") long expireMinutes,
                      @Value("${velvet.otp.send-cooldown-seconds:60}") long cooldownSeconds) {
        this.mailSender = mailSender;
        this.fromUser = fromUser;
        this.expireMillis = expireMinutes * 60_000L;
        this.cooldownMillis = cooldownSeconds * 1000L;
    }

    /** 发送验证码。冷却期内抛 IllegalStateException（→ 429），SMTP 失败原样抛（→ 500） */
    public void send(String email) {
        Instant now = Instant.now();
        Entry old = store.get(email);
        if (old != null && now.isBefore(old.nextAllowedAt())) {
            long seconds = (old.nextAllowedAt().toEpochMilli() - now.toEpochMilli()) / 1000 + 1;
            throw new CooldownException(seconds);
        }
        String code = String.format("%06d", random.nextInt(1_000_000));
        sendMail(email, code);
        store.put(email, new Entry(code, now.plusMillis(expireMillis), now.plusMillis(cooldownMillis)));
    }

    /** 校验并消费验证码；不匹配/过期返回 false */
    public boolean verify(String email, String code) {
        Entry e = store.get(email);
        if (e == null || Instant.now().isAfter(e.expiresAt())) return false;
        if (!e.code().equals(code.trim())) return false;
        store.remove(email); // 一次性
        return true;
    }

    private void sendMail(String to, String code) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, false, "UTF-8");
            helper.setFrom(fromUser);
            helper.setTo(to);
            helper.setSubject("确认你的邮件地址 · 面具终端");
            helper.setText("""
                <div style="margin:0;padding:40px 0;background:#ffffff;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
                  <div style="max-width:420px;margin:0 auto;padding:0 24px;">
                    <div style="width:48px;height:48px;background:#000000;color:#ffffff;font-size:28px;font-weight:700;line-height:48px;text-align:center;margin-bottom:32px;">面</div>
                    <h1 style="font-size:22px;font-weight:700;color:#0f1419;margin:0 0 32px;">确认你的邮件地址</h1>
                    <p style="font-size:15px;color:#0f1419;margin:0 0 12px;">请输入此验证码以开始使用面具终端：</p>
                    <p style="font-size:40px;font-weight:800;color:#0f1419;letter-spacing:4px;margin:0 0 12px;">%s</p>
                    <p style="font-size:14px;color:#536471;margin:0 0 32px;">验证码 %d 分钟后过期。</p>
                    <p style="font-size:15px;color:#0f1419;margin:0 0 4px;">谢谢，</p>
                    <p style="font-size:15px;color:#0f1419;margin:0 0 48px;">面具终端</p>
                    <p style="font-size:13px;color:#536471;text-align:center;border-top:1px solid #eff3f4;padding-top:20px;">
                      <a href="#" style="color:#536471;text-decoration:none;">帮助</a> ｜
                      <a href="#" style="color:#536471;text-decoration:none;">电子邮件安全提示</a>
                    </p>
                    <p style="font-size:12px;color:#8899a6;text-align:center;margin-top:8px;">
                      Persona Terminal · 面具终端 · 此邮件由系统自动发送，请勿回复
                    </p>
                  </div>
                </div>
                """.formatted(code, expireMillis / 60_000), true);
            mailSender.send(msg);
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(OtpService.class)
                    .error("[otp] SMTP 发送失败 to={} err={}", to, e.toString());
            throw new MailSendException("验证码邮件发送失败: " + e.getMessage(), e);
        }
    }

    public static class CooldownException extends IllegalStateException {
        public final long retrySeconds;
        public CooldownException(long retrySeconds) {
            super("cooldown " + retrySeconds + "s");
            this.retrySeconds = retrySeconds;
        }
    }

    public static class MailSendException extends RuntimeException {
        public MailSendException(String m, Throwable c) { super(m, c); }
    }
}
