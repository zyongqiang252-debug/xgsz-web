package com.cows.website;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import java.util.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:cms-tests;MODE=MySQL;DB_CLOSE_DELAY=-1"})
@AutoConfigureMockMvc
class WebsiteCmsTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Test void showcaseConsoleExcludesCustomerTransactions() throws Exception {
        var definitions=read("/api/admin/cms").path("modules");
        assertTrue(definitions.has("admins"));
        for(String kind:java.util.List.of("users","orders","locations")){
            assertFalse(definitions.has(kind));
            mvc.perform(get("/api/admin/catalog/"+kind).with(user("owner"))).andExpect(status().isNotFound());
            mvc.perform(post("/api/admin/catalog/"+kind).with(user("owner")).with(csrf()).contentType("application/json").content("{}")).andExpect(status().isNotFound());
            mvc.perform(put("/api/admin/catalog/"+kind+"/1").with(user("owner")).with(csrf()).contentType("application/json").content("{}")).andExpect(status().isNotFound());
            mvc.perform(delete("/api/admin/catalog/"+kind+"/1?version=1").with(user("owner")).with(csrf())).andExpect(status().isNotFound());
        }
        assertEquals(Set.of("products"),fieldNames(read("/api/admin/cms").path("pages")));
    }
    Set<String> fieldNames(JsonNode object) {
        var names=new LinkedHashSet<String>();object.fieldNames().forEachRemaining(names::add);return names;
    }
    JsonNode read(String path) throws Exception {
        return json.readTree(mvc.perform(get(path).with(user("owner"))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("data");
    }
    JsonNode create(String kind, String payload) throws Exception {
        return json.readTree(mvc.perform(post("/api/admin/catalog/"+kind).with(user("owner")).with(csrf()).contentType("application/json").content(payload))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).path("data");
    }
    @Test void catalogUsesOriginalModulesAndCategoryEditsReachPublicContent() throws Exception {
        JsonNode category=create("categories","{\"name\":\"边缘计算\",\"description\":\"新分类\",\"enabled\":true}");
        assertTrue(category.path("id").asInt()>0);
        String id=category.path("id").asText();
        mvc.perform(put("/api/admin/catalog/categories/"+id).with(user("owner")).with(csrf()).contentType("application/json")
            .content("{\"name\":\"边缘计算更新\",\"description\":\"新分类\",\"enabled\":true,\"version\":1}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.version").value(2));
        mvc.perform(put("/api/admin/catalog/categories/"+id).with(user("owner")).with(csrf()).contentType("application/json")
            .content("{\"name\":\"过期覆盖\",\"version\":1}" )).andExpect(status().isConflict());
        var content=read("/api/public/content");
        assertTrue(content.path("categories").toString().contains("边缘计算更新"));
        JsonNode product=json.readTree(mvc.perform(post("/api/admin/products").with(user("owner")).with(csrf()).contentType("application/json")
            .content("{\"name\":\"边缘产品\",\"desc\":\"按数据库分类\",\"category\":\""+category.path("key").asText()+"\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).path("data");
        mvc.perform(delete("/api/admin/catalog/categories/"+id+"?version=2").with(user("owner")).with(csrf())).andExpect(status().isConflict());
        mvc.perform(delete("/api/admin/products/"+product.path("id").asText()+"?version=1").with(user("owner")).with(csrf())).andExpect(status().isOk());
        mvc.perform(delete("/api/admin/catalog/categories/"+id+"?version=2").with(user("owner")).with(csrf())).andExpect(status().isOk());
    }
    @Test void onlyBusinessPageCopyIsEditableFromConsole() throws Exception {
        var content=read("/api/public/content");
        for(String key:List.of("global","home","services","partners","about","contact")) {
            assertTrue(content.path("pages").has(key));
            mvc.perform(get("/api/admin/pages/"+key).with(user("owner"))).andExpect(status().isNotFound());
            mvc.perform(put("/api/admin/pages/"+key).with(user("owner")).with(csrf()).contentType("application/json").content("{}"))
                .andExpect(status().isNotFound());
        }
        var product=read("/api/admin/pages/products");
        var value=(com.fasterxml.jackson.databind.node.ObjectNode)product.deepCopy();
        String original=value.path("taobaoUrl").asText();
        value.put("taobaoUrl","https://shop.example.com/console-test");
        try {
            mvc.perform(put("/api/admin/pages/products").with(user("owner")).with(csrf()).contentType("application/json").content(json.writeValueAsString(value)))
                .andExpect(status().isOk());
            mvc.perform(get("/api/public/content")).andExpect(jsonPath("$.data.pages.products.taobaoUrl").value("https://shop.example.com/console-test"));
        } finally {
            var latest=read("/api/admin/pages/products");
            var restore=(com.fasterxml.jackson.databind.node.ObjectNode)latest.deepCopy();
            restore.put("taobaoUrl",original);
            mvc.perform(put("/api/admin/pages/products").with(user("owner")).with(csrf()).contentType("application/json").content(json.writeValueAsString(restore)))
                .andExpect(status().isOk());
        }
    }
    @Test void originalBusinessModulesRoundTripWithoutPublishingPrivateRecords() throws Exception {
        for(var pair: new String[][]{
            {"brands","{\"name\":\"测试品牌\",\"description\":\"真实品牌介绍\",\"logo\":\"/assets/xgsz-logo.jpg\"}"},
            {"certificates","{\"name\":\"授权测试\",\"description\":\"证书介绍\",\"imageUrl\":\"/assets/xgsz-logo.jpg\"}"},
            {"carousels","{\"title\":\"数据库轮播\",\"order\":2,\"enabled\":true,\"imageUrl\":\"/assets/datacenter-hero.webp\",\"redirectUrl\":\"#/products\"}"},
            {"abouts","{\"description\":\"公司展示图片\",\"imageUrl\":\"/assets/xgsz-logo.jpg\"}"},
            {"businesses","{\"name\":\"集成交付合作\",\"description\":\"数据库里的合作方向\",\"contactInfo\":\"提交合作咨询\"}"}
        }) {
            JsonNode row=create(pair[0],pair[1]); assertTrue(row.path("id").asInt()>0);
            var records=read("/api/admin/catalog/"+pair[0]);
            assertTrue(java.util.stream.StreamSupport.stream(records.spliterator(),false).anyMatch(record->record.path("id").asInt()==row.path("id").asInt()));
        }
        var content=read("/api/public/content");
        assertTrue(content.path("carousels").toString().contains("数据库轮播"));
        assertTrue(content.path("businesses").toString().contains("集成交付合作"));
        assertFalse(content.has("users")); assertFalse(content.has("orders")); assertFalse(content.has("admins"));
    }
    @Test void managementRequiresLoginAndRejectsUnsafeUploadsAndLinks() throws Exception {
        mvc.perform(get("/api/admin/catalog/brands")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/admin/catalog/brands").with(user("owner")).contentType("application/json").content("{}" )).andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/catalog/carousels").with(user("owner")).with(csrf()).contentType("application/json")
            .content("{\"title\":\"危险链接\",\"imageUrl\":\"/assets/xgsz-logo.jpg\",\"redirectUrl\":\"javascript:alert(1)\"}" )).andExpect(status().isBadRequest());
        var file=new org.springframework.mock.web.MockMultipartFile("file","bad.png","image/png","not an image".getBytes());
        mvc.perform(multipart("/api/admin/media").file(file).with(user("owner")).with(csrf())).andExpect(status().isBadRequest());
        var image=new java.awt.image.BufferedImage(8,8,java.awt.image.BufferedImage.TYPE_INT_RGB);
        var bytes=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(image,"png",bytes);
        var valid=new org.springframework.mock.web.MockMultipartFile("file","../../test.png","image/png",bytes.toByteArray());
        var saved=json.readTree(mvc.perform(multipart("/api/admin/media").file(valid).with(user("owner")).with(csrf())).andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString()).path("data");
        assertTrue(saved.path("url").asText().startsWith("/media/"));
        mvc.perform(get(saved.path("url").asText())).andExpect(status().isOk()).andExpect(content().contentType("image/png"));
    }
    @Test void disabledCategoriesCannotBeAssigned() throws Exception {
        var category=create("categories","{\"name\":\"已停用分类\",\"description\":\"\",\"enabled\":false}");
        mvc.perform(post("/api/admin/products").with(user("owner")).with(csrf()).contentType("application/json")
            .content("{\"name\":\"不能发布\",\"desc\":\"停用分类\",\"category\":\""+category.path("key").asText()+"\"}"))
            .andExpect(status().isBadRequest());
        assertFalse(read("/api/public/content").has("locations"));
    }
    @Test void systemStatusIsReadOnlyAndAvailableToAdministrators() throws Exception {
        mvc.perform(get("/api/admin/system")).andExpect(status().isUnauthorized());
        var data=json.readTree(mvc.perform(get("/api/admin/system").with(user("owner")))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("data");
        assertTrue(data.path("database").has("product"));
        assertEquals(20,data.path("tables").size());
        assertTrue(data.path("tables").toString().contains("site_page"));
        assertTrue(data.path("checks").toString().contains("数据表结构"));
        assertTrue(data.path("pages").size()>0);
        assertFalse(data.toString().contains("password"));
        assertFalse(data.toString().contains("XGSZ_DATABASE_PASSWORD"));
    }
    @Test void consoleSectionsCoverBusinessPageFields() throws Exception {
        var pages=json.readTree(getClass().getResourceAsStream("/cms-pages.json"));
        var definition=pages.path("products");
        var editable=new LinkedHashSet<String>();definition.path("adminFields").forEach(field->editable.add(field.asText()));
        var fields=new LinkedHashSet<String>();definition.path("fields").forEach(field->fields.add(field.path("key").asText()));
        var covered=new LinkedHashSet<String>();
        definition.path("sections").forEach(section->section.path("fields").forEach(field->{if(editable.contains(field.asText()))covered.add(field.asText());}));
        assertTrue(fields.containsAll(editable));
        assertEquals(editable,covered,"业务页面的控制台分组字段不一致");
    }
}
