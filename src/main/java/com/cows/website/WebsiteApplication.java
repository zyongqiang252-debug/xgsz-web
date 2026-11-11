package com.cows.website;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages={"com.cows.website","com.cows.serviceImpl"})
@org.mybatis.spring.annotation.MapperScan("com.cows.mapper")
public class WebsiteApplication {
    public static void main(String[] args) { SpringApplication.run(WebsiteApplication.class, args); }
}
