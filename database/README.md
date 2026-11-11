# MySQL 数据库交付

使用 MySQL 8.0+。`create-database.sql` 创建示例数据库 `xgsz_website`；根目录 `init.sql` 包含全部 20 张表和公开初始内容，和当前官网后端配套。

## 首次导入

在仓库根目录进入 MySQL 客户端，输入自己的数据库管理账号密码：

```sh
mysql --default-character-set=utf8mb4 -u root -p
```

依次执行（适用于 Windows、Linux 和 macOS 的 MySQL 客户端）：

```sql
SOURCE database/create-database.sql;
USE xgsz_website;
SOURCE init.sql;
```

可将数据库名改为公司的实际数据库名。`init.sql` 不绑定库名，执行前必须先 `USE` 目标数据库。为应用单独创建数据库账号并授予该库的读写权限，例如在同一台机器部署时：

```sql
CREATE USER 'xgsz_website'@'localhost' IDENTIFIED BY '替换为公司实际设置的强密码';
GRANT SELECT, INSERT, UPDATE, DELETE ON xgsz_website.* TO 'xgsz_website'@'localhost';
```

执行前替换示例密码；已有账号则使用其现有配置。数据库独立部署时，账号允许连接的主机应改为应用服务器的实际来源。应用连接参数见 [部署说明](../docs/部署说明.md)，应用不需要数据库 root 权限。

SQL 包含 3 个产品分类、3 项产品、4 项服务、3 项合作方向、7 组页面内容和已确认的业务电话。产品页面含四个业务方向及细分目录；关于页面含四条可核实的官网建设项目动态；邮箱、地址和企业微信留空。未写入任何管理员密码、客户、订单、咨询、测试账号或服务器运行数据。首次访问 `/admin.html` 时自行创建管理员。

已有数据时会跳过整套初始内容，不覆盖已修改内容，不重新生成已删除内容。建表使用 `IF NOT EXISTS`，初始内容在事务中写入。该文件用于新部署，不是旧框架数据库的结构升级脚本；对已有旧库操作前应单独评估结构并备份。

## 既有官网更新至四业务方向版本

2026-11-09 之前的官网实例应先备份数据库，再在目标库执行：

```sql
SOURCE database/upgrades/20261109-business-directory.sql;
```

该脚本只调整首页四个业务入口和页脚业务范围、补充产品与关于页面的新字段，并将业务电话设为本轮确认的号码；保留已有页面其他文案、产品、图片、咨询及管理员。包含一次性执行标记，重复执行不再次覆盖后续编辑。新部署直接导入完整 `init.sql` 即可。

## 关于页项目动态补充

已有实例在完成上一节升级后，如需补充当前官网建设项目动态，请先备份数据库，再执行：

```sql
SOURCE database/upgrades/20261110-about-milestones.sql;
```

该脚本只在“关于我们”的项目动态为空时填入四条可核实的官网建设记录，并补充动态区标题；已有动态、其他页面文案、产品、管理员和咨询内容不会被覆盖。包含一次性执行标记，重复执行不会再次写入。

## 公司名称更正

已有实例如仍显示旧名称“芯光数智”，请先备份数据库，再执行：

```sql
SOURCE database/upgrades/20261110-brand-name.sql;
```

该脚本将页面文案、产品资料和可编辑展示内容中的旧名称统一替换为“芯光智数”，不会修改管理员账号、密码、客户咨询或业务数据。脚本带一次性执行标记，重复执行不会再次覆盖后续编辑。新部署直接导入 `init.sql` 即已使用新名称，无需执行此脚本。

## 数据分布

| 表 | 用途 |
| --- | --- |
| `Products`、`ProductCategories` | 产品基础资料与分类 |
| `site_content` | 产品展示扩展、服务、联系方式及内容版本 |
| `site_page` | 7 组页面文案和列表 |
| `Brands`、`BrandAuthorizationCertificates` | 合作品牌与授权证书 |
| `Carousels`、`ProductsCarousels` | 轮播与推荐产品 |
| `About`、`Businesses`、`BasicInformation` | 公司展示、合作方向与基础信息 |
| `site_catalog_meta` | 业务表的官网扩展字段与版本 |
| `Admins`、`site_admin` | 管理员及历史管理员迁移兼容 |
| `site_inquiry`、`site_media` | 业务咨询与上传图片 |
| `site_metadata` | 首次初始化和迁移标记 |
| `User`、`Orders`、`user_location` | 原框架兼容表；官网不开放相应功能和接口 |

## 数据库检查

后台“系统设置 → 数据库与存储”提供只读检查，展示数据库类型与版本、当前库、字符集、时区、20 张表的记录数、初始化标记和页面版本。该页面不显示数据库密码，也不提供直接改库入口；连接地址与账号仍通过运行环境变量配置。

检查结果中的“数据表结构”应为 20 / 20 张表可用，“内容初始化”应显示已写入页面与产品服务初始内容。若表缺失或初始化未完成，先按本文档导入或升级，再重启应用。

也可以在 MySQL 客户端执行只读检查脚本：

```sql
USE xgsz_website;
SOURCE database/verify.sql;
```

脚本只查询库名、字符集、时区、表数量、初始化标记、页面版本和主要表记录数，不修改数据。

## 维护 SQL

表结构来源为 `website/src/main/resources/schema.sql`，初始内容来源为同目录 `seed-content.json`、`seed-cms.json`。更新来源后重新生成根目录 SQL 和升级脚本，避免两套定义不一致：

```sh
python scripts/generate-database-sql.py
python scripts/generate-database-sql.py --check
python -m unittest discover -s scripts/tests -v
```

Python 3.10+ 只用于维护交付 SQL，运行官网不需要 Python。JSON 使用 UTF-8 十六进制字面量，保证中文、换行和引号不受数据库会话的转义模式影响；原始文案可在上述 JSON 文件中阅读。
