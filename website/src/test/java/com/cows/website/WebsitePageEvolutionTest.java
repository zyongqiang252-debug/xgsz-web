package com.cows.website;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:page-evolution-tests;MODE=MySQL;DB_CLOSE_DELAY=-1"})
@AutoConfigureMockMvc
@Transactional
class WebsitePageEvolutionTest {
    @Autowired JdbcTemplate db;
    @Autowired ObjectMapper json;
    @Autowired WebsitePages pages;
    @Autowired WebsiteService service;
    @Autowired MockMvc mvc;

    @Test void existingPagesGainMissingFieldsWithoutReplacingEditedContent() throws Exception {
        var original=(ObjectNode)json.valueToTree(pages.get("products"));
        original.put("heroTitle","公司已经修改的产品标题");
        original.remove(java.util.List.of("solutionGroups","taobaoUrl","douyinUrl"));
        db.update("UPDATE site_page SET payload=? WHERE id='products'",original.toString());
        var loaded=json.valueToTree(pages.get("products"));
        assertEquals("公司已经修改的产品标题",loaded.path("heroTitle").asText());
        assertEquals(4,loaded.path("solutionGroups").size());
        assertEquals("https://www.taobao.com/",loaded.path("taobaoUrl").asText());
        assertEquals("https://www.douyin.com/",loaded.path("douyinUrl").asText());
        assertFalse(json.readTree(db.queryForObject("SELECT payload FROM site_page WHERE id='products'",String.class)).has("solutionGroups"));
    }

    @Test void nestedOfferingsAreEditableAndPageCopyIsReadOnlyFromConsole() throws Exception {
        var products=(ObjectNode)json.valueToTree(pages.get("products"));
        products.put("taobaoUrl","javascript:alert(1)");
        mvc.perform(put("/api/admin/pages/products").with(user("owner")).with(csrf()).contentType("application/json").content(products.toString())).andExpect(status().isBadRequest());
        products.put("taobaoUrl","https://www.taobao.com/");
        assertEquals(4,products.path("solutionGroups").size());
        ((ObjectNode)products.path("solutionGroups").get(1).path("groups").get(0)).put("items","裸金属交付\n后台新增部署能力");
        mvc.perform(put("/api/admin/pages/products").with(user("owner")).with(csrf()).contentType("application/json").content(products.toString())).andExpect(status().isOk());
        mvc.perform(get("/api/public/content")).andExpect(jsonPath("$.data.pages.products.solutionGroups[1].groups[0].items").value("裸金属交付\n后台新增部署能力"));
        var about=(ObjectNode)json.valueToTree(pages.get("about"));
        mvc.perform(put("/api/admin/pages/about").with(user("owner")).with(csrf()).contentType("application/json").content(about.toString())).andExpect(status().isNotFound());
        mvc.perform(get("/api/public/content")).andExpect(jsonPath("$.data.pages.about.heroTitle").exists());
    }

    @Test void suppliedPhoneIsInitialContentAndLaterChangesSurviveRestartSeeding() throws Exception {
        assertEquals("18458055296",((java.util.Map<?,?>)service.content(false).get("settings")).get("phone"));
        var settings=new java.util.LinkedHashMap<String,Object>((java.util.Map<String,Object>)service.content(true).get("settings"));
        settings.put("phone","");service.settings(settings);
        service.seed();
        assertEquals("",((java.util.Map<?,?>)service.content(false).get("settings")).get("phone"));
    }
}
