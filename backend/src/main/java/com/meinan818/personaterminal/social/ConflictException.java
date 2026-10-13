package com.meinan818.personaterminal.social;

import org.springframework.http.HttpStatus;

/**
 * 带业务 code 的冲突异常（HTTP 409）。
 *
 * <p>用于「每日限速」这类需要前端按 code 分派的冲突——迁后端后不再依赖
 * PB 的 `err.message.includes('unique')` 字符串匹配（见 HANDOFF §三十一 契约锁 §3）。
 * 响应体：{@code {"message": <逐字文案>, "code": <业务码>}}。
 */
public class ConflictException extends RuntimeException {
    private final String code;

    public ConflictException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() { return code; }
    public HttpStatus getStatus() { return HttpStatus.CONFLICT; }
}
