package com.cows.website;

import com.cows.entity.Product;
import com.cows.service.ProductService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.core.io.ClassPathResource;
import java.util.*;

@Service
public class WebsiteService {
    private final JdbcTemplate db;
    private final ProductService products;
    private final ObjectMapper json;
    private final WebsiteCatalog catalog;
    private final WebsitePages pages;
    public WebsiteService(JdbcTemplate db, ProductService products, ObjectMapper json,WebsiteCatalog catalog,WebsitePages pages) { this.db=db; this.products=products; this.json=json;this.catalog=catalog;this.pages=pages; }
    private Map<String,Object> parse(String data) { try { return json.readValue(data,new TypeReference<LinkedHashMap<String,Object>>(){}); } catch(Exception e) { throw new IllegalStateException("内容数据无法读取",e); } }
    private String stringify(Object data) { try { return json.writeValueAsString(data); } catch(Exception e) { throw new IllegalArgumentException("内容格式有误"); } }
    @Transactional(readOnly=true, isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Map<String,Object> content(boolean manager) {
        Map<Integer,Product> base=new HashMap<>(); products.getAllProducts().forEach(p -> base.put(p.getId(),p));
        List<Map<String,Object>> productList=new ArrayList<>(), serviceList=new ArrayList<>();
        db.query("SELECT * FROM site_content WHERE kind IN ('products','services') ORDER BY updated_at,id", rs -> {
            Map<String,Object> data=parse(rs.getString("payload")); data.put("id",rs.getString("id")); data.put("version",rs.getLong("version"));
            if ("products".equals(rs.getString("kind"))) {
                Product p=base.get(rs.getInt("product_id")); if(p==null) return;
                data.put("name",p.getName()); data.put("desc",p.getDescription()); data.put("published",p.isAvailable());
                data.put("productId",p.getId());data.put("coverImage",Objects.toString(p.getCoverImage(),""));data.put("detailImages",p.getDetailImages()==null?List.of():Arrays.asList(p.getDetailImages()));data.put("brand",Objects.toString(p.getBrand(),""));
                if(manager){data.put("salePrice",p.getSalePrice());data.put("costPrice",p.getCostPrice());data.put("stockQuantity",p.getStockQuantity());}
                var category=catalog.list("categories").stream().filter(c->((Number)c.get("id")).intValue()==p.getCategoryId()).findFirst();
                if(category.isPresent())data.put("category",category.get().get("key"));
                if(manager || p.isAvailable()) productList.add(data);
            } else if(manager || !Boolean.FALSE.equals(data.get("published"))) serviceList.add(data);
        });
        var setting=db.query("SELECT payload,version FROM site_content WHERE id='site-settings' AND kind='settings'",(rs,i)->{var x=parse(rs.getString(1)); x.put("version",rs.getLong(2));return x;});
        Map<String,Object> contacts=new LinkedHashMap<>(Map.of("phone","","email","","address","","wecomName","","wecomUrl","","wecomQr","","version",0));
        if(!setting.isEmpty())contacts.putAll(setting.get(0));
        contacts.putAll(catalog.contacts());
        var result=new LinkedHashMap<String,Object>();result.put("products",productList);result.put("services",serviceList);result.put("settings",contacts);result.put("pages",pages.all());
        for(String key:List.of("categories","brands","certificates","carousels","productCarousels","abouts","businesses","basicInformation"))result.put(key,manager?catalog.list(key):catalog.published(key));
        return result;
    }
    public record ContentInput(String name, String desc, String category, String tag, List<String> features, String uses, List<String> items, String note, String en, String icon, Boolean published, Long version,String coverImage,List<String> detailImages,String brand,Double salePrice,Double costPrice,Integer stockQuantity) {}
    private String text(String value,int max,boolean required) {
        String v=value==null?"":value.trim(); if((required && v.isBlank()) || v.length()>max) throw bad("请检查名称、简介和字段长度"); return v;
    }
    private List<String> lines(List<String> values) { if(values==null)return List.of(); if(values.size()>30)throw bad("明细最多30项"); return values.stream().map(x->text(x,500,false)).filter(x->!x.isBlank()).toList(); }
    private ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST,message); }
    private void kind(String kind) { if(!Set.of("products","services").contains(kind))throw bad("不支持的内容类型"); }
    @Transactional public Map<String,Object> save(String kind,String id,ContentInput input) {
        kind(kind); boolean fresh=id==null;
        Map<String,Object> data=new LinkedHashMap<>(); data.put("name",text(input.name,200,true));data.put("desc",text(input.desc,4000,true));data.put("published",!Boolean.FALSE.equals(input.published));data.put("en",text(input.en,200,false));
        if(kind.equals("products")) {
            if(catalog.published("categories").stream().noneMatch(c->Objects.equals(c.get("key"),input.category)))throw bad("请选择已启用的产品分类");
            data.put("category",input.category);data.put("tag",text(input.tag,200,false));data.put("features",lines(input.features));data.put("uses",text(input.uses,500,false));
            data.put("kind",Objects.toString(Map.of("general","rack","gpu","gpu","domestic","domestic").get(input.category),"rack"));data.put("icon",Objects.toString(Map.of("general","server","gpu","chip","domestic","layers").get(input.category),"server"));
        } else { data.put("items",lines(input.items));data.put("note",text(input.note,2000,false)); data.put("icon",Set.of("activity","shield","network","tool").contains(Objects.toString(input.icon,""))?input.icon:"shield"); }
        int productId=0;long next=1;
        if(fresh) id="item-"+UUID.randomUUID();
        else {
            var rows=db.queryForList("SELECT product_id,version FROM site_content WHERE id=? AND kind=? FOR UPDATE",id,kind);
            if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"内容已被删除");
            long current=((Number)rows.get(0).get("version")).longValue();
            if(input.version==null || input.version!=current)throw new ResponseStatusException(HttpStatus.CONFLICT,"内容已被其他页面修改，请刷新后重新编辑");
            next=current+1; if(rows.get(0).get("product_id")!=null)productId=((Number)rows.get(0).get("product_id")).intValue();
        }
        if(kind.equals("products")) {
            Product p=fresh?new Product():products.getProductById(productId);if(p==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"产品不存在");
            p.setName((String)data.get("name"));p.setDescription((String)data.get("desc"));p.setAvailable((Boolean)data.get("published"));
            if(input.coverImage!=null)p.setCoverImage(WebsiteMedia.safeImage(text(input.coverImage,1000,false)));
            if(input.detailImages!=null){if(input.detailImages.size()>12)throw bad("详情图片最多12张");p.setDetailImages(input.detailImages.stream().map(WebsiteMedia::safeImage).toArray(String[]::new));}else if(fresh)p.setDetailImages(new String[0]);
            if(input.brand!=null)p.setBrand(text(input.brand,100,false));
            if(input.salePrice!=null){if(!Double.isFinite(input.salePrice)||input.salePrice<0)throw bad("销售价格无效");p.setSalePrice(input.salePrice);}
            if(input.costPrice!=null){if(!Double.isFinite(input.costPrice)||input.costPrice<0)throw bad("成本价格无效");p.setCostPrice(input.costPrice);}
            if(input.stockQuantity!=null){if(input.stockQuantity<0)throw bad("库存数量无效");p.setStockQuantity(input.stockQuantity);}
            p.setCategoryId(((Number)catalog.list("categories").stream().filter(c->Objects.equals(c.get("key"),input.category)).findFirst().orElseThrow().get("id")).intValue());
            if(fresh){productId=products.addProduct(p); if(!p.isAvailable())products.updateProduct(p);} else products.updateProduct(p);
        }
        if(fresh) db.update("INSERT INTO site_content(id,kind,product_id,payload,version) VALUES(?,?,?,?,1)",id,kind,productId==0?null:productId,stringify(data));
        else db.update("UPDATE site_content SET payload=?,version=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",stringify(data),next,id);
        data.put("id",id);data.put("version",next);return data;
    }
    @Transactional public void delete(String kind,String id,long version) {
        kind(kind);var rows=db.queryForList("SELECT product_id,version FROM site_content WHERE id=? AND kind=? FOR UPDATE",id,kind);
        if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"内容已被删除");
        if(((Number)rows.get(0).get("version")).longValue()!=version)throw new ResponseStatusException(HttpStatus.CONFLICT,"内容已更新，请刷新后重试");
        if(rows.get(0).get("product_id")!=null)products.deleteProduct(((Number)rows.get(0).get("product_id")).intValue());
        db.update("DELETE FROM site_content WHERE id=?",id);
    }
    @Transactional public Map<String,Object> settings(Map<String,Object> value) {
        var input=new LinkedHashMap<String,Object>(); input.put("phone",text(Objects.toString(value.get("phone"),""),100,false));input.put("email",text(Objects.toString(value.get("email"),""),200,false));input.put("address",text(Objects.toString(value.get("address"),""),500,false));
        String email=(String)input.get("email");if(!email.isBlank()&&!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))throw bad("邮箱格式不正确");
        input.put("wecomName",text(Objects.toString(value.get("wecomName"),""),100,false));
        input.put("wecomUrl",WebsiteContacts.wecomLink(text(Objects.toString(value.get("wecomUrl"),""),500,false)));
        input.put("wecomQr",WebsiteContacts.qrImage(Objects.toString(value.get("wecomQr"),"").trim()));
        var rows=db.queryForList("SELECT version FROM site_content WHERE id='site-settings' FOR UPDATE");long version=rows.isEmpty()?0:((Number)rows.get(0).get("version")).longValue();
        if(!(value.get("version") instanceof Number) || ((Number)value.get("version")).longValue()!=version)throw new ResponseStatusException(HttpStatus.CONFLICT,"设置已更新，请刷新后重试");
        if(rows.isEmpty())db.update("INSERT INTO site_content(id,kind,payload,version) VALUES('site-settings','settings',?,1)",stringify(input));
        else db.update("UPDATE site_content SET payload=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id='site-settings'",stringify(input));
        catalog.syncContacts(input);
        input.put("version",version+1);return input;
    }
    @Transactional public void seed() throws Exception {
        if(db.queryForObject("SELECT COUNT(*) FROM site_content WHERE id='site-settings'",Integer.class)==0){
            try(var stream=new ClassPathResource("seed-content.json").getInputStream()){
                var initial=json.readTree(stream).path("settings");
                if(initial.isObject()){
                    var value=json.convertValue(initial,new TypeReference<LinkedHashMap<String,Object>>(){});
                    value.putAll(catalog.contacts());
                    value.put("version",0);settings(value);
                }
            }
        }
        if(catalog.contacts().isEmpty()){var settings=db.queryForList("SELECT payload FROM site_content WHERE id='site-settings'");if(!settings.isEmpty())catalog.syncContacts(parse(settings.get(0).get("payload").toString()));}
        migrateProducts();
        if(db.queryForObject("SELECT COUNT(*) FROM site_metadata WHERE name='initial-content-v1'",Integer.class)>0)return;
        try(var stream=new ClassPathResource("seed-content.json").getInputStream()) {
            var seed=json.readTree(stream);
            for(String kind:List.of("products","services"))for(var row:seed.path(kind)) {
                ContentInput input=json.treeToValue(row,ContentInput.class); var saved=save(kind,null,input);
                db.update("UPDATE site_content SET id=? WHERE id=?",row.path("id").asText(),saved.get("id"));
            }
        }
        db.update("INSERT INTO site_metadata(name,content_value) VALUES('initial-content-v1','complete')");
    }
    private void migrateProducts() throws Exception {
        for(var product:products.getAllProducts()) {
            if(db.queryForObject("SELECT COUNT(*) FROM site_content WHERE product_id=?",Integer.class,product.getId())>0)continue;
            var category=catalog.list("categories").stream().filter(c->((Number)c.get("id")).intValue()==product.getCategoryId()).findFirst();
            if(category.isEmpty()) {
                var pending=catalog.list("categories").stream().filter(c->"待分类".equals(c.get("name"))).findFirst();
                Map<String,Object> saved=pending.isPresent()?pending.get():catalog.save("categories",null,new LinkedHashMap<>(Map.of("name","待分类","description","请为导入的产品选择分类","enabled",true)));
                product.setCategoryId(((Number)saved.get("id")).intValue());products.updateProduct(product);category=Optional.of(saved);
            }
            var payload=new LinkedHashMap<String,Object>();payload.put("name",product.getName());payload.put("desc",Objects.toString(product.getDescription(),""));payload.put("category",category.get().get("key"));payload.put("tag","");payload.put("features",List.of());payload.put("uses","");payload.put("en","");payload.put("kind","rack");payload.put("icon","server");payload.put("published",product.isAvailable());
            db.update("INSERT INTO site_content(id,kind,product_id,payload,version) VALUES(?,'products',?,?,1)","legacy-product-"+product.getId(),product.getId(),stringify(payload));
        }
    }
}
