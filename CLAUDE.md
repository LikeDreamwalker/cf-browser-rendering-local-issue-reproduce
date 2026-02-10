# CLAUDE.md

## About

CF Browser Rendering 本地开发问题复现与验证项目。用于排查 `@cloudflare/puppeteer` + `@opennextjs/cloudflare` 在本地开发环境下的行为问题，尤其是 Miniflare BROWSER proxy 的表现。

**Tech stack**: Next.js 15.5.12 · React 19 · TypeScript 5 · Tailwind CSS 4 · shadcn/ui · @opennextjs/cloudflare 1.16.3 · @cloudflare/puppeteer 1.0.6 · wrangler 4.63.0

## Commands

- `pnpm dev` — 本地开发（Turbopack）
- `pnpm build` — Next.js 生产构建
- `pnpm preview` — OpenNext 构建 + wrangler 本地预览
- `pnpm deploy` — OpenNext 构建 + 部署到 CF Workers
- `pnpm cf-typegen` — 生成 CloudflareEnv 类型定义

## Project Structure

```
src/
├── actions/screenshot.ts          # Server Action: CDP 逐元素截图 + 计时
├── app/
│   ├── layout.tsx                 # Root layout (ThemeProvider + StoreProvider)
│   ├── [locale]/
│   │   ├── layout.tsx             # Locale layout (NextIntlClientProvider)
│   │   └── page.tsx               # 主页 → ScreenshotDemo 组件
│   └── render/demo/
│       └── page.tsx               # RSC 目标页面（截图对象，支持 ?cards=N）
├── components/
│   ├── screenshot-demo/index.tsx  # 主交互组件（DPR/卡片数配置 + 预览）
│   └── ui/                        # shadcn/ui 组件
├── middleware.ts                  # next-intl（排除 /render 路径）
wrangler.jsonc                     # CF Workers 配置（BROWSER binding）
open-next.config.ts                # OpenNext 适配器配置
next.config.ts                     # initOpenNextCloudflareForDev() + bodySizeLimit
.dev.vars                          # 本地开发环境变量
```

## Key Architecture Decisions

### URL 获取方式

Server Action 通过 `next/headers` 的 `host` + `x-forwarded-proto` 自动获取当前 base URL，而不是硬编码 `localhost`：
- 本地开发 → `http://localhost:3000`
- CF 生产环境 → `https://xxx.workers.dev`

这解决了 CF Browser Rendering 远程浏览器无法访问 `localhost` 的问题。

### RSC 目标页面

`/render/demo` 放在 `[locale]` 之外，不经过 i18n middleware（已在 `src/middleware.ts` 中排除 `render` 路径）。支持 `?cards=N` searchParam 动态渲染额外的测试卡片。

### 截图流程

`src/actions/screenshot.ts` 包含两个 Server Action：

**`takeScreenshot(dpr, cardCount)`** — 主截图流程：
1. `getCloudflareContext({ async: true })` 获取 BROWSER binding
2. `puppeteer.launch(env.BROWSER)` 启动浏览器
3. `page.setViewport({ deviceScaleFactor: dpr })` 设置 DPR
4. `page.goto(targetUrl)` 导航到 RSC 页面
5. `page.$$('[data-need-capture="true"]')` 找到所有待截图元素
6. 逐个 `element.screenshot()` → `element.evaluate(replaceChild)` 替换为 `<img>` + 每步计时
7. 拼接 HTML 预览并返回

**`testEvaluatePayload()`** — payload 大小压力测试：
- 向 `page.evaluate()` 传入 10KB~3MB 递增的字符串，测试哪个大小开始超时

### 日志系统

`createLogger()` 统一封装，每条日志同时：
- `console.log` 实时输出到终端/CF Dashboard（流程卡住时也能看到）
- `logs[]` 收集后返回前端渲染

---

## 已验证的结论

### 1. `remote: true` 的行为差异

| 配置 | 浏览器位置 | 能否访问 localhost | 适用场景 |
|------|-----------|-------------------|---------|
| 无 `remote`（默认） | 本地 Chromium（Miniflare 代理） | 可以 | 本地开发 |
| `remote: true` | CF 远程浏览器 | 不可以 | 需要远程可达的 URL |
| 生产环境 | CF 远程浏览器 | N/A（用部署域名） | 生产 |

**结论**：不加 `remote: true` 时，`@cloudflare/puppeteer` 通过 Miniflare 在本地启动 Chromium，等同于原生 puppeteer。CF Dashboard 不会有日志（请求没到 CF）。

### 2. Miniflare BROWSER Proxy 性能

**测试条件**：21 个元素逐个 CDP 截图，DPR=2，本地开发无 `remote`

**结果**：
- 总耗时：3487ms
- Browser launch：806ms
- Page load：1241ms
- 每个 element.screenshot()：47-82ms（平均 ~55ms）
- 耗时随元素数量**线性增长**，无异常膨胀

**结论**：Miniflare BROWSER proxy 的 per-call overhead 极小（几十 ms 级），不是性能瓶颈。

### 3. 排除的嫌疑

以下因素已被本项目验证排除，**不是**导致另一个项目 186 秒耗时的原因：
- ❌ Miniflare BROWSER proxy 带来额外网络请求
- ❌ 多次 CDP 截图调用的累积性延迟
- ❌ `@cloudflare/puppeteer` 本身比原生 puppeteer 慢
- ❌ `initOpenNextCloudflareForDev()` 的初始化开销

### 4. 根因定位：跨域 iframe + replaceChild 导致 180s 超时

**已复现**：当页面包含跨域 iframe（如 YouTube embed）时，对该元素执行 `element.screenshot()` 后再调用 `element.evaluate(replaceChild)` 会导致约 180 秒的超时。

**触发条件**：
- 元素包含跨域 `<iframe>`（如 `https://www.youtube.com/embed/...`）
- 截图后通过 `el.evaluate()` 传入大量 base64 数据并执行 `replaceChild` 替换 DOM
- 单纯截图（`element.screenshot()`）不会触发问题

**原因分析**：
- `replaceChild` 销毁包含活跃跨域 iframe 的元素时，浏览器可能需要清理跨域上下文
- 同时 `el.evaluate()` 传入大量 base64 字符串（几百 KB）通过 CDP 协议传输，增加了开销
- 两者叠加导致 `Runtime.callFunctionOn` 超时

**解决方向**：
- 对包含 iframe 的元素，先移除 iframe 再执行 replaceChild
- 或者跳过包含跨域 iframe 的元素的 DOM 替换操作
- 或者减小传入 evaluate 的 payload 大小（不传完整 base64，而是先写入 DOM 再引用）

### 5. 已排除的嫌疑

以下因素已被本项目验证排除，**不是**导致另一个项目 186 秒耗时的原因：
- ❌ Miniflare BROWSER proxy 带来额外网络请求
- ❌ 多次 CDP 截图调用的累积性延迟
- ❌ `@cloudflare/puppeteer` 本身比原生 puppeteer 慢
- ❌ `initOpenNextCloudflareForDev()` 的初始化开销
- ❌ `DOMSnapshot.captureSnapshot`（未测试但非核心嫌疑）
- ❌ `postprocessExternalImages`（未测试但非核心嫌疑）

---

### 6. 根因确认：Miniflare CDP WebSocket 1MB 消息限制

**已确认**：Miniflare 的 browser rendering binding 对 CDP WebSocket 消息有 1MB 大小限制，超过时会导致 180 秒超时。

**技术细节**：`binding.worker.ts` 对每个 WebSocket 帧简单地剥掉/加上 4 字节 header，不支持 `@cloudflare/puppeteer` 的分块协议。超过 1MB 的消息被拆成多帧后，第二帧被错误处理，Chrome 收不到完整命令，180 秒后超时。

**复现条件**：`page.evaluate()` 或 `element.evaluate()` 传入 >1MB 参数。典型场景是高 DPR（如 4x）截图后通过 evaluate 传 base64 替换 DOM。

**仅影响本地开发**，生产环境 CF Workers 正常。

**官方证据**：
- workers-sdk PR #9796 描述明确写了 "It support puppeteer and messages < 1MB"
- 源码有 `HACK: TODO: Figure out what the chunking mechanism is` 注释

## 关联问题

- OpenNext Cloudflare issue: https://github.com/opennextjs/opennextjs-cloudflare/issues/1003
- workers-sdk PR #9796: Miniflare browser rendering binding 的 1MB 消息限制
- 之前项目的 Miniflare proxy BROWSER binding 对象：constructor 名是 `constructor`（不是有意义的类名），`JSON.stringify` 时报 `The RPC receiver does not implement the method "toJSON"`

## CF 部署配置

- **Build command**: `npx opennextjs-cloudflare build`（不是 `pnpm run build`）
- **Deploy command**: `npx wrangler deploy`
- **BROWSER binding**: 在 wrangler.jsonc 中配置，CF Dashboard → Worker → Settings → Bindings 确认
- **Browser Rendering**: 需要 Workers Paid plan（$5/月）

## Path Aliases

- `@/*` → `./src/*` (tsconfig.json)
