# Docker 一体化部署

镜像把官网、管理后台、Spring Boot 接口和 MySQL 8 打在一起，`docker run` 一条命令即可跑完整站点，适合演示、验收和小型独立部署。

## 构建

在仓库根目录执行（首次构建需要下载 Node、Maven 依赖和 MySQL 软件包，约 5–15 分钟）：

```sh
docker build -t xgsz-website:1.0.0 .
```

构建分三步：Node 打包前端 → Maven 打包后端（前端产物打进 JAR）→ 运行镜像安装 JRE 与 MySQL。构建过程不需要本机安装 Java、Node 或 Maven。

## 运行

```sh
docker run -d --name xgsz-website \
  -p 8080:8080 \
  -v xgsz-mysql-data:/var/lib/mysql \
  --restart unless-stopped \
  xgsz-website:1.0.0
```

首次启动会自动初始化数据库并导入 20 张表与初始内容，等待约 30–60 秒后访问：

- 官网：`http://服务器地址:8080/`
- 管理后台：`http://服务器地址:8080/admin.html`（首次进入自行创建管理员，密码至少 12 位）
- 健康检查：`http://服务器地址:8080/api/health`

查看状态与日志：

```sh
docker ps
docker logs -f xgsz-website
curl http://127.0.0.1:8080/api/health
```

## 数据持久化

`-v xgsz-mysql-data:/var/lib/mysql` 把数据库保存到 Docker 卷，删除或重建容器不会丢数据。务必保留这个卷；只有确认不再需要旧数据时才删除。

备份：

```sh
docker exec xgsz-website \
  mysqldump --socket=/var/run/mysqld/mysqld.sock -uroot xgsz_website \
  > backup-$(date +%F).sql
```

恢复：

```sh
cat backup-2026-11-11.sql | docker exec -i xgsz-website \
  mysql --socket=/var/run/mysqld/mysqld.sock -uroot xgsz_website
```

## 可配置项

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `XGSZ_PORT` | `8080` | 应用端口，改端口时同步调整 `-p` 映射 |
| `XGSZ_DB_NAME` | `xgsz_website` | 内置 MySQL 的库名 |
| `XGSZ_APP_DB_USER` | `xgsz_website` | 应用数据库账号 |
| `XGSZ_APP_DB_PASSWORD` | `xgsz_website_local` | 应用数据库密码，正式环境必须修改 |
| `JAVA_OPTS` | 空 | 例如 `-Xms256m -Xmx512m` |

正式环境建议指定强密码：

```sh
docker run -d --name xgsz-website \
  -p 8080:8080 \
  -v xgsz-mysql-data:/var/lib/mysql \
  -e XGSZ_APP_DB_PASSWORD='替换为强密码' \
  --restart unless-stopped \
  xgsz-website:1.0.0
```

数据库只在容器内监听 `127.0.0.1:3306`，不会因为 `-p 8080:8080` 暴露到公网。

## 使用外部 MySQL

如果公司已有 MySQL 8.0，可以不使用内置数据库，直接传入连接参数：

```sh
docker run -d --name xgsz-website \
  -p 8080:8080 \
  -e XGSZ_DATABASE_URL='jdbc:mysql://10.0.0.10:3306/xgsz_website?connectionTimeZone=Asia/Shanghai&characterEncoding=UTF-8&useSSL=false' \
  -e XGSZ_DATABASE_USER='xgsz_website' \
  -e XGSZ_DATABASE_PASSWORD='数据库密码' \
  xgsz-website:1.0.0
```

此时镜像不会启动内置 MySQL，也不会自动建表；需先按 [数据库说明](../database/README.md) 导入 `init.sql`。

## 反向代理与 HTTPS

生产环境建议在前面加 Nginx（或云负载均衡）处理域名和证书，把 80/443 转发到容器 `8080`。参考 `scripts/deploy/xgsz-website.nginx.conf`，把 `proxy_pass` 指向 `http://127.0.0.1:8080`。容器本身只提供 HTTP。

## 更新版本

```sh
docker build -t xgsz-website:1.0.1 .
docker rm -f xgsz-website
docker run -d --name xgsz-website -p 8080:8080 \
  -v xgsz-mysql-data:/var/lib/mysql --restart unless-stopped xgsz-website:1.0.1
```

数据库卷不变，内容自动保留。结构升级脚本见 `database/upgrades/`。

## 已知限制

- 镜像同时跑 MySQL 和 Java，最低建议 2 核 4G 内存；单机演示足够，高并发或多实例场景应拆分数据库。
- 内置 MySQL 的 root 账号仅限容器内部 socket 使用，请勿把 3306 映射到公网。
- 镜像不包含微信小程序，小程序需要单独在微信开发者工具中上传审核。
