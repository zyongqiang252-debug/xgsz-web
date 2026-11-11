# 芯光智数公司官网

展示型企业官网，包含公开网站、管理员控制台、Spring Boot 后端和 MySQL 初始化 SQL。后台维护产品、服务、业务方向、展示资料及联系方式，内容通过同一套接口同步到官网；页面版式与固定文案由项目统一维护。

官网不提供客户注册、客户登录或下单。管理员在独立后台登录并维护内容，首次部署时自行设置账号，没有内置管理员密码。

## 项目内容

| 路径 | 内容 |
| --- | --- |
| `frontend/` | Vite 官网、管理后台、静态素材与浏览器测试 |
| `miniprogram/` | 原生微信小程序公开页面、素材与后端接口封装 |
| `src/main/java/com/cows/website/` | 官网 API、认证、内容服务、图片及咨询处理 |
| `src/main/java/com/cows/`、`src/main/resources/mapper/` | 复用的原框架实体、Service 与 MyBatis Mapper |
| `website/` | 官网专用 Spring Boot 构建、资源与后端测试 |
| `database/create-database.sql` | MySQL 建库脚本 |
| `init.sql` | 完整的 20 张表及公开初始内容 |
| `scripts/` | 启停、SQL 生成及 Nginx/systemd 配置模板 |
| `docs/` | 部署、验证、设计和素材说明 |

## 运行

需要 Node.js 20.19+ / 22.12+、Java 17+、Maven 3.9+、MySQL 8.0+。先按 [数据库说明](database/README.md) 导入 SQL，再配置连接信息：

```powershell
$env:XGSZ_DATABASE_URL='jdbc:mysql://127.0.0.1:3306/xgsz_website?connectionTimeZone=Asia/Shanghai&characterEncoding=UTF-8'
$env:XGSZ_DATABASE_USER='xgsz_website'
$env:XGSZ_DATABASE_PASSWORD='填写自己的数据库密码'
.\启动官网.cmd
```

Windows 可运行 `启动官网.cmd`、`启动后台.cmd`、`停止项目.cmd`。默认本地官网为 `http://127.0.0.1:8080/`，后台为 `http://127.0.0.1:8080/admin.html`。

手动构建：

```sh
cd frontend
npm ci
npm run build
cd ..
mvn -f website/pom.xml package
java -jar website/target/xgsz-website-1.0.0.jar
```

`website/pom.xml` 是当前官网的构建入口，生成的 JAR 包含前端网页。根目录原框架构建和示例控制器保留作源码参考，不作为官网运行入口。原框架示例配置中的远程地址及明文示例口令已替换为本机地址、环境变量或明确占位符；官网部署以 `website/` 和 `scripts/deploy/` 为准。

## 内容与数据

运行时使用 MySQL，图片也保存在数据库。H2 仅为 Java 单元测试依赖，不进入运行 JAR。仓库 SQL 提供初始公司展示内容及已确认的业务电话，邮箱、地址和企业微信留空，后续均可在后台修改。

后台保存后，同浏览器内已打开的官网收到更新通知；其他浏览器在切回页面、切换栏目或每 30 秒刷新时读取最新内容。新增、编辑、上下架和删除均通过后端持久化，版本冲突时保留输入并提示刷新。

页面支持手机、平板和桌面布局，长文案自动换行，图片按容器裁切或完整展示。仓库同时包含 `miniprogram/` 原生微信小程序公开页，复用同一套内容和咨询接口；导入、域名与发布说明见 [miniprogram/README.md](miniprogram/README.md)。

产品中心包含服务器整机、本地化部署、推理优化、集群交付运维维保四个业务方向，细分分类和内容项目可在后台“业务方向与线上平台”维护。淘宝与抖音链接初始使用平台首页，可替换为实际店铺地址；关于我们的项目动态由项目统一维护，初始只记录官网建设进展，不编造客户交付案例。

## 部署与验证

- [Docker 一体化部署（推荐验收）](docs/Docker部署.md)
- [上线待补充资料与运行说明](docs/上线待补充资料与运行说明.md)
- [完整运行和后台使用说明](docs/运行与后台使用.md)
- [公司部署说明](docs/部署说明.md)
- [数据库安装及数据分布](database/README.md)
- [验证记录](docs/验证记录.md)
- [接口与后续工作](docs/后续开发说明.md)

部署域名、服务器、数据库账号和 HTTPS 由公司环境配置。仓库仅提供通用配置示例，不包含个人测试服务器地址、实际运行数据、数据库备份或生产凭据。

后端基于本仓库已有的 Spring Boot / MyBatis 框架扩展，复用其实体、服务和数据访问层；Redis、消息队列、微信 OAuth 和流媒体示例不属于官网运行链路。
