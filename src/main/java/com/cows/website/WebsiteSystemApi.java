package com.cows.website;

import com.cows.commons.api.BaseResponse;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.sql.Connection;
import java.time.Instant;
import java.util.*;

/** Read-only database and content checks for the administration console. */
@RestController
@RequestMapping("/api/admin/system")
public class WebsiteSystemApi {
    private static final Map<String,String> TABLES;
    static {
        var tables=new LinkedHashMap<String,String>();
        for(String name:List.of("Products","ProductCategories","site_content","site_page","site_catalog_meta"))tables.put(name,"内容");
        for(String name:List.of("Brands","BrandAuthorizationCertificates","Carousels","ProductsCarousels","About","Businesses","BasicInformation"))tables.put(name,"展示资料");
        for(String name:List.of("site_inquiry","site_media","site_metadata","Admins","site_admin"))tables.put(name,"系统");
        for(String name:List.of("User","Orders","user_location"))tables.put(name,"兼容表");
        TABLES=Collections.unmodifiableMap(tables);
    }
    private final JdbcTemplate db;
    public WebsiteSystemApi(JdbcTemplate db){this.db=db;}

    @GetMapping
    Object status(){
        var tableRows=new ArrayList<Map<String,Object>>();
        long unavailable=0;
        for(var entry:TABLES.entrySet()){
            long rows=count(entry.getKey());
            if(rows<0)unavailable++;
            var row=new LinkedHashMap<String,Object>();
            row.put("name",entry.getKey());
            row.put("group",entry.getValue());
            row.put("rows",rows);
            row.put("ready",rows>=0);
            tableRows.add(row);
        }
        var markers=db.query("SELECT name,content_value FROM site_metadata ORDER BY name",(rs,i)->{
            var row=new LinkedHashMap<String,Object>();
            row.put("name",rs.getString(1));row.put("value",rs.getString(2));return row;
        });
        var markerNames=markers.stream().map(row->Objects.toString(row.get("name"),"")).toList();
        var pages=db.query("SELECT id,version FROM site_page ORDER BY id",(rs,i)->{
            var row=new LinkedHashMap<String,Object>();
            row.put("id",rs.getString(1));row.put("version",rs.getLong(2));return row;
        });
        var contentKinds=db.query("SELECT kind,COUNT(*) AS total FROM site_content GROUP BY kind ORDER BY kind",(rs,i)->{
            var row=new LinkedHashMap<String,Object>();
            row.put("kind",rs.getString(1));row.put("rows",rs.getLong(2));return row;
        });
        var checks=new ArrayList<Map<String,Object>>();
        checks.add(check("数据表结构",unavailable==0,(TABLES.size()-unavailable)+" / "+TABLES.size()+" 张表可用"));
        checks.add(check("内容初始化",markerNames.contains("cms-catalog-v1")&&markerNames.contains("initial-content-v1"),"页面与产品服务初始内容标记"));
        checks.add(check("管理员入口",count("Admins")>=0,"管理员账号表可用"));
        var result=new LinkedHashMap<String,Object>();
        result.put("database",databaseInfo());
        result.put("tables",tableRows);
        result.put("markers",markers);
        result.put("pages",pages);
        result.put("contentKinds",contentKinds);
        result.put("checks",checks);
        result.put("generatedAt",Instant.now().toString());
        return BaseResponse.success(result);
    }

    private Map<String,Object> check(String name,boolean ok,String detail){
        var row=new LinkedHashMap<String,Object>();
        row.put("name",name);row.put("ok",ok);row.put("detail",detail);return row;
    }

    private long count(String table){
        try{Long value=db.queryForObject("SELECT COUNT(*) FROM `"+table+"`",Long.class);return value==null?-1:value;}
        catch(Exception e){return -1;}
    }

    private Map<String,Object> databaseInfo(){
        try{
            Map<String,Object> info=db.execute((ConnectionCallback<Map<String,Object>>)this::readDatabaseInfo);
            return info==null?unknownDatabase():info;
        }catch(Exception e){return unknownDatabase();}
    }

    private Map<String,Object> readDatabaseInfo(Connection connection)throws java.sql.SQLException{
        var meta=connection.getMetaData();
        var info=new LinkedHashMap<String,Object>();
        info.put("product",meta.getDatabaseProductName());
        info.put("version",meta.getDatabaseProductVersion());
        info.put("driver",meta.getDriverName()+" "+meta.getDriverVersion());
        info.put("catalog",Objects.toString(connection.getCatalog(),""));
        info.put("charset","");
        info.put("collation","");
        info.put("timezone","");
        try(var statement=connection.createStatement();var result=statement.executeQuery("SELECT @@character_set_database AS charset_name, @@collation_database AS collation_name, @@time_zone AS time_zone")){
            if(result.next()){
                info.put("charset",Objects.toString(result.getString("charset_name"),""));
                info.put("collation",Objects.toString(result.getString("collation_name"),""));
                info.put("timezone",Objects.toString(result.getString("time_zone"),""));
            }
        }catch(Exception ignored){}
        return info;
    }

    private Map<String,Object> unknownDatabase(){
        var info=new LinkedHashMap<String,Object>();
        info.put("product","unknown");info.put("version","");info.put("driver","");info.put("catalog","");
        info.put("charset","");info.put("collation","");info.put("timezone","");
        return info;
    }
}
