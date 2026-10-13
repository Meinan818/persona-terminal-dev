#!/usr/bin/env bash
# 每天备份 MASKARIA 数据库，保留最近 14 天。
# 用法：放到服务器（例 /opt/maskaria/backup-db.sh），chmod +x，再进 crontab：
#   0 4 * * * /opt/maskaria/backup-db.sh >> /var/log/maskaria-backup.log 2>&1
#
# 密码从环境文件读，不写死在脚本里。
set -euo pipefail

ENV_FILE="${ENV_FILE:-/etc/maskaria/backend.env}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/maskaria}"
KEEP_DAYS="${KEEP_DAYS:-14}"
DB_NAME="${DB_NAME:-persona_terminal}"
DB_USER="${MYSQL_USER:-root}"

if [[ ! -r "$ENV_FILE" ]]; then
  echo "[backup] 读不到环境文件：$ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${MYSQL_PASSWORD:-}" ]]; then
  echo "[backup] 环境文件里没有 MYSQL_PASSWORD" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/${DB_NAME}-${STAMP}.sql"

mysqldump --single-transaction --routines --triggers \
  -h 127.0.0.1 -u "$DB_USER" -p"$MYSQL_PASSWORD" \
  --result-file="$OUT" "$DB_NAME"

echo "[backup] 已写出 $OUT（$(du -h "$OUT" | cut -f1)）"

# 只留最近 KEEP_DAYS 天的备份
find "$BACKUP_DIR" -name "${DB_NAME}-*.sql" -type f -mtime "+$KEEP_DAYS" -delete
echo "[backup] 已清理 $KEEP_DAYS 天前的旧备份"
