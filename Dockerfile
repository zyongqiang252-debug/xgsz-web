# syntax=docker/dockerfile:1

# 1. 构建官网与管理后台静态资源
FROM node:22-alpine AS web
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# 2. 构建 Spring Boot 应用（前端产物打进 JAR）
FROM maven:3.9-eclipse-temurin-17 AS api
WORKDIR /build
COPY website/pom.xml website/pom.xml
COPY src/ src/
COPY website/src/ website/src/
COPY --from=web /build/frontend/dist frontend/dist
RUN mvn -q -f website/pom.xml package -DskipTests

# 3. 运行镜像：内置 MySQL 8 + JRE，一条命令启动整套官网
FROM eclipse-temurin:17-jre-jammy

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Asia/Shanghai \
    LANG=C.UTF-8 \
    XGSZ_BIND=0.0.0.0 \
    XGSZ_PORT=8080

# 防止 apt 安装时尝试用 init 启动 MySQL
RUN printf '#!/bin/sh\nexit 101\n' > /usr/sbin/policy-rc.d \
    && chmod +x /usr/sbin/policy-rc.d \
    && apt-get update \
    && apt-get install -y --no-install-recommends mysql-server ca-certificates curl tzdata \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /usr/sbin/policy-rc.d \
    && mkdir -p /var/run/mysqld /var/log/mysql \
    && chown -R mysql:mysql /var/run/mysqld /var/log/mysql

WORKDIR /opt/xgsz
COPY --from=api /build/website/target/xgsz-website-1.0.0.jar /opt/xgsz/app.jar
COPY init.sql /opt/xgsz/init.sql
COPY docker/entrypoint.sh /opt/xgsz/entrypoint.sh
RUN chmod +x /opt/xgsz/entrypoint.sh

VOLUME ["/var/lib/mysql"]
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8080/api/health || exit 1

ENTRYPOINT ["/opt/xgsz/entrypoint.sh"]
