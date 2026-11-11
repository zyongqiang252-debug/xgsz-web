package com.cows.website;

import java.net.URI;
import java.util.Base64;
import java.util.Locale;
import java.util.Set;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

final class WebsiteContacts {
    private WebsiteContacts() {}
    static String wecomLink(String value) {
        if(value.isBlank())return "";
        try {
            URI uri=URI.create(value);
            if("https".equalsIgnoreCase(uri.getScheme()) && uri.getUserInfo()==null && (uri.getPort()==-1||uri.getPort()==443) && Set.of("work.weixin.qq.com","qw.qq.com").contains(uri.getHost()==null?"":uri.getHost().toLowerCase(Locale.ROOT)))return value;
        } catch(IllegalArgumentException ignored) {}
        throw invalid("请填写 HTTPS 企业微信客户联系链接（work.weixin.qq.com 或 qw.qq.com）");
    }
    static String qrImage(String value) {
        if(value.isBlank())return "";
        if(value.length()>720000 || !value.matches("^data:image/(png|jpeg);base64,[A-Za-z0-9+/=]+$"))throw invalid("二维码仅支持 512KB 以内的 PNG 或 JPG 图片");
        try {
            byte[] bytes=Base64.getDecoder().decode(value.substring(value.indexOf(',')+1));
            if(bytes.length>512*1024)throw invalid("二维码图片不能超过 512KB");
            try(var stream=ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
                var readers=ImageIO.getImageReaders(stream);
                if(!readers.hasNext())throw invalid("二维码图片无法读取");
                var reader=readers.next();
                try {
                    reader.setInput(stream);
                    if(!Set.of("png","jpeg","jpg").contains(reader.getFormatName().toLowerCase(Locale.ROOT)))throw invalid("二维码仅支持 PNG 或 JPG 图片");
                    if(reader.getWidth(0)>2048 || reader.getHeight(0)>2048)throw invalid("二维码图片长宽不能超过 2048 像素");
                    var bitmap=reader.read(0);
                    var output=new ByteArrayOutputStream();ImageIO.write(bitmap,"png",output);
                    if(output.size()>512*1024)throw invalid("二维码图片过大，请压缩后上传");
                    return "data:image/png;base64,"+Base64.getEncoder().encodeToString(output.toByteArray());
                } finally {reader.dispose();}
            }
        } catch(ResponseStatusException error){throw error;}
          catch(Exception error){throw invalid("二维码图片无法读取，请重新选择 PNG 或 JPG 图片");}
    }
    private static ResponseStatusException invalid(String message){return new ResponseStatusException(HttpStatus.BAD_REQUEST,message);}
}
