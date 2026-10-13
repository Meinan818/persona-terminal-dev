package com.meinan818.personaterminal.user;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.UUID;
import java.util.function.Function;

/** 所有 UserID 写入口共用的格式与占用校验。数据库跨实例防重仍需存量核验后加约束。 */
public final class UserIdPolicy {
    private UserIdPolicy() {}

    public static String normalize(Object raw) {
        if (!(raw instanceof String text)) throw invalid();
        String name = text.trim().toLowerCase(Locale.ROOT);
        if (!name.matches("[a-z0-9][a-z0-9._-]{1,16}[a-z0-9]")) throw invalid();
        return name;
    }

    private static boolean taken(UserMapper mapper, String name, String selfId) {
        QueryWrapper<User> query = new QueryWrapper<User>().apply("LOWER(TRIM(name)) = {0}", name);
        if (selfId != null) query.ne("id", selfId);
        Long count = mapper.selectCount(query);
        if (count == null) throw new UserIdException(HttpStatus.SERVICE_UNAVAILABLE, "暂时无法校验 UserID，请重试");
        return count > 0;
    }

    public static <T> T write(UserMapper mapper, Object raw, String selfId, Function<String, T> save) {
        synchronized (mapper) {
            String name = normalize(raw);
            if (taken(mapper, name, selfId)) throw new UserIdException(HttpStatus.CONFLICT, "UserID 已被占用");
            return save.apply(name);
        }
    }

    public static <T> T create(UserMapper mapper, String requested, String email, Function<String, T> save) {
        synchronized (mapper) {
            if (requested != null) return write(mapper, requested, null, save);
            String candidate;
            try { candidate = normalize(email.split("@")[0]); } catch (UserIdException error) { candidate = null; }
            if (candidate != null && !taken(mapper, candidate, null)) return save.apply(candidate);
            for (int attempt = 0; attempt < 5; attempt++) {
                candidate = "u" + UUID.randomUUID().toString().replace("-", "").substring(0, 17);
                if (!taken(mapper, candidate, null)) return save.apply(candidate);
            }
            throw new UserIdException(HttpStatus.SERVICE_UNAVAILABLE, "暂时无法分配 UserID，请重试");
        }
    }

    private static UserIdException invalid() { return new UserIdException(HttpStatus.BAD_REQUEST, "UserID 应为 3-18 位小写字母/数字，首尾为字母数字，中间允许 ._-"); }

    public static final class UserIdException extends ResponseStatusException {
        public UserIdException(HttpStatus status, String message) { super(status, message); }
    }
}
