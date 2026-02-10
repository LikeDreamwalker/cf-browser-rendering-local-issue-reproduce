# CF Browser Rendering Local Issue Reproduce

Minimal reproduction project for a **Miniflare browser rendering binding bug**: CDP WebSocket messages exceeding 1MB cause a 180-second timeout during local development.

## The Issue

When using `@cloudflare/puppeteer` with Miniflare's browser rendering binding in local dev, `page.evaluate()` or `element.evaluate()` calls that transmit >1MB of data over CDP will hang for ~180 seconds and then timeout.

### Root Cause

Miniflare's `binding.worker.ts` strips/adds a 4-byte header on each WebSocket frame but does not support `@cloudflare/puppeteer`'s chunking protocol. When a message exceeds 1MB and gets split into multiple frames, the second frame is mishandled -- Chrome never receives the complete command and times out after 180 seconds.

### Official Evidence

- [workers-sdk PR #9796](https://github.com/cloudflare/workers-sdk/pull/9796) explicitly states: *"It support puppeteer and messages < 1MB"*
- Source code contains: `HACK: TODO: Figure out what the chunking mechanism is`

### Scope

**Only affects local development** via Miniflare. Production CF Workers environment is not affected.

## Reproducing

### Prerequisites

- Node.js 18+
- pnpm
- A Cloudflare account (Workers Paid plan for Browser Rendering)

### Setup

```bash
pnpm install
npx wrangler login
pnpm dev
```

### Reproduce the 1MB limit

1. Open `http://localhost:3000`
2. Click **"Test evaluate() Payload Size"** -- observe that payloads <1MB succeed and >1MB timeout
3. Alternatively: click **"Capture Elements"** with the YouTube embed card present -- the `replaceChild` evaluate call transmits a large base64 screenshot and triggers the timeout

### Reproduce with screenshots

1. Set **Extra Cards** to 0 (default -- includes dashboard + YouTube embed)
2. Set **DPR** to 2 or higher (increases screenshot base64 size)
3. Click **"Capture Elements"**
4. Observe logs: `dashboard` card captures normally, `youtube-embed` card hangs at `replaceChild starting...` for ~180 seconds

### Verify production works fine

```bash
pnpm deploy
```

The same flow works without issues on the deployed CF Workers version, confirming this is a Miniflare-only bug.

## Key Findings

| Scenario | Result |
|----------|--------|
| `evaluate()` with <1MB payload | Normal (ms-level) |
| `evaluate()` with >1MB payload | ~180s timeout |
| `element.screenshot()` on iframe element | Normal |
| `element.evaluate(replaceChild)` with large base64 on iframe | ~180s timeout |
| 21 elements x `screenshot()` only (no replace) | 3.5s total, linear scaling |
| Production CF Workers (any payload size) | Normal |

## `remote: true` Behavior

| Config | Browser location | Can access localhost | Use case |
|--------|-----------------|---------------------|----------|
| No `remote` (default) | Local Chromium via Miniflare | Yes | Local dev |
| `remote: true` | CF remote browser | No | Requires publicly accessible URL |
| Production | CF remote browser | N/A (uses deployed domain) | Production |

Without `remote: true`, `@cloudflare/puppeteer` launches a local Chromium through Miniflare's proxy -- functionally equivalent to native puppeteer, but subject to the 1MB WebSocket frame limitation.

## Project Structure

```
src/
├── actions/screenshot.ts          # Server Actions: screenshot + payload test
├── app/
│   ├── [locale]/page.tsx          # Main page with test UI
│   └── render/demo/page.tsx       # RSC target page (?cards=N for stress test)
├── components/
│   └── screenshot-demo/index.tsx  # Interactive test UI
wrangler.jsonc                     # CF Workers config (BROWSER binding)
open-next.config.ts                # OpenNext adapter config
next.config.ts                     # initOpenNextCloudflareForDev()
```

## Tech Stack

Next.js 15.5.12 / React 19 / TypeScript 5 / Tailwind CSS 4 / shadcn/ui / @opennextjs/cloudflare 1.16.3 / @cloudflare/puppeteer 1.0.6 / wrangler 4.63.0

## CF Deployment

- **Build command**: `npx opennextjs-cloudflare build`
- **Deploy command**: `npx wrangler deploy`
- Browser Rendering binding: `BROWSER` in `wrangler.jsonc`

## Related

- [opennextjs/opennextjs-cloudflare#1003](https://github.com/opennextjs/opennextjs-cloudflare/issues/1003)
- [cloudflare/workers-sdk PR #9796](https://github.com/cloudflare/workers-sdk/pull/9796)
