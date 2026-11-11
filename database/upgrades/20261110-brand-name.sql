SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

START TRANSACTION;

SET @xgsz_brand_rename = NOT EXISTS (SELECT 1 FROM site_metadata WHERE name='company-name-20261110');

SET @xgsz_old_name = '芯光数智';

SET @xgsz_new_name = '芯光智数';

UPDATE site_page SET payload=REPLACE(payload,@xgsz_old_name,@xgsz_new_name),version=version+1 WHERE @xgsz_brand_rename AND payload LIKE CONCAT('%',@xgsz_old_name,'%');

UPDATE site_content SET payload=REPLACE(payload,@xgsz_old_name,@xgsz_new_name),version=version+1,updated_at=CURRENT_TIMESTAMP(6) WHERE @xgsz_brand_rename AND payload LIKE CONCAT('%',@xgsz_old_name,'%');

UPDATE site_catalog_meta SET payload=REPLACE(payload,@xgsz_old_name,@xgsz_new_name),version=version+1 WHERE @xgsz_brand_rename AND payload LIKE CONCAT('%',@xgsz_old_name,'%');

UPDATE Products SET name=REPLACE(name,@xgsz_old_name,@xgsz_new_name),description=REPLACE(description,@xgsz_old_name,@xgsz_new_name),brand=REPLACE(brand,@xgsz_old_name,@xgsz_new_name),updateTime=CURRENT_TIMESTAMP WHERE @xgsz_brand_rename AND (name LIKE CONCAT('%',@xgsz_old_name,'%') OR description LIKE CONCAT('%',@xgsz_old_name,'%') OR brand LIKE CONCAT('%',@xgsz_old_name,'%'));

UPDATE ProductCategories SET name=REPLACE(name,@xgsz_old_name,@xgsz_new_name),description=REPLACE(description,@xgsz_old_name,@xgsz_new_name),updateTime=CURRENT_TIMESTAMP WHERE @xgsz_brand_rename AND (name LIKE CONCAT('%',@xgsz_old_name,'%') OR description LIKE CONCAT('%',@xgsz_old_name,'%'));

UPDATE Brands SET name=REPLACE(name,@xgsz_old_name,@xgsz_new_name),description=REPLACE(description,@xgsz_old_name,@xgsz_new_name),updateTime=CURRENT_TIMESTAMP WHERE @xgsz_brand_rename AND (name LIKE CONCAT('%',@xgsz_old_name,'%') OR description LIKE CONCAT('%',@xgsz_old_name,'%'));

UPDATE BrandAuthorizationCertificates SET name=REPLACE(name,@xgsz_old_name,@xgsz_new_name),description=REPLACE(description,@xgsz_old_name,@xgsz_new_name),updateTime=CURRENT_TIMESTAMP WHERE @xgsz_brand_rename AND (name LIKE CONCAT('%',@xgsz_old_name,'%') OR description LIKE CONCAT('%',@xgsz_old_name,'%'));

UPDATE Carousels SET title=REPLACE(title,@xgsz_old_name,@xgsz_new_name),updateTime=CURRENT_TIMESTAMP WHERE @xgsz_brand_rename AND title LIKE CONCAT('%',@xgsz_old_name,'%');

UPDATE About SET description=REPLACE(description,@xgsz_old_name,@xgsz_new_name),updateTime=CURRENT_TIMESTAMP WHERE @xgsz_brand_rename AND description LIKE CONCAT('%',@xgsz_old_name,'%');

UPDATE Businesses SET name=REPLACE(name,@xgsz_old_name,@xgsz_new_name),description=REPLACE(description,@xgsz_old_name,@xgsz_new_name),contactInfo=REPLACE(contactInfo,@xgsz_old_name,@xgsz_new_name),updateTime=CURRENT_TIMESTAMP WHERE @xgsz_brand_rename AND (name LIKE CONCAT('%',@xgsz_old_name,'%') OR description LIKE CONCAT('%',@xgsz_old_name,'%') OR contactInfo LIKE CONCAT('%',@xgsz_old_name,'%'));

UPDATE BasicInformation SET homeTitle=REPLACE(homeTitle,@xgsz_old_name,@xgsz_new_name),homeDescription=REPLACE(homeDescription,@xgsz_old_name,@xgsz_new_name),copyright=REPLACE(copyright,@xgsz_old_name,@xgsz_new_name) WHERE @xgsz_brand_rename AND (homeTitle LIKE CONCAT('%',@xgsz_old_name,'%') OR homeDescription LIKE CONCAT('%',@xgsz_old_name,'%') OR copyright LIKE CONCAT('%',@xgsz_old_name,'%'));

INSERT INTO site_metadata(name,content_value) SELECT 'company-name-20261110','complete' WHERE @xgsz_brand_rename;

COMMIT;
