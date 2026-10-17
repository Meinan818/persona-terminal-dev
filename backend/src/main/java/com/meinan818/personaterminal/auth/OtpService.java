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
        if (email == null || code == null) return false;
        Entry e = store.get(email);
        if (e == null || !Instant.now().isBefore(e.expiresAt())) return false;
        if (!e.code().equals(code.trim())) return false;
        // 只消费刚校验的同一份记录，避免并发成功两次或误删新发的验证码。
        return store.remove(email, e);
    }

    private void sendMail(String to, String code) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromUser);
            helper.setTo(to);
            helper.setSubject("预告函已送达 · MASKARIA 邮箱通行码");
            String plainText = """
                MASKARIA · CLOUD ACCESS
                预告函已送达

                致「一成不变的日常」：
                你以平凡之名，封锁客人的下一幕。
                这扇紧闭的门，现已被我等锁定。
                客人，以此暗号为凭——
                揭下面具，夺回你的可能性！

                潜入暗号（邮箱验证码）：%s

                验证码 %d 分钟后过期，请勿转发。
                如果不是你本人申请，可以忽略这封邮件。
                —— MASKARIA，参上！
                此邮件由系统自动发送，请勿回复。
                """.formatted(code, expireMillis / 60_000);
            String htmlText = """
                <div style="margin:0;padding:24px 10px;background:#090909;font-family:'Segoe UI','Microsoft YaHei',Arial,sans-serif;color:#050505;">
                  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="width:100%%;border-collapse:collapse;">
                    <tr><td align="center" style="padding:8px 0;">
                      <table role="presentation" width="520" cellspacing="0" cellpadding="0" border="0" style="width:100%%;max-width:520px;border:3px solid #f0e9df;background:#050505;">
                        <tr><td style="padding:12px 18px;background:#050505;color:#f8f8f6;border-bottom:3px solid #c00008;">
                          <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="width:100%%;border-collapse:collapse;">
                            <tr>
                              <td style="font-size:14px;font-weight:900;letter-spacing:3px;">MASKARIA</td>
                              <td align="right" style="font-size:10px;font-weight:700;letter-spacing:1px;">CLOUD · ACCESS</td>
                            </tr>
                          </table>
                        </td></tr>
                        <tr><td align="center" style="padding:26px 18px 22px;background-color:#c00008;background-image:repeating-radial-gradient(circle at 50%% 42%%,#050505 0 30px,#c00008 31px 60px);">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;">
                            <tr>
                              <td style="padding:7px 10px;background:#c00008;color:#f8f8f6;border:2px solid #f0e9df;font-size:30px;font-weight:900;transform:rotate(-8deg);">预</td>
                              <td width="5" style="width:5px;"></td>
                              <td style="padding:7px 10px;background:#050505;color:#f0e9df;border:2px solid #f0e9df;font-size:30px;font-weight:900;transform:rotate(4deg);">告</td>
                              <td width="5" style="width:5px;"></td>
                              <td style="padding:7px 10px;background:#c00008;color:#f8f8f6;border:2px solid #f0e9df;font-size:30px;font-weight:900;transform:rotate(-4deg);">函</td>
                            </tr>
                          </table>
                          <div style="padding-top:20px;">
                            %s
                            %s
                            %s
                            %s
                            %s
                            %s
                            %s
                            %s
                          </div>
                        </td></tr>
                        <tr><td align="center" style="padding:14px 18px 20px;background-color:#050505;background-image:radial-gradient(circle at center,#c00008 0 54px,#050505 55px 82px,#c00008 83px 112px,#050505 113px);">
                          <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="width:100%%;border-collapse:collapse;">
                            <tr><td align="center" style="padding:15px 8px;background:#f0e9df;border:3px solid #c00008;">
                              <p style="margin:0 0 5px;color:#6b6862;font-size:12px;font-weight:900;letter-spacing:1px;">潜入暗号 · 邮箱验证码</p>
                              <p style="margin:0;color:#050505;font-family:Consolas,monospace;font-size:36px;font-weight:900;letter-spacing:7px;">%s</p>
                            </td></tr>
                          </table>
                          <p style="margin:13px 0 0;color:#f0e9df;font-size:12px;font-weight:700;"><span style="padding:3px 6px;background:#050505;">有效期 %d 分钟 · 仅供本次验证</span></p>
                        </td></tr>
                        <tr><td style="padding:16px 20px;background:#f0e9df;border-top:2px solid #050505;">
                          %s
                          <p style="margin:0 0 7px;font-size:12px;font-weight:700;line-height:1.6;">请勿把验证码告诉任何人，也不要转发这封邮件。</p>
                          <p style="margin:0;color:#6b6862;font-size:11px;line-height:1.6;">若不是你本人申请，忽略本邮件即可；你的账号不会因此改变。</p>
                        </td></tr>
                      </table>
                      <p style="margin:14px 0 0;color:#9b9791;font-size:10px;line-height:1.5;">MASKARIA · 此邮件由系统自动发送，请勿回复。</p>
                    </td></tr>
                  </table>
                </div>
                """.formatted(
                    pastedLine("致一成不变的日常：", 12, -3, false),
                    pastedLine("你以平凡之名，", 24, 2, false),
                    pastedLine("封锁客人的下一幕。", 37, -2, false),
                    pastedLine("这扇紧闭的门，", 46, 2, false),
                    pastedLine("已被我等锁定。", 53, -2, false),
                    pastedLine("客人，以此暗号为凭——", 67, 1, false),
                    pastedLine("揭下面具，", 76, 2, true),
                    pastedLine("夺回你的可能性！", 91, -2, true),
                    code, expireMillis / 60_000,
                    pastedLine("MASKARIA，参上！", 115, -3, false));
            helper.setText(plainText, htmlText);
            mailSender.send(msg);
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(OtpService.class)
                    .error("[otp] SMTP 发送失败 to={} err={}", to, e.toString());
            throw new MailSendException("验证码邮件发送失败: " + e.getMessage(), e);
        }
    }

    /** 每个字单独剪贴；固定排布避免预告函在重绘时抖动。验证码仍使用连续的可复制文本。 */
    private static String pastedLine(String text, int seed, int tilt, boolean loud) {
        int[] angles = {-7, 4, -3, 6, -5, 2, -4, 5, -2, 7, -6};
        int[] offsets = {1, -2, 3, 0, -3, 2, -1, 4, -2};
        int[] scales = {112, 94, 102, 97, 108, 92, 104};
        var html = new StringBuilder("<p style=\"margin:6px 0 10px;line-height:2;text-align:center;font-size:18px;font-size:clamp(17px,5.4vw,27px);transform:rotate(")
                .append(tilt).append("deg);\">");
        int[] chars = text.codePoints().toArray();
        for (int i = 0; i < chars.length; i++) {
            int n = seed + i;
            boolean redPaper = i == 0 || (loud && i % 4 == 1);
            boolean lightPaper = !redPaper && n % 7 == 0;
            String face = redPaper ? "#c00008" : lightPaper ? "#f0e9df" : "#050505";
            String ink = lightPaper ? "#050505" : !redPaper && n % 4 == 0 ? "#ff454b" : "#f8f8f6";
            String ch = new String(Character.toChars(chars[i]));
            boolean punctuation = "，。：！「」—".contains(ch);
            String escaped = ch.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
            html.append("<span style=\"display:inline-block;vertical-align:middle;text-align:center;font-weight:900;line-height:1.4;border:1px solid #050505;box-shadow:0 0 0 1px #f0e9df,2px 3px 0 #050505;padding:0 1px;margin:3px 0;width:")
                    .append(punctuation ? "0.62em" : "1em")
                    .append(";background:").append(face).append(";color:").append(ink)
                    .append(";font-size:").append((punctuation ? 90 : scales[n % scales.length]) + (loud ? 8 : 0)).append("%;")
                    .append("transform:translateY(").append(offsets[n % offsets.length]).append("px) rotate(")
                    .append(angles[n % angles.length]).append("deg);\">")
                    .append(escaped).append("</span>");
        }
        return html.append("</p>").toString();
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
