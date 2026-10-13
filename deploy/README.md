# MASKARIA 部署手册（腾讯云 / 任意 Linux 服务器）

目标：一台 24h 在线的服务器上跑起「前端静态站 + Java 后端 + MySQL」，手机浏览器或加到桌面即可用。

> 本目录里的都是**模板**：把 `maskaria.example.com` 换成你的域名、路径按实际改。
> 真正的密钥只写在服务器上（`/etc/maskaria/backend.env`，权限 600），不进仓库、不进聊天记录。

## 0. 机器规格建议

- 内存 ≥ 2 GB（后端常驻约 300–500 MB，MySQL 另需 300–500 MB；1 GB 会吃紧）。
- 系统 Ubuntu 22.04 / 24.04 或同类。
- 安全组只放 22 / 80 / 443；数据库不要对公网开放（只监听 127.0.0.1）。

## 1. 装运行环境

```bash
sudo apt update
sudo apt install -y openjdk-17-jre-headless mysql-server nginx certbot python3-certbot-nginx
```

## 2. 建库与账号

```sql
CREATE DATABASE persona_terminal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'maskaria'@'127.0.0.1' IDENTIFIED BY '<自己生成一个强密码>';
GRANT ALL PRIVILEGES ON persona_terminal.* TO 'maskaria'@'127.0.0.1';
FLUSH PRIVILEGES;
```

表结构不用手工建：后端启动时 Flyway 会按 `backend/src/main/resources/db/migration/` 里的 V1…Vn 依次建好（空库从 V1 开始）。

## 3. 后端需要的环境变量

写进 `/etc/maskaria/backend.env`（每行形如 `变量名=值`），权限设 600、属主是跑服务的用户。

| 变量 | 说明 |
|---|---|
| MYSQL_PASSWORD | 上面那个数据库账号的密码（必填） |
| JWT_SECRET | 登录令牌签名密钥，至少 32 字节（必填，用 `openssl rand -base64 48` 生成） |
| MAIL_USERNAME / MAIL_PASSWORD | 发验证码与重置密码邮件的邮箱和授权码（必填） |
| APP_PUBLIC_URL | 前端正式地址，重置邮件里的链接前缀（必填，例 https://你的域名） |
| SPRING_DATASOURCE_URL | 数据库连接串，默认指向本机 persona_terminal；换成专用账号时同时给 SPRING_DATASOURCE_USERNAME |
| APP_UPLOAD_DIR | 头像存放目录（例 /opt/maskaria/uploads，需可写） |
| CUSTOM_AI_PROVIDERS | 可选。要让服务器统一持有第三方 AI Key 时才配；默认不配（产品是 BYOK，用户自带 Key） |

## 4. 构建与上传

**构建时必须把要访问的正式地址烤进前端**，否则会沿用 `.env.local` 里的本机地址，
线上打开就是「连不上后端」：

```bash
# Linux / macOS（把域名换成你的；结尾不要带斜杠）
VITE_API_URL=https://maskaria.example.com npm run build

# Windows PowerShell
$env:VITE_API_URL='https://maskaria.example.com'; npm run build

# 后端
cd backend && mvn -o -DskipTests package
```

为什么填域名就行：nginx 已经把 `/api/` 反代到本机 8080（见第 6 节），
前端与接口同源，不需要另配端口。

> 本机已验证：用 `VITE_API_URL=https://maskaria.example.com` 构建后，产物里确实写进了该域名、
> 没有 localhost 残留；PWA 的 `sw.js` 与 `manifest.webmanifest` 正常生成（118 条预缓存）。

上传到服务器：

```bash
/opt/maskaria/backend/app.jar      # 上面那个 jar，改名成 app.jar
/opt/maskaria/web/                 # 本机 dist/ 里的全部文件
/opt/maskaria/uploads/             # 空目录，头像用
```

## 5. 起后端（systemd）

把 `deploy/maskaria-backend.service` 放到 `/etc/systemd/system/`，按注释改路径与用户，然后：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now maskaria-backend
sudo systemctl status maskaria-backend
curl -s localhost:8080/actuator/health     # 期望 {"status":"UP"}
```

## 6. 配 nginx 与 HTTPS

把 `deploy/nginx-maskaria.conf` 放到 `/etc/nginx/conf.d/`（改域名与路径），然后：

```bash
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d 你的域名          # 自动申请证书并改配置
```

## 7. 上线自检清单

1. 打开 https://你的域名 —— 能看到开屏与首页。
2. 注册新账号 → 收到验证码邮件 → 登录成功。
3. 「忘记密码」走一遍：收到重置邮件 → 点链接改密码 → 用新密码登录。
4. 记一笔、勾一个任务 → 刷新页面数据还在（本地 IndexedDB）。
5. 账号页点同步 → 换台设备登录同一账号 → 数据能拉回来。
6. 手机浏览器打开 → 加到主屏 → 从主屏图标进入，外观正常。
7. 头像上传成功；重启后端后头像还在（说明上传目录没被当临时目录清掉）。
8. 重启后端一次：`flyway_schema_history` 里仍是那些版本，没有重复建表。

## 8. 备份与回滚

- 备份：`deploy/backup-db.sh`，建议进 crontab 每天跑一次，自动保留最近 14 天。
- 回滚：留上一个 jar（`app.jar.bak`）和上一版 `web/`，换回去 `systemctl restart maskaria-backend` 即可。
- 数据库迁移不可回滚：Flyway 只往前跑，回滚代码不会回滚表结构。改表前先备份。

## 9. 已知边界（别当成已完成）

- 密码重置令牌存在后端内存里（与验证码同口径）：重启后端会让尚未使用的重置链接失效，用户重新申请即可。
- 后端只支持单实例：内存里存验证码与重置令牌，多实例要改成共享存储。
- AI 请求目前整段缓冲，不支持流式逐步返回（功能可用，只是首字延迟高一些）。
- **CORS**：本手册的拓扑是「同源」——前端与 `/api` 都在你的域名下，浏览器不会触发跨域检查，
  所以后端的 CORS 配置保持宽松也不等于把接口开给别人。若以后把前端放到别的域名/CDN，
  必须同时收紧后端的 `SecurityConfig` 里 `allowedOriginPatterns`（改成只放行你的前端域名）。

## 10. 数据怎么搬到线上

两条互不相干的数据，别混：

**A. 服务器数据库（账号、云端同步数据）**

开发机这份库可以整体搬过去：

```bash
# 开发机导出（含两个真实账号与其云端数据）
mysqldump --single-transaction -u root -p --databases persona_terminal \
  --result-file=persona_terminal-move.sql

# 服务器导入
mysql -u root -p < persona_terminal-move.sql
```

注意：线上要用专用账号，导入后把 `maskaria` 用户对 `persona_terminal` 授权一次（见第 2 节）。
导入前若线上库已有数据，先按第 8 节备份。

**B. 手机/浏览器里的本机数据（IndexedDB）**

不需要迁移工具：应用是本地优先，登录后到「账号与数据」页点一次同步，
本机数据就会推到云端；换设备登录同一账号再同步即可拉回。
**注意**：记账流水、聊天原文、图片、导入音乐按设计不上云，只在本机——
换设备时它们不会跟过去，需要走「导出备份 / 图片包」自己搬。
