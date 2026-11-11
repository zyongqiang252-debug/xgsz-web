package com.cows.website;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.Objects;

/** Close the login/revocation race by checking the current account on each session request. */
final class WebsiteSessionGuard extends OncePerRequestFilter {
    private final JdbcTemplate db;
    WebsiteSessionGuard(JdbcTemplate db){this.db=db;}
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        var session=request.getSession(false);
        if(session!=null && session.getAttribute("website-username") instanceof String username) {
            var rows=db.queryForList("SELECT password FROM Admins WHERE userName=? AND isEnable=1 AND isDeleted=0",String.class,username);
            if(rows.size()!=1||!Objects.equals(rows.get(0),session.getAttribute("website-password-version"))) {
                session.invalidate();SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(request,response);
    }
}
