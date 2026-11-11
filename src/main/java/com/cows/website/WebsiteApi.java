package com.cows.website;

import com.cows.commons.api.BaseResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;

@RestController
@RequestMapping("/api")
public class WebsiteApi {
    private final WebsiteService service; private final JdbcTemplate db; private final WebsiteThrottle throttle;
    public WebsiteApi(WebsiteService service,JdbcTemplate db,WebsiteThrottle throttle) {this.service=service;this.db=db;this.throttle=throttle;}
    @GetMapping("/health") Object health(){
        if(db.queryForObject("SELECT COUNT(*) FROM site_metadata WHERE name IN ('initial-content-v1','cms-catalog-v1')",Integer.class)!=2)
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"数据服务正在初始化");
        String database=db.execute((org.springframework.jdbc.core.ConnectionCallback<String>) connection->{
            try(var statement=connection.createStatement();var result=statement.executeQuery("SELECT 1")){if(!result.next())throw new java.sql.SQLException("数据库不可用");}
            return connection.getMetaData().getDatabaseProductName();
        });
        return BaseResponse.success(Map.of("status","ok","storage","database","database",database,"productService","upstream-ProductServiceImpl"));
    }
    @GetMapping("/public/content") Object publicContent(){return BaseResponse.success(service.content(false));}
    @GetMapping("/admin/content") Object adminContent(){return BaseResponse.success(service.content(true));}
    @PostMapping("/admin/{kind:products|services}") @ResponseStatus(HttpStatus.CREATED)
    Object create(@PathVariable String kind,@RequestBody WebsiteService.ContentInput input){return BaseResponse.success(service.save(kind,null,input));}
    @PutMapping("/admin/{kind:products|services}/{id}") Object update(@PathVariable String kind,@PathVariable String id,@RequestBody WebsiteService.ContentInput input){return BaseResponse.success(service.save(kind,id,input));}
    @DeleteMapping("/admin/{kind:products|services}/{id}") Object delete(@PathVariable String kind,@PathVariable String id,@RequestParam long version){service.delete(kind,id,version);return BaseResponse.success();}
    @PutMapping("/admin/settings") Object settings(@RequestBody Map<String,Object> input){return BaseResponse.success(service.settings(input));}

    public record Inquiry(@NotBlank @Size(max=100) String name,@NotBlank @Pattern(regexp="[+]?[0-9]{7,20}") String phone,@NotBlank @Size(max=200) String company,@NotBlank @Size(max=200) String intent,@NotBlank @Size(max=4000) String message,@AssertTrue boolean consent){}
    @PostMapping("/public/inquiries") @ResponseStatus(HttpStatus.CREATED)
    Object inquire(@Valid @RequestBody Inquiry input,jakarta.servlet.http.HttpServletRequest request){
        throttle.check("inquiry:"+request.getRemoteAddr(),10);
        String id=UUID.randomUUID().toString();
        db.update("INSERT INTO site_inquiry(id,name,phone,company,intent,message,consent) VALUES(?,?,?,?,?,?,?)",id,input.name.trim(),input.phone,input.company.trim(),input.intent.trim(),input.message.trim(),true);
        return BaseResponse.success(Map.of("id",id,"status","pending","date",java.time.Instant.now().toString()));
    }
    @GetMapping("/admin/inquiries") Object inquiries(){
        return BaseResponse.success(db.query("SELECT * FROM site_inquiry ORDER BY created_at DESC",(rs,i)->Map.of("id",rs.getString("id"),"name",rs.getString("name"),"phone",rs.getString("phone"),"company",rs.getString("company"),"intent",rs.getString("intent"),"message",rs.getString("message"),"status",rs.getString("status"),"date",rs.getTimestamp("created_at").toInstant().toString())));
    }
    @PatchMapping("/admin/inquiries/{id}") Object inquiryStatus(@PathVariable String id,@RequestBody Map<String,String> input){
        String status=input.get("status");if(status==null || !Set.of("pending","done").contains(status))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"咨询状态无效");
        if(db.update("UPDATE site_inquiry SET status=? WHERE id=?",status,id)==0)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"咨询记录不存在");
        return BaseResponse.success();
    }
}
