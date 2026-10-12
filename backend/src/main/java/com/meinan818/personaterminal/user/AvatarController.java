package com.meinan818.personaterminal.user;

import com.meinan818.personaterminal.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.Map;

/**
 * 头像文件存取（JWT 保护，读取除外）。
 *
 *   POST   /api/avatar            上传/替换当前用户头像（multipart，字段名 file）
 *   GET    /api/avatar/{userId}   读取指定用户头像字节（**公开**——好友资料卡要能加载）
 *   DELETE /api/avatar            清空当前用户头像
 *
 * 存储：服务器本地磁盘 `{app.upload-dir}/avatars/{userId}.{ext}`，同名覆盖。
 * 为什么不存数据库：图片是二进制大对象，塞进 MySQL 会拖慢查询、撑大备份；
 * 磁盘存文件、库里只留可访问路径，是这类场景的常规做法。
 *
 * 之所以要这套接口：迁移到自研后端后，前端此前用的 PocketBase 文件接口失效，
 * 头像"上传到云端"这条链路整段不通（见 sync.ts 的旧守卫）。本控制器补齐它。
 */
@RestController
@RequiredArgsConstructor
public class AvatarController {

    private final UserMapper userMapper;

    /** 上传根目录，可用 application.yml 的 app.upload-dir 覆盖 */
    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    private static final long MAX_BYTES = 2 * 1024 * 1024; // 2MB（前端压到 ~80KB，留足余量）

    /** 允许的图片类型 → 落盘扩展名 */
    private static String extOf(String contentType) {
        if (contentType == null) return null;
        String ct = contentType.toLowerCase();
        if (ct.equals("image/jpeg") || ct.equals("image/jpg")) return "jpg";
        if (ct.equals("image/png")) return "png";
        if (ct.equals("image/webp")) return "webp";
        if (ct.equals("image/gif")) return "gif";
        return null;
    }

    private Path avatarPath(String userId, String ext) {
        return Paths.get(uploadDir, "avatars", userId + "." + ext);
    }

    /** 在 avatars 目录里找该用户的头像文件（扩展名不定，返回第一个命中的） */
    private Path findAvatar(String userId) {
        Path dir = Paths.get(uploadDir, "avatars");
        if (!Files.isDirectory(dir)) return null;
        for (String ext : new String[]{"jpg", "png", "webp", "gif"}) {
            Path p = dir.resolve(userId + "." + ext);
            if (Files.isRegularFile(p)) return p;
        }
        return null;
    }

    @PostMapping("/api/avatar")
    public ResponseEntity<?> uploadAvatar(@RequestParam("file") MultipartFile file) {
        String userId = currentUserId();
        if (userId == null) return unauthorized();

        if (file == null || file.isEmpty()) {
            return badRequest("文件为空");
        }
        if (file.getSize() > MAX_BYTES) {
            return badRequest("文件过大（上限 2MB）");
        }
        String ext = extOf(file.getContentType());
        if (ext == null) {
            return badRequest("只支持图片文件（jpg / png / webp / gif）");
        }
        // 内容魔数兜底：Content-Type 可伪造，至少排掉明显的非图片
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            return badRequest("读取文件失败");
        }
        if (!looksLikeImage(bytes)) {
            return badRequest("文件内容不是有效图片");
        }

        Path dir = Paths.get(uploadDir, "avatars");
        try {
            Files.createDirectories(dir);
            // 换扩展名时清掉旧文件，避免 jpg/png 两份共存
            for (String e : new String[]{"jpg", "png", "webp", "gif"}) {
                if (!e.equals(ext)) Files.deleteIfExists(dir.resolve(userId + "." + e));
            }
            Files.write(avatarPath(userId, ext), bytes);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("velvet", "write_failed"));
        }

        // 库里只存可访问路径（头像本体在磁盘）
        User u = userMapper.selectById(userId);
        if (u == null) return unauthorized();
        String url = "/api/avatar/" + userId;
        u.setAvatar(url);
        u.setUpdated(DateTimeFormatter.ISO_INSTANT.format(Instant.now()));
        userMapper.updateById(u);

        return ResponseEntity.ok(Map.of("avatar", url, "size", bytes.length));
    }

    @GetMapping("/api/avatar/{userId}")
    public ResponseEntity<byte[]> getAvatar(@PathVariable String userId) {
        Path p = findAvatar(userId);
        if (p == null) return ResponseEntity.notFound().build();
        try {
            byte[] bytes = Files.readAllBytes(p);
            String name = p.getFileName().toString();
            String ct = name.endsWith(".png") ? "image/png"
                    : name.endsWith(".webp") ? "image/webp"
                    : name.endsWith(".gif") ? "image/gif"
                    : "image/jpeg";
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(ct))
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=300")
                    .body(bytes);
        } catch (IOException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/api/avatar")
    public ResponseEntity<?> clearAvatar() {
        String userId = currentUserId();
        if (userId == null) return unauthorized();

        Path dir = Paths.get(uploadDir, "avatars");
        try {
            for (String e : new String[]{"jpg", "png", "webp", "gif"}) {
                Files.deleteIfExists(dir.resolve(userId + "." + e));
            }
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("velvet", "delete_failed"));
        }

        User u = userMapper.selectById(userId);
        if (u != null) {
            u.setAvatar(null);
            u.setUpdated(DateTimeFormatter.ISO_INSTANT.format(Instant.now()));
            userMapper.updateById(u);
        }
        return ResponseEntity.noContent().build();
    }

    /** 图片魔数识别：JPEG(FFD8FF) / PNG(89504E47) / GIF(474946) / WEBP(RIFF....WEBP) */
    private static boolean looksLikeImage(byte[] b) {
        if (b == null || b.length < 4) return false;
        int b0 = b[0] & 0xFF, b1 = b[1] & 0xFF, b2 = b[2] & 0xFF, b3 = b[3] & 0xFF;
        if (b0 == 0xFF && b1 == 0xD8 && b2 == 0xFF) return true;             // JPEG
        if (b0 == 0x89 && b1 == 0x50 && b2 == 0x4E && b3 == 0x47) return true; // PNG
        if (b0 == 0x47 && b1 == 0x49 && b2 == 0x46) return true;             // GIF
        if (b.length >= 12
                && b0 == 0x52 && b1 == 0x49 && b2 == 0x46 && b3 == 0x46
                && b[8] == 0x57 && b[9] == 0x45 && b[10] == 0x42 && b[11] == 0x50) return true; // WEBP
        return false;
    }

    private String currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof JwtAuthFilter.UserIdPrincipal p)) {
            return null;
        }
        return p.userId();
    }

    private static ResponseEntity<?> unauthorized() {
        return ResponseEntity.status(401).body(Map.of("velvet", "not_found"));
    }

    private static ResponseEntity<?> badRequest(String message) {
        return ResponseEntity.badRequest().body(Map.of("velvet", "bad_request", "message", message));
    }
}
