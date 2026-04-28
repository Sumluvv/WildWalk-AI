# WildWalk AI 稳定性快照（2026-04-28）

用途：记录一次“当前可稳定试玩”的基线状态，后续改动（尤其是 `/demo`）都可对照本文件做回归验证。

## 1) 版本基线

- Git 分支：`dev`
- Git 提交：`1ca5547`
- 快照日期：`2026-04-28`
- 目标平台：`Linux + Docker（腾讯云轻量）`

## 2) 部署基线（当前可用）

- `.env` 关键项：
  - `PORT=3001`
  - `REQUIRE_ADMIN_KEY=true`（开启写接口鉴权时）
- `docker-compose.yml` 端口映射：
  - `3001:3001`
- 容器镜像基础：
  - `node:20-bookworm-slim`

## 3) 运行状态基线

- 服务启动日志出现：`server listening on :3001`
- 健康检查通过：`GET /healthz -> {"ok":true,...}`
- Demo 页面可返回 HTML：`GET /demo -> <!doctype html>...`
- Demo 页面包含管理 Key 输入项（容器内源码校验通过）：
  - `src/server/demoPage.js` 存在 `管理 Key（若服务器开启鉴权）`

## 4) 快速回归命令（每次改动后执行）

```bash
docker compose ps
curl -sS http://127.0.0.1:3001/healthz
curl -sS http://127.0.0.1:3001/demo | rg 'id="adminKey"|管理 Key'
```

预期结果：

- `wildwalk-ai` 为 `Up`（健康检查可能短暂显示 `starting`，几秒后应变为 `healthy`）
- `/healthz` 返回 `ok: true`
- `/demo` 能匹配到 `id="adminKey"` 或 `管理 Key`

## 5) 手动验收清单（非技术）

1. 打开 `http://<服务器IP>:3001/demo`
2. 可见“管理 Key（若服务器开启鉴权）”输入框
3. 填入 `.env` 的 `ADMIN_API_KEY`
4. 执行“创建房间 -> 加入 -> ready -> 开始 -> 发聊天 -> 结算回合”
5. 过程中不出现 `Admin authorization failed`

## 6) 已知风险与后续优化

- 容器刚启动时，若立刻请求可能出现短暂连接重置；建议等待 3-5 秒后再验收。
- `docker-compose.yml` 的 `version` 字段已过时（警告级别，不影响运行），后续可清理。
- 后续 Demo 改动建议先在本地或预发布环境回归，再同步正式服务器。
