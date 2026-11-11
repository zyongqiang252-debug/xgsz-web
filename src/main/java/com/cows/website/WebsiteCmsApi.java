package com.cows.website;

import com.cows.commons.api.BaseResponse;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
public class WebsiteCmsApi {
    private static final Set<String> REMOVED_MODULES=Set.of("users","orders","locations");
    private final WebsiteCatalog catalog;private final WebsitePages pages;
    public WebsiteCmsApi(WebsiteCatalog catalog,WebsitePages pages){this.catalog=catalog;this.pages=pages;}
    private void checkModule(String kind){if(REMOVED_MODULES.contains(kind))throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND,"管理栏目不存在");}
    @GetMapping("/cms") Object definitions(){var modules=new LinkedHashMap<>(catalog.definitions());REMOVED_MODULES.forEach(modules::remove);return BaseResponse.success(Map.of("modules",modules,"pages",pages.definitions()));}
    @GetMapping("/catalog/{kind}") Object list(@PathVariable String kind){checkModule(kind);return BaseResponse.success(catalog.list(kind));}
    @PostMapping("/catalog/{kind}") @ResponseStatus(HttpStatus.CREATED)
    Object create(@PathVariable String kind,@RequestBody Map<String,Object> value) throws Exception{checkModule(kind);return BaseResponse.success(catalog.save(kind,null,value));}
    @PutMapping("/catalog/{kind}/{id}") Object save(@PathVariable String kind,@PathVariable int id,@RequestBody Map<String,Object> value) throws Exception{checkModule(kind);return BaseResponse.success(catalog.save(kind,id,value));}
    @DeleteMapping("/catalog/{kind}/{id}") Object delete(@PathVariable String kind,@PathVariable int id,@RequestParam long version){checkModule(kind);catalog.delete(kind,id,version);return BaseResponse.success();}
    @GetMapping("/pages/{key}") Object page(@PathVariable String key){return BaseResponse.success(pages.adminGet(key));}
    @PutMapping("/pages/{key}") Object page(@PathVariable String key,@RequestBody Map<String,Object> value) throws Exception{return BaseResponse.success(pages.adminSave(key,value));}
}
