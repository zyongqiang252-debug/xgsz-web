package com.cows.website;

import com.cows.commons.api.BaseResponse;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;

@RestControllerAdvice
public class WebsiteErrors {
    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class) ResponseEntity<?> upload(Exception e){return ResponseEntity.status(413).body(BaseResponse.error(413,"请选择5MB以内的图片"));}
    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class) ResponseEntity<?> duplicate(Exception e){return ResponseEntity.status(409).body(BaseResponse.error(409,"名称重复或内容仍有关联记录，请检查后重试"));}
    @ExceptionHandler(ResponseStatusException.class) ResponseEntity<?> status(ResponseStatusException e){return ResponseEntity.status(e.getStatusCode()).body(BaseResponse.error(e.getStatusCode().value(),e.getReason()));}
    @ExceptionHandler({MethodArgumentNotValidException.class,HttpMessageNotReadableException.class,IllegalArgumentException.class}) ResponseEntity<?> input(Exception e){return ResponseEntity.badRequest().body(BaseResponse.error(400,"请检查必填信息、联系电话及字段长度"));}
}
