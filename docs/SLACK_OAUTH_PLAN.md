# Slack OAuth 自动化实施计划

## 需求概述

将手动 7 步 Slack 设置流程简化为一个 "Connect to Slack" 按钮，用户点击授权后自动保存 Token 到 Agent 记录。

## 当前状态

- **Backend**: NestJS (port 3000)，`/api` 前缀
- **Frontend**: React + Vite (port 5173)
- **Database**: PostgreSQL + TypeORM，`agents` 表已有 `slack_bot_token`、`slack_app_token`、`slack_enabled` 字段
- **现状**: 用户需手动去 api.slack.com 创建 App → 配置权限 → 复制 Token → 粘贴到表单

## 关键设计决策

### 核心挑战

Slack OAuth 2.0 只返回 **Bot Token** (`xoxb-...`)，不返回 **App Token** (`xapp-...`)。
OpenClaw 的 Socket Mode 两个都需要。

### 策略选择

| 策略 | 方案 | UX | 推荐 |
|------|------|-----|------|
| **B (首选)** | 用 `apps.manifest.create` API 编程式创建 Slack App，自动获取两个 Token | 完全自动化 | ✅ |
| **A (兜底)** | OAuth 只获取 Bot Token，App Token 仍需手动输入 | 部分自动化 | 备选 |

**采用策略 B**，需管理员从 api.slack.com 获取一个 **Slack Configuration Token**（`xoxe.xoxp-...`）。

---

## Phase 1: 基础设施

### 1.1 添加环境变量

**文件**: `.env` / `.env.example`

新增：
```
SLACK_CONFIG_TOKEN=          # Slack Configuration Token (xoxe.xoxp-...)，管理员从 api.slack.com 获取
SLACK_CLIENT_ID=             # 暂时保留，策略 B 下每个 Agent 有独立的 client_id
SLACK_CLIENT_SECRET=         # 同上
SLACK_OAUTH_REDIRECT_URI=http://localhost:3000/api/slack-oauth/callback
APP_BASE_URL=http://localhost:5173
```

### 1.2 Docker Compose 传递环境变量

**文件**: `docker-compose.yml`

backend service 的 environment 中添加：
```yaml
SLACK_CONFIG_TOKEN: ${SLACK_CONFIG_TOKEN}
SLACK_CLIENT_ID: ${SLACK_CLIENT_ID}
SLACK_CLIENT_SECRET: ${SLACK_CLIENT_SECRET}
SLACK_OAUTH_REDIRECT_URI: ${SLACK_OAUTH_REDIRECT_URI}
APP_BASE_URL: ${APP_BASE_URL:-http://localhost:5173}
```

### 1.3 扩展 Agent 实体

**文件**: `backend/src/agents/entities/agent.entity.ts`

新增字段：
```typescript
@Column({ type: 'varchar', length: 50, nullable: true })
slack_team_id: string;         // Slack workspace ID (T01234ABCDE)

@Column({ type: 'varchar', length: 200, nullable: true })
slack_team_name: string;       // 工作区名称（用于前端显示）

@Column({ type: 'varchar', length: 50, nullable: true })
slack_app_id: string;          // 通过 manifest API 创建的 App ID

@Column({ type: 'varchar', length: 100, nullable: true })
slack_oauth_state: string;     // OAuth 临时 state（CSRF 防护，回调后清除）

@Column({ type: 'jsonb', nullable: true })
slack_oauth_credentials: any;  // 临时存储 { client_id, client_secret }（回调后清除）
```

### 1.4 更新前端类型定义

**文件**: `frontend/src/types/index.ts`

Agent 接口新增：
```typescript
slack_team_id: string | null;
slack_team_name: string | null;
slack_app_id: string | null;
// 不暴露 slack_oauth_state 和 slack_oauth_credentials
```

---

## Phase 2: 后端 Slack OAuth 模块

### 2.1 App Manifest 定义

**新建**: `backend/src/slack-oauth/slack-manifest.ts`

导出 `buildSlackManifest(agentName: string, redirectUri: string)` 函数，返回 Slack App Manifest 对象：

```typescript
{
  display_information: {
    name: `AI Crew - ${agentName}`,  // 最长 35 字符
    description: "OpenClaw AI Agent managed by AI Crew"
  },
  features: {
    bot_user: {
      display_name: agentName,       // 最长 80 字符
      always_online: true
    }
  },
  oauth_config: {
    scopes: {
      bot: [
        "app_mentions:read", "channels:history", "channels:read",
        "chat:write", "groups:history", "groups:read",
        "im:history", "im:read", "im:write",
        "mpim:history", "mpim:read", "reactions:write", "users:read"
      ]
    },
    redirect_urls: [redirectUri]
  },
  settings: {
    event_subscriptions: {
      bot_events: ["app_mention", "message.im"]
    },
    socket_mode_enabled: true,
    token_rotation_enabled: false
  }
}
```

### 2.2 Slack OAuth Service

**新建**: `backend/src/slack-oauth/slack-oauth.service.ts`

核心方法：

#### `initiateOAuth(agentId: string): Promise<{ installUrl: string }>`
1. 从数据库加载 Agent
2. 调用 `POST https://slack.com/api/apps.manifest.create`（使用 SLACK_CONFIG_TOKEN + manifest）
3. 返回 `app_id`、`client_id`、`client_secret`
4. 存储 `slack_app_id`、`slack_oauth_credentials: { client_id, client_secret }` 到 Agent 记录
5. 生成 32 字节随机 state，存入 `slack_oauth_state`
6. 构造并返回 OAuth 授权 URL：
   ```
   https://slack.com/oauth/v2/authorize?client_id={client_id}&scope={scopes}&redirect_uri={redirect_uri}&state={state}
   ```

#### `handleCallback(code: string, state: string): Promise<{ agentId: string; teamName: string }>`
1. 查找 `slack_oauth_state === state` 的 Agent，校验 state 有效期（<10 分钟）
2. 从 `slack_oauth_credentials` 取出 `client_id`、`client_secret`
3. 调用 `POST https://slack.com/api/oauth.v2.access` 换取 Bot Token
4. 尝试调用 App Token 创建 API 获取 `xapp-...` Token
5. 更新 Agent：`slack_bot_token`、`slack_app_token`、`slack_team_id`、`slack_team_name`
6. 清除 `slack_oauth_state`、`slack_oauth_credentials`
7. 设置 `slack_enabled = true`

#### `disconnectSlack(agentId: string): Promise<void>`
1. 可选：调用 `apps.uninstall` 撤销 Slack 端授权
2. 清除 Agent 所有 Slack 相关字段

#### `getSlackStatus(agentId: string): Promise<{ connected: boolean; teamName?: string }>`
1. 查询 Agent，返回连接状态和工作区信息

### 2.3 Slack OAuth Controller

**新建**: `backend/src/slack-oauth/slack-oauth.controller.ts`

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/slack-oauth/install/:agentId` | 返回 `{ installUrl }` |
| `GET` | `/api/slack-oauth/callback?code=&state=` | OAuth 回调，302 跳转到前端 |
| `POST` | `/api/slack-oauth/disconnect/:agentId` | 断开 Slack 连接 |
| `GET` | `/api/slack-oauth/status/:agentId` | 查询连接状态 |

**注意**: callback 端点是 GET（Slack 重定向），响应是 302 跳转而非 JSON：
- 成功: `302 → ${APP_BASE_URL}/agents/${agentId}?slack=connected`
- 失败: `302 → ${APP_BASE_URL}/agents/${agentId}?slack=error&message=...`

### 2.4 Slack OAuth Module

**新建**: `backend/src/slack-oauth/slack-oauth.module.ts`

- 导入 `TypeOrmModule.forFeature([Agent])`（直接注入 Repository，避免触发 AgentsService 的副作用）
- 声明 Controller 和 Service

### 2.5 注册到 AppModule

**修改**: `backend/src/app.module.ts`

imports 数组添加 `SlackOAuthModule`

---

## Phase 3: 前端集成

### 3.1 添加 API 方法

**修改**: `frontend/src/api/client.ts`（或 `services/api.ts`）

```typescript
getSlackInstallUrl: (agentId: string) => request<{ installUrl: string }>(`/slack-oauth/install/${agentId}`)
disconnectSlack: (agentId: string) => request<{ success: boolean }>(`/slack-oauth/disconnect/${agentId}`, { method: 'POST' })
getSlackStatus: (agentId: string) => request<{ connected: boolean; teamName?: string }>(`/slack-oauth/status/${agentId}`)
```

### 3.2 SlackConnectButton 组件

**新建**: `frontend/src/components/SlackConnectButton.tsx`

Props: `agentId: string`

三种状态：
- **未连接**: 显示 "Connect to Slack" 按钮，点击后 `window.open` 打开授权页面，轮询 `getSlackStatus`（每 2 秒，超时 2 分钟）
- **已连接**: 显示 "Connected to **{teamName}**" + "Disconnect" 按钮
- **加载中**: Spinner

按钮下方保留 "Or enter tokens manually" 折叠区域。

### 3.3 修改 AgentForm

**修改**: `frontend/src/components/AgentForm.tsx`

- 新增 `agentId?: string` 可选 prop
- Slack Config 区域条件渲染：
  - **有 agentId**（编辑模式）: 主要显示 `<SlackConnectButton />`，手动 Token 输入折叠
  - **无 agentId**（创建模式）: 只显示手动 Token 输入，提示 "先保存 Agent 再连接 Slack"
- 防止表单提交覆盖 OAuth Token：后端 `update` 方法忽略空字符串 Token

### 3.4 传递 agentId

**修改**: `frontend/src/pages/AgentCreate.tsx`

编辑模式下传递 `agentId={id}` 给 `<AgentForm />`

### 3.5 Agent 详情页状态显示

**修改**: `frontend/src/pages/AgentDetail.tsx`

- Slack 状态行：显示 "Connected to **{teamName}**" 或 "Not connected"
- 处理 `?slack=connected` / `?slack=error` URL 参数，显示 Toast 提示

---

## Phase 4: 安全加固

### 4.1 敏感字段不返回前端
- `slack_oauth_state`、`slack_oauth_credentials` 加 `@Exclude()` 或 `select: false`
- 考虑对 `slack_bot_token`、`slack_app_token`、`llm_api_key` 也做类似处理

### 4.2 OAuth State 过期
- State 字符串中编码时间戳：`${timestamp}:${randomHex}`
- 回调时校验不超过 10 分钟

### 4.3 Config Token 过期处理
- `apps.manifest.create` 返回 401/403 时，返回清晰错误信息引导管理员更新 Token

### 4.4 防止表单覆盖 OAuth Token
- `AgentsService.update()` 中，Token 字段为空字符串时跳过更新

---

## 风险评估

| 风险 | 级别 | 应对 |
|------|------|------|
| App Token (`xapp-...`) 无法编程获取 | **高** | 回退策略 A：OAuth 只处理 Bot Token，App Token 手动 |
| Slack Config Token 12h 过期 | 中 | 实现 refresh 机制或文档说明 |
| 表单提交覆盖 OAuth Token | 中 | 后端忽略空 Token 更新 |
| 浏览器弹窗被拦截 | 中 | 改用 `window.location.href` 跳转 |
| 生产环境需 HTTPS | 低 | 文档说明，开发环境 localhost 无此限制 |

---

## 前置验证（开始写代码前必须做）

手动测试 `apps.manifest.create` API：
```bash
curl -X POST https://slack.com/api/apps.manifest.create \
  -H "Authorization: Bearer xoxe.xoxp-..." \
  -H "Content-Type: application/json" \
  -d '{"manifest": {...}}'
```

确认：
1. ✅ API 可用且返回 `app_id`、`credentials.client_id`、`credentials.client_secret`
2. ✅ 后续可通过 OAuth 获取 Bot Token
3. ✅ App-Level Token 可编程生成

如果策略 B 不可行，则降级到策略 A。

---

## 文件清单

### 新建文件
| 文件 | 说明 |
|------|------|
| `backend/src/slack-oauth/slack-oauth.module.ts` | NestJS 模块 |
| `backend/src/slack-oauth/slack-oauth.controller.ts` | HTTP 端点 |
| `backend/src/slack-oauth/slack-oauth.service.ts` | 业务逻辑 |
| `backend/src/slack-oauth/slack-manifest.ts` | App Manifest 定义 |
| `frontend/src/components/SlackConnectButton.tsx` | 连接按钮组件 |

### 修改文件
| 文件 | 改动 |
|------|------|
| `.env` / `.env.example` | 添加环境变量 |
| `docker-compose.yml` | 传递环境变量 |
| `backend/src/agents/entities/agent.entity.ts` | 新增 5 个字段 |
| `backend/src/app.module.ts` | 导入 SlackOAuthModule |
| `backend/src/agents/agents.service.ts` | 空 Token 跳过更新 |
| `frontend/src/types/index.ts` | 新增类型字段 |
| `frontend/src/api/client.ts` | 新增 API 方法 |
| `frontend/src/components/AgentForm.tsx` | 集成 SlackConnectButton |
| `frontend/src/pages/AgentCreate.tsx` | 传递 agentId |
| `frontend/src/pages/AgentDetail.tsx` | 显示连接状态 + 处理回调 |
