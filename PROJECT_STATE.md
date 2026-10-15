# MASKARIA 项目状态

最后更新：2026-10-15。

## 先读这份再动手

- 工作目录：`E:\MASKARIA`。
- 私有开发仓库：`Meinan818/persona-terminal-dev`。交接时先运行 `git log -1 --oneline` 确认当前提交，不能引用旧摘要里的哈希。
- 公开展示仓库：`Meinan818/Persona-Terminal`。它只同步可公开的应用源码、构建脚本和 README；不要把策划书、交接记录、本地素材、构建产物或任何凭据推过去。
- 线上是腾讯云的 nginx + Spring Boot + MySQL。2026-10-15 已检查：`/api/health` 返回数据库与服务均正常。

## 当前架构

- 前端：React、TypeScript、Vite、Dexie；本地优先，账号与可选同步走 Spring Boot API。
- 后端：Java 17、Spring Boot、MyBatis-Plus、MySQL、Flyway。测试使用 `persona_terminal_test` 隔离库，绝不能把测试指向应用库。
- Android：Capacitor。已配置的本机 Java 17 与 Android SDK 在 `.rivet` 下；构建前确认环境变量仍指向它们。
- AI：默认是用户自带 Key。Kitool 等不放行 WebView 跨域的服务会在首次拉模型列表失败后改走 Android 原生请求；该修复已在两个仓库中。

## 已验证

2026-10-15 实测：

- `npm test`：32 个文件、203 条断言通过。
- `npm run typecheck`：通过。
- `android\gradlew.bat :app:assembleDebug`：通过。
- `backend\mvn test`：159 条测试通过，13 个 Flyway 迁移已校验。
- 腾讯云 `http://192.144.227.216/api/health`：返回 `{"status":"UP","db":"UP"}`。

测试日志会故意打印网络失败、SMTP 失败和 IndexedDB 缺失等模拟场景；只要测试命令以成功结束，它们不是线上故障。

## 当前发布状态

- Android 正式版本目标：`2.8.3`，`versionCode 18`。
- 线上 `2.8.2` 使用 Android Debug 证书签名。`scripts\build-release.ps1` 不带参数时沿用它，以便 `2.8.3` 可覆盖升级；这不是应用商店私钥签名。
- 将来迁移应用商店私钥时，运行 `scripts\build-release.ps1 -KeystorePath '签名文件路径'`，由操作者在本机交互输入别名和密码。脚本只在当前进程保存它们，不写入文件或命令行。
- `2.8.3` APK 已生成并上传到 `http://192.144.227.216/download/maskaria-2.8.3-release.apk`，已核对线上和本地 SHA-256 相同。
- 服务器根目录 `/opt/maskaria/web` 是正在运行的应用前端；本地 `site/` 是营销页，当前没有部署位置。未经确认不要把 `site/` 覆盖到应用根目录。

## 待办顺序

1. 在手机安装 `2.8.3`，确认能覆盖旧版且 Kitool 拉模型成功。
2. 如需上线营销页，先确定独立域名或 nginx 路由，再部署本地 `site/`。
3. 每次功能完成后：跑相关验证、仅提交归属文件、先更新私有开发仓库；需公开的源码再单独同步展示仓库。

## 不要做

- 不读取、打印或提交 `.env`、签名文件、密码、令牌、SSH 私钥。
- 不用 `git reset --hard`、`git clean`、`git restore` 清理工作区。
- 不把本地 `outputs/`、`.cache/`、`.rivet/` 或 Android/iOS 构建产物加入提交。
