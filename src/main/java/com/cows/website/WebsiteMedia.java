package com.cows.website;

import com.cows.commons.api.BaseResponse;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import javax.imageio.ImageIO;
import java.io.*;
import java.net.URI;
import java.util.*;

@RestController
public class WebsiteMedia {
    private final JdbcTemplate db;
    public WebsiteMedia(JdbcTemplate db){this.db=db;}
    static String safeLink(String value) {
        if(value.isEmpty())return value;
        if(value.chars().anyMatch(c->c<32)||value.contains("\\"))throw bad("链接格式不正确");
        if(value.startsWith("#/")||value.startsWith("/")&&!value.startsWith("//"))return value;
        try {var uri=URI.create(value);if(uri.getScheme().equals("https")&&uri.getHost()!=null&&uri.getUserInfo()==null)return value;}
        catch(Exception ignored){}
        throw bad("请使用站内路径或 HTTPS 链接");
    }
    static String safeImage(String value) {
        if(value.isEmpty())return value;
        if(value.matches("/(assets|media)/[a-zA-Z0-9._-]+"))return value;
        if(value.startsWith("https://"))return safeLink(value);
        throw bad("请上传图片或使用 HTTPS 图片地址");
    }
    private static ResponseStatusException bad(String message){return new ResponseStatusException(HttpStatus.BAD_REQUEST,message);}
    @GetMapping("/api/admin/media") Object list(){return BaseResponse.success(db.query("SELECT id,name,created_at FROM site_media ORDER BY created_at DESC",(rs,i)->Map.of("id",rs.getString(1),"url","/media/"+rs.getString(1)+".png","name",rs.getString(2),"date",rs.getTimestamp(3).toInstant().toString())));}
    @PostMapping("/api/admin/media") @ResponseStatus(HttpStatus.CREATED)
    Object upload(@RequestParam("file") MultipartFile file) throws IOException {
        if(file.isEmpty()||file.getSize()>5*1024*1024)throw bad("请选择5MB以内的图片");
        byte[] encoded;
        try(var input=ImageIO.createImageInputStream(new ByteArrayInputStream(file.getBytes()))) {
            var readers=ImageIO.getImageReaders(input);if(!readers.hasNext())throw bad("图片内容无效");
            var reader=readers.next();
            try {
                reader.setInput(input);String format=reader.getFormatName().toLowerCase(Locale.ROOT);
                if(!Set.of("png","jpeg","jpg","bmp").contains(format))throw bad("支持 PNG、JPG、BMP 图片");
                int width=reader.getWidth(0),height=reader.getHeight(0);
                if(width<1||height<1||width>4096||height>4096||(long)width*height>16000000)throw bad("图片长宽不能超过4096像素");
                var bitmap=reader.read(0);var output=new ByteArrayOutputStream();ImageIO.write(bitmap,"png",output);encoded=output.toByteArray();
                if(encoded.length>10*1024*1024)throw bad("图片解码后过大，请压缩图片");
            } finally {reader.dispose();}
        } catch(ResponseStatusException e){throw e;} catch(Exception e){throw bad("图片无法读取");}
        String id=UUID.randomUUID().toString();String filename=Objects.toString(file.getOriginalFilename(),"图片").replace('\\','/');filename=filename.substring(filename.lastIndexOf('/')+1);if(filename.length()>200)filename=filename.substring(filename.length()-200);
        db.update("INSERT INTO site_media(id,name,content_type,bytes) VALUES(?,?,?,?)",id,filename,"image/png",encoded);
        return BaseResponse.success(Map.of("id",id,"name",filename,"url","/media/"+id+".png"));
    }
    @GetMapping("/media/{id:[a-f0-9-]+}.png") ResponseEntity<byte[]> image(@PathVariable String id) {
        var images=db.query("SELECT bytes FROM site_media WHERE id=?",(rs,i)->rs.getBytes(1),id);
        if(images.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"图片不存在");
        return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG).cacheControl(CacheControl.maxAge(java.time.Duration.ofDays(365)).cachePublic()).header("X-Content-Type-Options","nosniff").body(images.get(0));
    }
}
