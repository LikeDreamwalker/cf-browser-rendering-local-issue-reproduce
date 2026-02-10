"use server";

import { headers } from "next/headers";
import puppeteer from "@cloudflare/puppeteer";
import { getCloudflareContext } from "@opennextjs/cloudflare";

function createLogger() {
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(`[cf-browser] ${msg}`);
    logs.push(msg);
  };
  return { logs, log };
}

interface ScreenshotResult {
  success: boolean;
  html?: string;
  logs: string[];
  dpr: number;
  viewportWidth: number;
  viewportHeight: number;
  totalTime?: number;
  captureCount?: number;
}

export async function takeScreenshot(
  dpr: number = 2,
  cardCount: number = 0
): Promise<ScreenshotResult> {
  const { logs, log } = createLogger();
  const totalStart = Date.now();

  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") || "https";
  const baseUrl = `${protocol}://${host}`;
  const targetUrl = `${baseUrl}/render/demo${cardCount > 0 ? `?cards=${cardCount}` : ""}`;
  const viewportWidth = 1280;
  const viewportHeight = 720;

  log(`Target: ${targetUrl}`);
  log(`DPR: ${dpr}, Cards: ${cardCount + 1} (1 dashboard + ${cardCount} numbered)`);

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

  try {
    // --- Phase 1: Launch ---
    let t = Date.now();
    log("Getting Cloudflare context...");
    const { env } = await getCloudflareContext({ async: true });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cfEnv = env as any;
    if (!cfEnv.BROWSER) {
      log("ERROR: BROWSER binding not found");
      return { success: false, logs, dpr, viewportWidth, viewportHeight };
    }
    log(`CF context ready (${Date.now() - t}ms)`);

    t = Date.now();
    browser = await puppeteer.launch(cfEnv.BROWSER);
    log(`Browser launched (${Date.now() - t}ms)`);

    const page = await browser.newPage();
    await page.setViewport({
      width: viewportWidth,
      height: viewportHeight,
      deviceScaleFactor: dpr,
    });

    // --- Phase 2: Navigate ---
    t = Date.now();
    await page.goto(targetUrl, { waitUntil: "networkidle0", timeout: 30_000 });
    log(`Page loaded (${Date.now() - t}ms)`);

    t = Date.now();
    await page.waitForSelector('[data-report-ready="true"]', { timeout: 10_000 });
    log(`Selector found (${Date.now() - t}ms)`);

    // --- Phase 3: Per-element screenshots ---
    t = Date.now();
    const captureElements = await page.$$('[data-need-capture="true"]');
    log(`Found ${captureElements.length} elements to capture (${Date.now() - t}ms)`);

    const captures: { id: string; base64: string; width: number; height: number; time: number }[] = [];

    for (let i = 0; i < captureElements.length; i++) {
      const el = captureElements[i];
      const elStart = Date.now();

      try {
        // Get capture ID + element info
        let t2 = Date.now();
        const elInfo = await el.evaluate(
          (e: Element) => {
            const id = e.getAttribute("data-capture-id") || `element-${Date.now()}`;
            const tag = e.tagName.toLowerCase();
            const childCount = e.children.length;
            const hasIframe = e.querySelector("iframe") !== null;
            const iframeSrc = e.querySelector("iframe")?.src || null;
            return { id, tag, childCount, hasIframe, iframeSrc };
          }
        );
        const infoTime = Date.now() - t2;
        const captureId = elInfo.id;
        log(`  [${i + 1}/${captureElements.length}] "${captureId}" tag:${elInfo.tag} children:${elInfo.childCount} iframe:${elInfo.hasIframe}${elInfo.iframeSrc ? ` src:${elInfo.iframeSrc.substring(0, 60)}` : ""} (info:${infoTime}ms)`);

        // Screenshot individual element
        t2 = Date.now();
        const screenshot = await el.screenshot({
          type: "png",
          encoding: "base64",
          omitBackground: false,
        });
        const screenshotTime = Date.now() - t2;
        log(`    screenshot: ${screenshotTime}ms`);

        // Get bounding box for dimensions
        t2 = Date.now();
        const box = await el.boundingBox();
        const width = box?.width || 0;
        const height = box?.height || 0;
        const boxTime = Date.now() - t2;
        log(`    boundingBox: ${width}x${height} (${boxTime}ms)`);

        const base64 = typeof screenshot === "string"
          ? screenshot
          : Buffer.from(screenshot).toString("base64");
        log(`    base64 size: ${(base64.length / 1024).toFixed(1)}KB`);

        // Replace element with <img> tag (simulate email render DOM replacement)
        log(`    replaceChild starting... (payload ${(base64.length / 1024).toFixed(1)}KB)`);
        t2 = Date.now();
        await el.evaluate(
          (el: Element, b64: string, w: number, h: number) => {
            const img = document.createElement("img");
            img.src = `data:image/png;base64,${b64}`;
            img.alt = "";
            img.style.display = "inline-block";
            img.style.width = `${w}px`;
            img.style.height = `${h}px`;
            el.parentNode?.replaceChild(img, el);
          },
          base64,
          width,
          height
        );
        const replaceTime = Date.now() - t2;
        log(`    replaceChild done: ${replaceTime}ms`);

        const elTime = Date.now() - elStart;
        captures.push({ id: captureId, base64, width, height, time: elTime });
        log(`  [${i + 1}/${captureElements.length}] "${captureId}" DONE total:${elTime}ms`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        log(`  [${i + 1}/${captureElements.length}] FAILED (${Date.now() - elStart}ms): ${msg}`);
      }
    }

    // --- Phase 4: Generate HTML preview ---
    t = Date.now();
    const captureHtml = captures.map((c) =>
      `<div style="margin-bottom: 16px;">
        <p style="font-family: monospace; font-size: 12px; color: #888; margin: 0 0 4px 0;">${c.id} (${c.width}x${c.height}, ${c.time}ms)</p>
        <img src="data:image/png;base64,${c.base64}" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 8px;" />
      </div>`
    ).join("\n");

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f5f5f5;">
  <h2 style="margin: 0 0 8px 0;">CDP Screenshot Results</h2>
  <p style="color: #666; margin: 0 0 24px 0;">DPR: ${dpr} | Elements: ${captures.length} | Total: ${Date.now() - totalStart}ms</p>
  ${captureHtml}
</body>
</html>`;
    log(`HTML generated (${Date.now() - t}ms)`);

    // --- Cleanup ---
    t = Date.now();
    await page.close();
    await browser.close();
    browser = null;
    log(`Browser closed (${Date.now() - t}ms)`);

    const totalTime = Date.now() - totalStart;
    log(`--- TOTAL: ${totalTime}ms (${captures.length} captures) ---`);

    return {
      success: true,
      html,
      logs,
      dpr,
      viewportWidth,
      viewportHeight,
      totalTime,
      captureCount: captures.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`ERROR: ${message}`);
    const totalTime = Date.now() - totalStart;
    log(`--- FAILED after ${totalTime}ms ---`);
    return { success: false, logs, dpr, viewportWidth, viewportHeight, totalTime };
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}

// --- Standalone evaluate payload size test ---

interface PayloadTestResult {
  logs: string[];
  totalTime: number;
}

export async function testEvaluatePayload(): Promise<PayloadTestResult> {
  const { logs, log } = createLogger();
  const totalStart = Date.now();

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

  try {
    const { env } = await getCloudflareContext({ async: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cfEnv = env as any;
    if (!cfEnv.BROWSER) {
      log("ERROR: BROWSER binding not found");
      return { logs, totalTime: Date.now() - totalStart };
    }

    let t = Date.now();
    browser = await puppeteer.launch(cfEnv.BROWSER);
    log(`Browser launched (${Date.now() - t}ms)`);

    const page = await browser.newPage();

    // Navigate to a simple page
    const headersList = await headers();
    const host = headersList.get("host") || "localhost:3000";
    const protocol = headersList.get("x-forwarded-proto") || "https";
    t = Date.now();
    await page.goto(`${protocol}://${host}/render/demo`, { waitUntil: "networkidle0", timeout: 30_000 });
    log(`Page loaded (${Date.now() - t}ms)`);

    // Test evaluate with increasing payload sizes
    log("--- evaluate payload size test ---");
    for (const sizeKB of [10, 50, 100, 200, 500, 1000, 1500, 2000, 3000]) {
      const payload = "A".repeat(sizeKB * 1024);
      const tEval = Date.now();
      try {
        await page.evaluate((data: string) => {
          return data.length;
        }, payload);
        log(`  ${sizeKB}KB: ${Date.now() - tEval}ms ✓`);
      } catch (e) {
        log(`  ${sizeKB}KB: ${Date.now() - tEval}ms FAILED: ${e instanceof Error ? e.message : String(e)}`);
        // Stop testing after first failure to avoid long waits
        break;
      }
    }
    log("--- end payload test ---");

    await page.close();
    await browser.close();
    browser = null;
    log(`Browser closed`);

    const totalTime = Date.now() - totalStart;
    log(`--- TOTAL: ${totalTime}ms ---`);
    return { logs, totalTime };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`ERROR: ${message}`);
    return { logs, totalTime: Date.now() - totalStart };
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}
