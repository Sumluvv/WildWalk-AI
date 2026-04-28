# WildWalk AI 最小云服务器部署（可上线试玩）

目标：在一台普通 Linux 云主机上，以最低复杂度跑通后端与 Demo 试玩。

适用场景：
- 腾讯云轻量应用服务器
- Ubuntu 22.04
- DeepSeek 作为真实 AI 旁白提供方

## 1. 环境准备

- Ubuntu 22.04（推荐）
- 已安装 Docker 与 Docker Compose
- 开放端口：`3000`（试玩）和 `22`（SSH）

## 2. 拉取代码与配置

```bash
git clone <YOUR_REPO_URL>
cd WildWalk-AI
cp .env.example .env
```

修改 `.env` 的最小项：

- `PORT=3000`
- `CORS_ORIGIN=*`（上线前建议改为你的前端域名）
- `ENABLE_REAL_AI=true`
- `LLM_API_KEY=<你的 DeepSeek API Key>`
- `LLM_BASE_URL=https://api.deepseek.com`
- `LLM_MODEL=deepseek-chat`
- `DB_FILE=.data/wildwalk.sqlite`
- `REQUIRE_ADMIN_KEY=true`
- `ADMIN_API_KEY=<你自己设置的长字符串>`

## 3. 启动服务

```bash
docker compose up -d --build
```

检查：

```bash
docker compose ps
curl http://127.0.0.1:3000/healthz
```

预期返回：

```json
{"ok":true,"service":"wildwalk-ai-backend","db":{"ok":true}}
```

如果你开启了 `REQUIRE_ADMIN_KEY=true`，跑冒烟测试要这样执行：

```bash
ADMIN_API_KEY=你在.env里设置的值 ./scripts/smoke.sh
```

## 4. 验证试玩链路

1. 浏览器打开 `http://<服务器公网IP>:3000/demo`
2. 点“创建房间 -> 加入 -> ready -> 开始 -> 发聊天 -> 结算回合”
3. 刷新页面后确认对局数据仍存在（验证持久化）

如果公网打不开，请检查腾讯云轻量服务器的：
- 防火墙/安全组是否放行 `3000`
- 如果用了 Nginx，是否放行 `80/443`

## 5. 回滚方案（最小）

- 回滚镜像：`docker compose down && git checkout <上一个稳定提交> && docker compose up -d --build`
- 回滚数据：备份并替换 `.data/` 目录

## 6. 上线前提醒

- 将 `CORS_ORIGIN` 改为固定域名，避免全开放
- 给服务器加 HTTPS 反向代理（Nginx/Caddy）
- 开启日志采集与磁盘监控（至少监控 `.data` 目录容量）
