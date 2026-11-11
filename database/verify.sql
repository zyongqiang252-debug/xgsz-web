-- Read-only checks for the XGSZ website database.
-- Run after selecting the application database:
--   USE xgsz_website;
--   SOURCE database/verify.sql;

SELECT DATABASE() AS current_database,
       @@character_set_database AS charset_name,
       @@collation_database AS collation_name,
       @@time_zone AS time_zone;

SELECT COUNT(*) AS total_tables
FROM information_schema.tables
WHERE table_schema = DATABASE();

SELECT name, content_value
FROM site_metadata
ORDER BY name;

SELECT id, version
FROM site_page
ORDER BY id;

SELECT kind, COUNT(*) AS rows_count
FROM site_content
GROUP BY kind
ORDER BY kind;

SELECT 'Products' AS table_name, COUNT(*) AS rows_count FROM Products
UNION ALL SELECT 'ProductCategories', COUNT(*) FROM ProductCategories
UNION ALL SELECT 'site_page', COUNT(*) FROM site_page
UNION ALL SELECT 'site_content', COUNT(*) FROM site_content
UNION ALL SELECT 'site_catalog_meta', COUNT(*) FROM site_catalog_meta
UNION ALL SELECT 'site_inquiry', COUNT(*) FROM site_inquiry
UNION ALL SELECT 'site_media', COUNT(*) FROM site_media
UNION ALL SELECT 'Admins', COUNT(*) FROM Admins;
