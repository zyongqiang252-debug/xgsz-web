#!/usr/bin/env bash
set -euo pipefail

log() { echo "[xgsz] $*"; }

DB_NAME="${XGSZ_DB_NAME:-xgsz_website}"
APP_USER="${XGSZ_APP_DB_USER:-xgsz_website}"
APP_PASS="${XGSZ_APP_DB_PASSWORD:-xgsz_website_local}"
MYSQL_DATA="${MYSQL_DATA_DIR:-/var/lib/mysql}"
SOCKET=/var/run/mysqld/mysqld.sock
MYSQL_STARTED=0

shutdown_mysql() {
  if [ "$MYSQL_STARTED" = "1" ]; then
    mysqladmin --socket="$SOCKET" -uroot shutdown >/dev/null 2>&1 || true
  fi
}

if [ -z "${XGSZ_DATABASE_URL:-}" ]; then
  log "未提供外部数据库，使用镜像内置 MySQL"
  mkdir -p /var/run/mysqld /var/log/mysql
  chown -R mysql:mysql /var/run/mysqld /var/log/mysql 2>/dev/null || true
  chown -R mysql:mysql "$MYSQL_DATA" 2>/dev/null || true

  if [ ! -d "$MYSQL_DATA/mysql" ]; then
    log "首次启动，初始化数据库目录（约需 10 秒）"
    mysqld --initialize-insecure --user=mysql --datadir="$MYSQL_DATA" >/var/log/mysql/init.log 2>&1
  fi

  log "启动 MySQL"
  mysqld --user=mysql --datadir="$MYSQL_DATA" --socket="$SOCKET" \
    --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci \
    --bind-address=127.0.0.1 --port=3306 >/var/log/mysql/error.log 2>&1 &
  MYSQL_STARTED=1
  trap shutdown_mysql EXIT

  for _ in $(seq 1 90); do
    if mysqladmin --socket="$SOCKET" ping >/dev/null 2>&1; then break; fi
    sleep 2
  done
  if ! mysqladmin --socket="$SOCKET" ping >/dev/null 2>&1; then
    log "MySQL 启动失败，日志如下"
    tail -n 80 /var/log/mysql/error.log || true
    exit 1
  fi
  log "MySQL 已就绪"

  mysql --socket="$SOCKET" -uroot <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${APP_USER}'@'%' IDENTIFIED BY '${APP_PASS}';
GRANT SELECT, INSERT, UPDATE, DELETE ON \`${DB_NAME}\`.* TO '${APP_USER}'@'%';
FLUSH PRIVILEGES;
SQL

  TABLES="$(mysql --socket="$SOCKET" -uroot -N -B -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}'")"
  if [ "${TABLES:-0}" -lt 20 ]; then
    log "导入初始数据（当前 ${TABLES} 张表）"
    mysql --socket="$SOCKET" -uroot --default-character-set=utf8mb4 "$DB_NAME" < /opt/xgsz/init.sql
    log "初始数据导入完成"
  else
    log "检测到已有数据（${TABLES} 张表），跳过初始化"
  fi

  export XGSZ_DATABASE_URL="jdbc:mysql://127.0.0.1:3306/${DB_NAME}?connectionTimeZone=Asia/Shanghai&characterEncoding=UTF-8&allowPublicKeyRetrieval=true&useSSL=false"
  export XGSZ_DATABASE_USER="$APP_USER"
  export XGSZ_DATABASE_PASSWORD="$APP_PASS"
else
  log "使用外部数据库：${XGSZ_DATABASE_URL%%\?*}"
fi

log "启动官网服务"
java ${JAVA_OPTS:-} -jar /opt/xgsz/app.jar &
APP_PID=$!

stop_app() {
  log "收到停止信号，正在关闭"
  kill -TERM "$APP_PID" 2>/dev/null || true
  wait "$APP_PID" 2>/dev/null || true
  shutdown_mysql
  MYSQL_STARTED=0
  exit 0
}
trap stop_app TERM INT

set +e
wait "$APP_PID"
STATUS=$?
set -e
shutdown_mysql
MYSQL_STARTED=0
exit "$STATUS"
