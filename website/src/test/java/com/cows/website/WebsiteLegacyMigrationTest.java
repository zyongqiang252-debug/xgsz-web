package com.cows.website;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import java.util.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:migration-tests;MODE=MySQL;DB_CLOSE_DELAY=-1"})
@AutoConfigureMockMvc
class WebsiteLegacyMigrationTest {
    @Autowired JdbcTemplate db;@Autowired WebsiteCatalog catalog;@Autowired WebsiteService service;@Autowired ObjectMapper json;@Autowired PasswordEncoder passwords;@Autowired MockMvc mvc;
    @Test void legacyAdministratorsMigrateOnceAndExistingProductsGainEditableWrappers() throws Exception {
        db.update("DELETE FROM site_metadata WHERE name='cms-admin-migrated-v1'");
        db.update("INSERT INTO site_admin(username,password_hash) VALUES('legacy-owner',?)",passwords.encode("Legacy-password-12"));
        db.update("INSERT INTO Admins(userName,password) VALUES('original-owner','Original-password-12')");
        db.update("INSERT INTO Products(name,description,categoryId,brand) VALUES('原产品表存量记录','从原框架导入',1,'原品牌')");
        catalog.seed();service.seed();
        assertTrue(passwords.matches("Legacy-password-12",db.queryForObject("SELECT password FROM Admins WHERE userName='legacy-owner'",String.class)));
        assertTrue(passwords.matches("Original-password-12",db.queryForObject("SELECT password FROM Admins WHERE userName='original-owner'",String.class)));
        assertTrue(service.content(true).get("products").toString().contains("原产品表存量记录"));
        db.update("UPDATE Admins SET userName='renamed-owner' WHERE userName='legacy-owner'");catalog.seed();
        assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM Admins WHERE userName='legacy-owner'",Integer.class));
    }
    @Test @org.springframework.transaction.annotation.Transactional void originalBasicInformationContactFieldsSurviveCopyrightEditsAndContactSaves() throws Exception {
        db.update("DELETE FROM site_catalog_meta WHERE kind='basicInformation'");
        db.update("DELETE FROM BasicInformation");
        var info=new com.cows.entity.BasicInformation();info.setPhone("400-111-2222");info.setEmail("old@example.com");info.setAddress("旧地址");info.setEnable(true);info.setIcp("旧备案");
        db.update("INSERT INTO BasicInformation(phone,email,address,icp,isEnable) VALUES('400-111-2222','old@example.com','旧地址','旧备案',1)");
        long id=db.queryForObject("SELECT MAX(id) FROM BasicInformation",Long.class);
        catalog.save("basicInformation",(int)id,new LinkedHashMap<>(Map.of("icp","更新备案","publicSecurity","","copyright","","beianImage","","enable",true,"version",1)));
        assertEquals("400-111-2222",db.queryForObject("SELECT phone FROM BasicInformation WHERE id=?",String.class,id));
        var settings=(Map<String,Object>)service.content(true).get("settings");
        service.settings(new LinkedHashMap<>(Map.of("version",settings.get("version"),"phone","400-999-8888","email","new@example.com","address","新地址")));
        assertEquals("400-999-8888",db.queryForObject("SELECT phone FROM BasicInformation WHERE id=?",String.class,id));
        assertEquals("更新备案",db.queryForObject("SELECT icp FROM BasicInformation WHERE id=?",String.class,id));
    }
    @Test void customersOrdersRecommendationsAndAdministratorRevocationUseRealData() throws Exception {
        var customer=catalog.save("users",null,new LinkedHashMap<>(Map.of("userName","disabled-customer","password","Customer-password-12","enable",false)));
        assertEquals(false,customer.get("enable"));assertFalse(customer.containsKey("password"));
        var order=catalog.save("orders",null,new LinkedHashMap<>(Map.of("userId",customer.get("id"),"totalPrice",12.50,"status","待确认")));
        assertTrue(((Number)order.get("id")).intValue()>0);
        var ids=db.queryForList("SELECT id FROM Products WHERE isDeleted=0",Integer.class);
        var group=catalog.save("productCarousels",null,new LinkedHashMap<>(Map.of("products",ids.subList(0,1))));
        assertEquals(ids.get(0),((List<?>)group.get("products")).get(0));
        var admin=catalog.save("admins",null,new LinkedHashMap<>(Map.of("userName","revoke-admin","password","Revoke-password-12","enable",true)));
        catalog.save("admins",null,new LinkedHashMap<>(Map.of("userName","keep-admin","password","Keep-password-123","enable",true)));
        var login=mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json").content("{\"username\":\"revoke-admin\",\"password\":\"Revoke-password-12\"}")).andExpect(status().isOk()).andReturn();
        var session=(org.springframework.mock.web.MockHttpSession)login.getRequest().getSession(false);
        var input=new LinkedHashMap<>(admin);input.put("password","");input.put("enable",false);
        mvc.perform(put("/api/admin/catalog/admins/"+admin.get("id")).with(user("owner")).with(csrf()).contentType("application/json").content(json.writeValueAsString(input))).andExpect(status().isOk());
        assertTrue(session.isInvalid());
        mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json").content("{\"username\":\"revoke-admin\",\"password\":\"Revoke-password-12\"}")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/admin/catalog/admins").with(user("owner")).with(csrf()).contentType("application/json").content(json.writeValueAsString(Map.of("userName","bad-password-admin","password","a".repeat(65))))).andExpect(status().isBadRequest());
    }
    @Test void requestsRejectSessionsThatMissedTheAccountRevocationSnapshot() throws Exception {
        catalog.save("admins",null,new LinkedHashMap<>(Map.of("userName","racing-admin","password","Racing-password-12","enable",true)));
        var login=mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json").content("{\"username\":\"racing-admin\",\"password\":\"Racing-password-12\"}")).andExpect(status().isOk()).andReturn();
        var session=(org.springframework.mock.web.MockHttpSession)login.getRequest().getSession(false);
        db.update("UPDATE Admins SET isEnable=0 WHERE userName='racing-admin'");
        mvc.perform(get("/api/admin/content").session(session)).andExpect(status().isUnauthorized());
    }
}
