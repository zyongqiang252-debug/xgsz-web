package com.cows.website;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:website-tests;MODE=MySQL;DB_CLOSE_DELAY=-1"})
@AutoConfigureMockMvc
class WebsiteIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired org.springframework.jdbc.core.JdbcTemplate db;

    @Test @org.springframework.transaction.annotation.Transactional
    void healthWaitsForInitialContent() throws Exception {
        db.update("DELETE FROM site_metadata WHERE name='initial-content-v1'");
        mvc.perform(get("/api/health")).andExpect(status().isServiceUnavailable());
    }

    @Test void healthReportsTheConnectedDatabase() throws Exception {
        mvc.perform(get("/api/health")).andExpect(status().isOk())
            .andExpect(jsonPath("$.data.database").value("H2"));
    }

    @Test void publicContentContainsSeedProductsWithoutPrivateFields() throws Exception {
        mvc.perform(get("/api/public/content")).andExpect(status().isOk()).andExpect(jsonPath("$.data.products.length()").value(3)).andExpect(jsonPath("$.data.products[0].name").isString()).andExpect(jsonPath("$.data.products[0].costPrice").doesNotExist());
    }
    @Test void managementRequiresAuthenticationAndCsrf() throws Exception {
        mvc.perform(get("/api/admin/content")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/admin/products").with(user("manager")).contentType("application/json").content("{}")).andExpect(status().isForbidden());
    }
    @Test void companyContactsPersistPubliclyAndRejectUnsafeWecomContent() throws Exception {
        var content=json.readTree(mvc.perform(get("/api/admin/content").with(user("manager"))).andReturn().getResponse().getContentAsString()).path("data").path("settings");
        long version=content.path("version").asLong();
        var input=new java.util.LinkedHashMap<String,Object>();
        input.put("version",version);input.put("phone","400-123-4567");input.put("wecomName","芯光商务 & 技术");input.put("wecomUrl","https://work.weixin.qq.com/kfid/test-contact");input.put("wecomQr","");
        mvc.perform(put("/api/admin/settings").with(user("manager")).with(csrf()).contentType("application/json").content(json.writeValueAsString(input))).andExpect(status().isOk());
        mvc.perform(get("/api/public/content")).andExpect(jsonPath("$.data.settings.wecomName").value("芯光商务 & 技术")).andExpect(jsonPath("$.data.settings.wecomUrl").value(input.get("wecomUrl")));
        input.put("version",version+1);input.put("wecomUrl","javascript:alert(1)");
        mvc.perform(put("/api/admin/settings").with(user("manager")).with(csrf()).contentType("application/json").content(json.writeValueAsString(input))).andExpect(status().isBadRequest());
        input.put("wecomUrl","");input.put("wecomQr","data:image/svg+xml;base64,PHN2Zy8+");
        mvc.perform(put("/api/admin/settings").with(user("manager")).with(csrf()).contentType("application/json").content(json.writeValueAsString(input))).andExpect(status().isBadRequest());
        var bitmap=new java.awt.image.BufferedImage(16,16,java.awt.image.BufferedImage.TYPE_INT_RGB);
        var bytes=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(bitmap,"png",bytes);
        input.put("wecomQr","data:image/png;base64,"+java.util.Base64.getEncoder().encodeToString(bytes.toByteArray()));
        mvc.perform(put("/api/admin/settings").with(user("manager")).with(csrf()).contentType("application/json").content(json.writeValueAsString(input))).andExpect(status().isOk()).andExpect(jsonPath("$.data.wecomQr").isString());
        input.put("version",version+2);input.put("phone","");input.put("wecomName","");input.put("wecomQr","");
        mvc.perform(put("/api/admin/settings").with(user("manager")).with(csrf()).contentType("application/json").content(json.writeValueAsString(input))).andExpect(status().isOk());
        mvc.perform(get("/api/public/content")).andExpect(jsonPath("$.data.settings.wecomName").value("")).andExpect(jsonPath("$.data.settings.wecomQr").value(""));
    }
    @Test void firstAdminSetupLoginAndLogoutAreRealServerSessions() throws Exception {
        var credentials="{\"username\":\"website-owner\",\"password\":\"Integration-only-Password!\"}";
        mvc.perform(post("/api/auth/setup").with(csrf()).contentType("application/json").content(credentials)).andExpect(status().isOk());
        mvc.perform(post("/api/auth/setup").with(csrf()).contentType("application/json").content(credentials)).andExpect(status().isConflict());
        mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json").content("{\"username\":\"website-owner\",\"password\":\"incorrect\"}")).andExpect(status().isUnauthorized());
        var login=mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json").content(credentials)).andExpect(status().isOk()).andReturn();
        var session=(org.springframework.mock.web.MockHttpSession)login.getRequest().getSession(false);
        mvc.perform(get("/api/admin/content").session(session)).andExpect(status().isOk());
        mvc.perform(post("/api/auth/logout").session(session).with(csrf())).andExpect(status().isOk());
        mvc.perform(get("/api/admin/content")).andExpect(status().isUnauthorized());
    }
    @Test void writesUseUpstreamProductServiceAndOptimisticVersions() throws Exception {
        String payload="{\"name\":\"测试服务器\",\"desc\":\"集成测试\",\"category\":\"gpu\",\"features\":[\"测试\"],\"published\":false}";
        var added=mvc.perform(post("/api/admin/products").with(user("manager")).with(csrf()).contentType("application/json").content(payload)).andExpect(status().isCreated()).andReturn();
        var product=json.readTree(added.getResponse().getContentAsString()).path("data");
        String id=product.path("id").asText();
        mvc.perform(get("/api/public/content")).andExpect(jsonPath("$.data.products[?(@.id=='"+id+"')]").isEmpty());
        String update=payload.substring(0,payload.length()-1)+",\"version\":1}";
        mvc.perform(put("/api/admin/products/"+id).with(user("manager")).with(csrf()).contentType("application/json").content(update)).andExpect(status().isOk()).andExpect(jsonPath("$.data.version").value(2));
        mvc.perform(put("/api/admin/products/"+id).with(user("manager")).with(csrf()).contentType("application/json").content(update)).andExpect(status().isConflict());
        mvc.perform(delete("/api/admin/products/"+id+"?version=2").with(user("manager")).with(csrf())).andExpect(status().isOk());
    }
    @Test void inquiryIsValidatedStoredAndOnlyVisibleToManagers() throws Exception {
        mvc.perform(post("/api/public/inquiries").with(csrf()).contentType("application/json").content("{\"name\":\"访客\"}")).andExpect(status().isBadRequest());
        mvc.perform(post("/api/public/inquiries").with(csrf()).contentType("application/json").content("{\"name\":\"访客\",\"phone\":\"13800138000\",\"company\":\"企业\",\"intent\":\"GPU方案\",\"message\":\"整机需求\",\"consent\":true}")).andExpect(status().isCreated()).andExpect(jsonPath("$.data.id").isString());
        mvc.perform(get("/api/admin/inquiries")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/inquiries").with(user("manager"))).andExpect(status().isOk()).andExpect(jsonPath("$.data[0].company").value("企业"));
    }
}
