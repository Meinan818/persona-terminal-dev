package com.meinan818.personaterminal.social;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * 社交域异常 → 直接写 ResponseEntity。
 *
 * 为什么不用 ResponseStatusException：它经 ResponseStatusExceptionResolver 处理后走
 * response.sendError()，触发 Tomcat error dispatch 到 /error——该 forward 会重走
 * security filter 链，authenticationEntryPoint 抢先输出 401 覆盖原 404（实测踩坑，
 * 见 HANDOFF §十六）。ResponseEntity 由 resolver 直接提交，不进 error dispatch。
 */
@RestControllerAdvice
public class SocialApiExceptionHandler {

    @ExceptionHandler(SocialException.class)
    public ResponseEntity<Map<String, Object>> handle(SocialException e) {
        return ResponseEntity.status(e.getStatus()).body(Map.of("message", e.getMessage()));
    }

    /** 带业务 code 的 409（每日限速等）——前端按 code 分派，不靠字符串匹配。 */
    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<Map<String, Object>> handleConflict(ConflictException e) {
        return ResponseEntity.status(e.getStatus()).body(Map.of("message", e.getMessage(), "code", e.getCode()));
    }
}
