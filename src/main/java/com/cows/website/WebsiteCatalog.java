package com.cows.website;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.ApplicationContext;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.lang.reflect.InvocationTargetException;
import java.util.*;

/** Validated management adapters over the supplied Service/Mapper implementations. */
@Service
public class WebsiteCatalog {
    private final JdbcTemplate db;
    private final ObjectMapper json;
    private final ApplicationContext beans;
    private final PasswordEncoder passwords;
    private final WebsiteSessions sessions;
    private final Map<String,Map<String,Object>> modules;
    public WebsiteCatalog(JdbcTemplate db,ObjectMapper json,ApplicationContext beans,PasswordEncoder passwords,WebsiteSessions sessions) throws Exception {
        this.db=db;this.json=json;this.beans=beans;this.passwords=passwords;this.sessions=sessions;
        try(var input=new ClassPathResource("cms-modules.json").getInputStream()) {
            modules=json.readValue(input,new TypeReference<LinkedHashMap<String,Map<String,Object>>>(){});
        }
    }
    public Map<String,Map<String,Object>> definitions(){return modules;}
    private Map<String,Object> module(String kind){var m=modules.get(kind);if(m==null)throw error(HttpStatus.NOT_FOUND,"管理栏目不存在");return m;}
    private ResponseStatusException error(HttpStatus status,String message){return new ResponseStatusException(status,message);}
    private Object invoke(String kind,String operation,Object... args) {
        var def=module(kind);Object service=beans.getBean((String)def.get("service"));
        String method=(String)def.get(operation);
        try {
            for(var candidate:service.getClass().getMethods()) if(candidate.getName().equals(method)&&candidate.getParameterCount()==args.length) {
                Object[] actual=args.clone();
                if(args.length==1 && args[0] instanceof Number n)actual[0]=candidate.getParameterTypes()[0]==Long.class?n.longValue():n.intValue();
                // A conditional expression would promote Integer to Long, which reflection cannot unbox to int.
                if(args.length==1 && args[0] instanceof Number n && candidate.getParameterTypes()[0]==int.class)actual[0]=Integer.valueOf(n.intValue());
                return candidate.invoke(service,actual);
            }
            throw new IllegalStateException("服务方法未配置："+kind+"/"+operation);
        } catch(InvocationTargetException e){if(e.getCause() instanceof RuntimeException r)throw r;throw new IllegalStateException(e.getCause());}
        catch(ReflectiveOperationException e){throw new IllegalStateException(e);}
    }
    @SuppressWarnings("unchecked")
    @Transactional(readOnly=true)
    public List<Map<String,Object>> list(String kind) {
        return ((List<Object>)invoke(kind,"list")).stream().filter(row->{var value=json.convertValue(row,Map.class);return !Boolean.TRUE.equals(value.get("deleted"));})
            .map(row->project(kind,row)).toList();
    }
    private Map<String,Object> project(String kind,Object entity) {
        Map<String,Object> result=json.convertValue(entity,new TypeReference<LinkedHashMap<String,Object>>(){});
        result.remove("password");result.remove("wechatOpenId");result.remove("updates");result.remove("deleted");
        var meta=db.queryForList("SELECT payload,version FROM site_catalog_meta WHERE kind=? AND record_id=?",kind,result.get("id"));
        if(!meta.isEmpty()) {
            try {result.putAll(json.readValue(meta.get(0).get("payload").toString(),new TypeReference<Map<String,Object>>(){}));}
            catch(Exception e){throw new IllegalStateException(e);}
        }
        result.put("version",meta.isEmpty()?1:((Number)meta.get(0).get("version")).longValue());
        if(kind.equals("categories"))result.putIfAbsent("key","category-"+result.get("id"));
        return result;
    }
    public List<Map<String,Object>> published(String kind){return list(kind).stream().filter(x->!Boolean.FALSE.equals(x.get("enabled"))&&!Boolean.FALSE.equals(x.get("enable"))).toList();}
    public Map<String,Object> contacts(){var rows=list("basicInformation");if(rows.isEmpty())return Map.of();var row=rows.stream().min(Comparator.comparingLong(x->((Number)x.get("id")).longValue())).orElseThrow();var result=new LinkedHashMap<String,Object>();for(String key:List.of("phone","email","address"))result.put(key,Objects.toString(row.get(key),""));return result;}
    @Transactional public void syncContacts(Map<String,Object> contacts) {
        var service=beans.getBean(com.cows.service.BasicInformationService.class);
        var rows=service.getAllBasicInformation();var info=new com.cows.entity.BasicInformation();
        if(!rows.isEmpty()){
            long id=rows.stream().mapToLong(com.cows.entity.BasicInformation::getId).min().orElseThrow();
            if(db.queryForObject("SELECT COUNT(*) FROM site_catalog_meta WHERE kind='basicInformation' AND record_id=?",Integer.class,id)==0)db.update("INSERT INTO site_catalog_meta(kind,record_id,payload,version) VALUES('basicInformation',?,'{}',1)",id);
            db.queryForObject("SELECT version FROM site_catalog_meta WHERE kind='basicInformation' AND record_id=? FOR UPDATE",Long.class,id);
            info=service.getBasicInformationById(id);
        }
        info.setPhone(Objects.toString(contacts.get("phone"),""));info.setEmail(Objects.toString(contacts.get("email"),""));info.setAddress(Objects.toString(contacts.get("address"),""));
        if(rows.isEmpty()){info.setEnable(true);service.addBasicInformation(info);db.update("INSERT INTO site_catalog_meta(kind,record_id,payload,version) VALUES('basicInformation',?,'{}',1)",info.getId());}
        else{service.updateBasicInformation(info);db.update("UPDATE site_catalog_meta SET version=version+1 WHERE kind='basicInformation' AND record_id=?",info.getId());}
    }
    @SuppressWarnings("unchecked")
    @Transactional
    public Map<String,Object> save(String kind,Integer id,Map<String,Object> input) throws Exception {
        var def=module(kind);
        Object previous=null;
        long version=0;
        if(id!=null) {
            version=lock(kind,id,input.get("version"));
            previous=invoke(kind,"get",id);if(previous==null||Boolean.TRUE.equals(json.convertValue(previous,Map.class).get("deleted")))throw error(HttpStatus.NOT_FOUND,"记录不存在");
        }
        Map<String,Object> clean=previous==null?new LinkedHashMap<>():json.convertValue(previous,new TypeReference<LinkedHashMap<String,Object>>(){});
        for(var field:(List<Map<String,Object>>)def.get("fields")) {
            String key=(String)field.get("key"),type=(String)field.get("type"); Object raw=input.get(key);
            if(type.equals("checkbox"))clean.put(key,raw==null?Boolean.TRUE:raw instanceof Boolean?raw:fail("启用状态格式错误"));
            else if(type.equals("products")) {
                if(!(raw instanceof List<?> ids)||ids.size()>50)throw error(HttpStatus.BAD_REQUEST,"请选择至多50项推荐产品");
                var productIds=new ArrayList<Integer>();
                for(var value:(List<?>)raw){if(!(value instanceof Number n)||n.doubleValue()!=n.intValue()||db.queryForObject("SELECT COUNT(*) FROM Products WHERE id=? AND isDeleted=0",Integer.class,n.intValue())==0)throw error(HttpStatus.BAD_REQUEST,"推荐产品不存在");productIds.add(n.intValue());}
                clean.put(key,productIds);
            } else if(Set.of("number","money","latitude","longitude").contains(type)) {
                if(!(raw instanceof Number n)||!Double.isFinite(n.doubleValue()))throw error(HttpStatus.BAD_REQUEST,"请填写有效数值");
                double min=type.equals("latitude")?-90:type.equals("longitude")?-180:0;
                double max=type.equals("latitude")?90:type.equals("longitude")?180:type.equals("money")?999999999999.99:Integer.MAX_VALUE;
                if(n.doubleValue()<min||n.doubleValue()>max||type.equals("number")&&n.doubleValue()!=n.intValue())throw error(HttpStatus.BAD_REQUEST,"数值超出有效范围");
                clean.put(key,raw);
            } else {
                if(raw!=null&&!(raw instanceof String))throw error(HttpStatus.BAD_REQUEST,"文本字段格式错误");
                String value=raw==null?"":type.equals("password")?raw.toString():raw.toString().trim();
                if(Boolean.TRUE.equals(field.get("required"))&&value.isBlank()||value.length()>(type.equals("textarea")?4000:1000))throw error(HttpStatus.BAD_REQUEST,"请检查必填字段及长度");
                if(type.equals("image"))value=WebsiteMedia.safeImage(value);
                if(type.equals("link"))value=WebsiteMedia.safeLink(value);
                if(type.equals("password")) {
                    if(value.isEmpty()&&previous!=null) {clean.put(key,json.convertValue(previous,Map.class).get("password"));continue;}
                    if(value.length()<12||value.length()>64||value.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72)throw error(HttpStatus.BAD_REQUEST,"密码需为12至64个字符，且不超过72字节");
                    if(!kind.equals("users")||id!=null)value=passwords.encode(value);
                }
                clean.put(key,value);
            }
        }
        if(kind.equals("categories") && id!=null && Boolean.FALSE.equals(clean.get("enabled")))checkCategoryUnused(id);
        if(kind.equals("users")||kind.equals("admins")) {
            String username=Objects.toString(clean.get("userName"),"");
            if(!username.matches("[a-zA-Z0-9_-]{3,40}"))throw error(HttpStatus.BAD_REQUEST,"账号需为3至40位字母、数字、下划线或短横线");
            String table=kind.equals("admins")?"Admins":"`User`";
            if(db.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE userName=? AND id<>?",Integer.class,username,id==null?-1:id)>0)throw error(HttpStatus.CONFLICT,"账号已存在");
            if(kind.equals("admins")&&id!=null)checkOwnAccount(previous,Boolean.FALSE.equals(clean.get("enable")),username);
        }
        if(Set.of("orders","locations").contains(kind)&&db.queryForObject("SELECT COUNT(*) FROM `User` WHERE id=? AND isDeleted=0",Integer.class,clean.get("userId"))==0)throw error(HttpStatus.BAD_REQUEST,"请选择有效客户");
        if(id!=null)clean.put("id",id);
        Class<?> entityType=Class.forName("com.cows.entity."+def.get("entity"));
        Object entity=json.convertValue(clean,entityType);
        invoke(kind,id==null?"add":"update",entity);
        int recordId=((Number)json.convertValue(entity,Map.class).get("id")).intValue();
        if(id==null)db.update("INSERT INTO site_catalog_meta(kind,record_id,payload,version) VALUES(?,?,'{}',1)",kind,recordId);
        else db.update("UPDATE site_catalog_meta SET version=version+1 WHERE kind=? AND record_id=?",kind,id);
        if(kind.equals("admins")&&previous!=null){var old=json.convertValue(previous,Map.class);if(!Objects.equals(old.get("password"),clean.get("password"))||!Objects.equals(old.get("userName"),clean.get("userName"))||Boolean.FALSE.equals(clean.get("enable")))revokeAfterCommit(Objects.toString(old.get("userName")));}
        return project(kind,invoke(kind,"get",recordId));
    }
    private Object fail(String message){throw error(HttpStatus.BAD_REQUEST,message);}
    private long lock(String kind,int id,Object expected) {
        var rows=db.queryForList("SELECT version FROM site_catalog_meta WHERE kind=? AND record_id=? FOR UPDATE",kind,id);
        long current=rows.isEmpty()?1:((Number)rows.get(0).get("version")).longValue();
        if(!(expected instanceof Number n)||n.longValue()!=current)throw error(HttpStatus.CONFLICT,"内容已被其他页面修改，请刷新后重新编辑");
        if(rows.isEmpty())db.update("INSERT INTO site_catalog_meta(kind,record_id,payload,version) VALUES(?,?,'{}',1)",kind,id);
        return current;
    }
    private void checkCategoryUnused(int id){if(db.queryForObject("SELECT COUNT(*) FROM Products WHERE categoryId=? AND isDeleted=0",Integer.class,id)>0)throw error(HttpStatus.CONFLICT,"此分类仍有关联产品，请先调整产品分类");}
    private void checkOwnAccount(Object previous,boolean disabling,String newName) {
        String own=SecurityContextHolder.getContext().getAuthentication().getName();
        String oldName=json.convertValue(previous,Map.class).get("userName").toString();
        if(oldName.equals(own)&&(disabling||!newName.equals(own)))throw error(HttpStatus.CONFLICT,"不能停用、删除或重命名当前登录账号");
        if(disabling&&db.queryForObject("SELECT COUNT(*) FROM Admins WHERE isEnable=1 AND isDeleted=0",Integer.class)<=1)throw error(HttpStatus.CONFLICT,"至少保留一位可用管理员");
    }
    @Transactional public void delete(String kind,int id,long version) {
        var previous=invoke(kind,"get",id);if(previous==null)throw error(HttpStatus.NOT_FOUND,"记录不存在");lock(kind,id,version);
        if(kind.equals("categories"))checkCategoryUnused(id);
        if(kind.equals("admins"))checkOwnAccount(previous,true,Objects.toString(json.convertValue(previous,Map.class).get("userName")));
        if(kind.equals("users")&&db.queryForObject("SELECT COUNT(*) FROM Orders WHERE userId=?",Integer.class,id)>0)throw error(HttpStatus.CONFLICT,"此客户仍有关联订单");
        if(kind.equals("users")&&db.queryForObject("SELECT COUNT(*) FROM user_location WHERE user_id=?",Integer.class,id)>0)throw error(HttpStatus.CONFLICT,"此客户仍有关联地址");
        invoke(kind,"delete",id);db.update("DELETE FROM site_catalog_meta WHERE kind=? AND record_id=?",kind,id);
        if(kind.equals("admins"))revokeAfterCommit(Objects.toString(json.convertValue(previous,Map.class).get("userName")));
    }
    private void revokeAfterCommit(String name){org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(new org.springframework.transaction.support.TransactionSynchronization(){@Override public void afterCommit(){sessions.revoke(name);}});}
    @Transactional public void seed() throws Exception {
        if(db.queryForObject("SELECT COUNT(*) FROM site_metadata WHERE name='cms-admin-migrated-v1'",Integer.class)==0){
            db.update("INSERT INTO Admins(userName,password,isEnable,isDeleted) SELECT username,password_hash,1,0 FROM site_admin s WHERE NOT EXISTS(SELECT 1 FROM Admins a WHERE a.userName=s.username)");
            for(var account:db.queryForList("SELECT id,password FROM Admins WHERE isDeleted=0")){String value=Objects.toString(account.get("password"),"");if(!value.matches("^\\$2[aby]\\$[0-9]{2}\\$.{53}$"))db.update("UPDATE Admins SET password=? WHERE id=?",passwords.encode(value),account.get("id"));}
            db.update("INSERT INTO site_metadata(name,content_value) VALUES('cms-admin-migrated-v1','complete')");
        }
        if(db.queryForObject("SELECT COUNT(*) FROM site_metadata WHERE name='cms-catalog-v1'",Integer.class)>0)return;
        try(var stream=new ClassPathResource("seed-cms.json").getInputStream()) {
            var seed=json.readTree(stream).path("catalog");
            var fields=seed.fields();while(fields.hasNext()){var entry=fields.next();for(var row:entry.getValue()) {
                var input=json.convertValue(row,new TypeReference<LinkedHashMap<String,Object>>(){});
                var saved=save(entry.getKey(),null,input);
                if(entry.getKey().equals("categories"))db.update("UPDATE site_catalog_meta SET payload=? WHERE kind='categories' AND record_id=?",json.writeValueAsString(Map.of("key",input.get("key"))),saved.get("id"));
            }}
        }
        db.update("INSERT INTO site_metadata(name,content_value) VALUES('cms-catalog-v1','complete')");
    }
}
