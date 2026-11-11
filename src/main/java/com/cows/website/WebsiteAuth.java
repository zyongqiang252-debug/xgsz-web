package com.cows.website;

import com.cows.commons.api.BaseResponse;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@RestController
@RequestMapping("/api/auth")
public class WebsiteAuth {
    private final JdbcTemplate db;private final PasswordEncoder encoder;private final TransactionTemplate tx;private final WebsiteThrottle throttle;private final WebsiteSessions sessions;
    public WebsiteAuth(JdbcTemplate db,PasswordEncoder encoder,TransactionTemplate tx,WebsiteThrottle throttle,WebsiteSessions sessions){this.db=db;this.encoder=encoder;this.tx=tx;this.throttle=throttle;this.sessions=sessions;}
    public record Credentials(@NotBlank @Pattern(regexp="[a-zA-Z0-9_-]{3,40}") String username,@NotBlank @Size(max=64) String password){}
    @GetMapping("/session") Object session(HttpServletRequest request,CsrfToken csrf){
        var auth=SecurityContextHolder.getContext().getAuthentication();boolean authenticated=auth!=null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal());
        return BaseResponse.success(Map.of("authenticated",authenticated,"username",authenticated?auth.getName():"","setupRequired",db.queryForObject("SELECT COUNT(*) FROM Admins WHERE isDeleted=0",Integer.class)==0,"csrf",csrf.getToken()));
    }
    @PostMapping("/setup") Object setup(@Valid @RequestBody Credentials input){
        if(input.password.length()<12 || input.password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"密码需为12至64个字符，且不超过72字节");
        if(db.queryForObject("SELECT COUNT(*) FROM Admins WHERE isDeleted=0",Integer.class)>0)throw new ResponseStatusException(HttpStatus.CONFLICT,"管理员已创建，请登录");
        try { tx.executeWithoutResult(status->{db.update("INSERT INTO site_metadata(name,content_value) VALUES('admin-created','true')");db.update("INSERT INTO Admins(userName,password,isEnable,isDeleted) VALUES(?,?,1,0)",input.username,encoder.encode(input.password));}); }
        catch(org.springframework.dao.DuplicateKeyException e){throw new ResponseStatusException(HttpStatus.CONFLICT,"管理员已创建，请登录");}
        return BaseResponse.success(Map.of("username",input.username));
    }
    @PostMapping("/login") Object login(@Valid @RequestBody Credentials input,HttpServletRequest request,HttpServletResponse response){
        throttle.check("login:"+request.getRemoteAddr(),20);
        var hashes=db.queryForList("SELECT password FROM Admins WHERE userName=? AND isEnable=1 AND isDeleted=0",String.class,input.username);
        String hash=hashes.isEmpty()?"$2a$10$ZsmwVktTDiA1R2z0sV4n8uNxZ6AMbgzlxdKLSdgx1VsbWLVwOHnCG":hashes.get(0);
        if(!encoder.matches(input.password,hash) || hashes.isEmpty())throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"账号或密码不正确");
        request.getSession();request.changeSessionId();
        var context=SecurityContextHolder.createEmptyContext();context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(input.username,null,List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
        SecurityContextHolder.setContext(context);new HttpSessionSecurityContextRepository().saveContext(context,request,response);
        sessions.add(input.username,request.getSession());
        request.getSession().setAttribute("website-password-version",hash);
        return BaseResponse.success(Map.of("username",input.username));
    }
    @PostMapping("/logout") Object logout(HttpServletRequest request,HttpServletResponse response){
        var session=request.getSession(false);if(session!=null){var auth=SecurityContextHolder.getContext().getAuthentication();if(auth!=null)sessions.remove(auth.getName(),session);session.invalidate();}SecurityContextHolder.clearContext();
        Cookie cookie=new Cookie("JSESSIONID","");cookie.setHttpOnly(true);cookie.setPath("/");cookie.setMaxAge(0);cookie.setAttribute("SameSite","Strict");response.addCookie(cookie);
        return BaseResponse.success();
    }
}
