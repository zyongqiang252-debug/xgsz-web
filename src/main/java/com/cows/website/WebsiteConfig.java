package com.cows.website;

import com.cows.mapper.ProductMapper;
import com.cows.serviceImpl.ProductServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.ibatis.session.SqlSessionFactory;
import org.mybatis.spring.mapper.MapperFactoryBean;
import org.springframework.context.annotation.*;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import java.util.Map;

@Configuration
public class WebsiteConfig {
    @Bean org.springframework.boot.web.servlet.ServletListenerRegistrationBean<WebsiteSessions> websiteSessionListener(WebsiteSessions sessions){return new org.springframework.boot.web.servlet.ServletListenerRegistrationBean<>(sessions);}
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
    @Bean org.springframework.security.core.userdetails.UserDetailsService userDetails() { return username -> { throw new org.springframework.security.core.userdetails.UsernameNotFoundException("请使用官网登录入口"); }; }
    @Bean ApplicationRunner seed(WebsiteService service, WebsiteCatalog catalog, WebsitePages pages) { return args -> { catalog.seed(); pages.seed(); service.seed(); }; }
    @Bean SecurityFilterChain security(HttpSecurity http, ObjectMapper json,org.springframework.jdbc.core.JdbcTemplate db) throws Exception {
        http.addFilterBefore(new WebsiteSessionGuard(db),org.springframework.security.web.access.intercept.AuthorizationFilter.class);
        http.authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/admin/**", "/api/auth/logout").authenticated()
            .requestMatchers("/api/public/**", "/api/auth/session", "/api/auth/login", "/api/auth/setup", "/api/health").permitAll()
            .requestMatchers("/api/**").denyAll().anyRequest().permitAll())
            .csrf(csrf -> csrf.csrfTokenRepository(new HttpSessionCsrfTokenRepository()))
            .formLogin(form -> form.disable()).httpBasic(basic -> basic.disable())
            .requestCache(cache -> cache.disable())
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((req,res,e) -> { res.setStatus(401); res.setContentType("application/json;charset=UTF-8"); json.writeValue(res.getOutputStream(), Map.of("code",401,"message","请先登录管理员账号")); })
                .accessDeniedHandler((req,res,e) -> { res.setStatus(403); res.setContentType("application/json;charset=UTF-8"); json.writeValue(res.getOutputStream(), Map.of("code",403,"message","请求校验失败，请刷新后重试")); }));
        return http.build();
    }
}
