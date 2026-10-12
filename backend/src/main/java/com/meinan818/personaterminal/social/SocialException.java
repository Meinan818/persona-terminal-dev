package com.meinan818.personaterminal.social;

import org.springframework.http.HttpStatus;

/** 社交域业务异常：带 HTTP 状态码，由 SocialApiExceptionHandler 直接写 ResponseEntity 响应。 */
public class SocialException extends RuntimeException {
    private final HttpStatus status;

    public SocialException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() { return status; }
}
