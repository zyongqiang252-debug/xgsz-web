package com.cows.website;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@Service
public class WebsitePages {
    private static final Set<String> EDITABLE_PAGES=Set.of("products");
    private final JdbcTemplate db;private final ObjectMapper json;
    private final Map<String,Map<String,Object>> schema;
    private final Map<String,Map<String,Object>> defaults;
    public WebsitePages(JdbcTemplate db,ObjectMapper json) throws Exception {
        this.db=db;this.json=json;
        try(var input=new ClassPathResource("cms-pages.json").getInputStream()){schema=json.readValue(input,new TypeReference<LinkedHashMap<String,Map<String,Object>>>(){});}
        try(var input=new ClassPathResource("seed-cms.json").getInputStream()){defaults=json.convertValue(json.readTree(input).path("pages"),new TypeReference<LinkedHashMap<String,Map<String,Object>>>(){});}
    }
    public Map<String,Map<String,Object>> definitions(){
        var result=new LinkedHashMap<String,Map<String,Object>>();
        for(var entry:schema.entrySet())if(EDITABLE_PAGES.contains(entry.getKey()))result.put(entry.getKey(),entry.getValue());
        return result;
    }
    public Map<String,Object> all(){Map<String,Object> pages=new LinkedHashMap<>();for(String key:schema.keySet())pages.put(key,get(key));return pages;}
    public Map<String,Object> get(String key) {
        if(!schema.containsKey(key))throw new ResponseStatusException(HttpStatus.NOT_FOUND,"页面不存在");
        var rows=db.queryForList("SELECT payload,version FROM site_page WHERE id=?",key);
        if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"页面尚未初始化");
        try {var result=new LinkedHashMap<String,Object>(defaults.get(key));result.putAll(json.readValue(rows.get(0).get("payload").toString(),new TypeReference<LinkedHashMap<String,Object>>(){}));result.put("version",rows.get(0).get("version"));return result;}
        catch(Exception e){throw new IllegalStateException(e);}
    }
    public Map<String,Object> adminGet(String key){requireEditable(key);return get(key);}
    public Map<String,Object> adminSave(String key,Map<String,Object> value) throws Exception{requireEditable(key);return save(key,value);}
    private void requireEditable(String key){
        if(!schema.containsKey(key)||!EDITABLE_PAGES.contains(key))throw new ResponseStatusException(HttpStatus.NOT_FOUND,"页面不存在");
    }
    @SuppressWarnings("unchecked")
    private List<Map<String,Object>> editableFields(String key){
        var definition=schema.get(key);
        var fields=(List<Map<String,Object>>)definition.get("fields");
        var keys=(List<String>)definition.get("adminFields");
        if(keys==null)return fields;
        return fields.stream().filter(field->keys.contains((String)field.get("key"))).toList();
    }
    @SuppressWarnings("unchecked")
    private Map<String,Object> validate(List<Map<String,Object>> fields,Map<String,Object> value) {
        var clean=new LinkedHashMap<String,Object>();
        for(var field:fields) {
            String key=(String)field.get("key"),type=(String)field.get("type");Object raw=value.get(key);
            if(type.equals("list")) {
                if(!(raw instanceof List<?> rows)||rows.size()>50)throw bad("列表最多50项，请检查内容格式");
                var result=new ArrayList<Map<String,Object>>();
                for(var row:(List<?>)raw) {if(!(row instanceof Map<?,?>))throw bad("列表内容格式不正确");result.add(validate((List<Map<String,Object>>)field.get("fields"),(Map<String,Object>)row));}
                clean.put(key,result);
            } else {
                if(!(raw instanceof String)||raw.toString().length()>8000||Boolean.TRUE.equals(field.get("required"))&&raw.toString().isBlank())throw bad("请检查页面必填内容和字段长度");
                String text=raw.toString().trim();if(type.equals("image"))text=WebsiteMedia.safeImage(text);if(type.equals("link"))text=WebsiteMedia.safeLink(text);
                clean.put(key,text);
            }
        }
        return clean;
    }
    private ResponseStatusException bad(String message){return new ResponseStatusException(HttpStatus.BAD_REQUEST,message);}
    @SuppressWarnings("unchecked")
    @Transactional public Map<String,Object> save(String key,Map<String,Object> value) throws Exception {
        requireEditable(key);
        var rows=db.queryForList("SELECT payload,version FROM site_page WHERE id=? FOR UPDATE",key);
        long current=rows.isEmpty()?0:((Number)rows.get(0).get("version")).longValue();
        if(!(value.get("version") instanceof Number n)||n.longValue()!=current)throw new ResponseStatusException(HttpStatus.CONFLICT,"页面已被其他页面修改，请刷新后重新编辑");
        if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"页面尚未初始化");
        var clean=validate(editableFields(key),value);
        var merged=new LinkedHashMap<String,Object>(json.readValue(rows.get(0).get("payload").toString(),new TypeReference<LinkedHashMap<String,Object>>(){}));
        merged.putAll(clean);
        db.update("UPDATE site_page SET payload=?,version=version+1 WHERE id=?",json.writeValueAsString(merged),key);
        merged.put("version",current+1);return merged;
    }
    @Transactional public void seed() throws Exception {
        try(var input=new ClassPathResource("seed-cms.json").getInputStream()) {
            var seed=json.readTree(input).path("pages");
            var fields=seed.fields();while(fields.hasNext()){var entry=fields.next();if(db.queryForObject("SELECT COUNT(*) FROM site_page WHERE id=?",Integer.class,entry.getKey())==0)db.update("INSERT INTO site_page(id,payload,version) VALUES(?,?,1)",entry.getKey(),entry.getValue().toString());}
        }
    }
}
