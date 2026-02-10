"use server";

import { headers } from "next/headers";
import puppeteer from "@cloudflare/puppeteer";
import { getCloudflareContext } from "@opennextjs/cloudflare";

interface ScreenshotResult {
  success: boolean;
  image?: string;
  logs: string[];
  dpr: number;
  viewportWidth: number;
  viewportHeight: number;
}

export async function takeScreenshot(
  dpr: number = 2
): Promise<ScreenshotResult> {
  const logs: string[] = [];

  // Derive base URL from request headers (works in both local dev and CF production)
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") || "https";
  const baseUrl = `${protocol}://${host}`;
  const targetUrl = `${baseUrl}/render/demo`;
  const viewportWidth = 1280;
  const viewportHeight = 720;

  logs.push(`Target: ${targetUrl}`);
  logs.push(`DPR: ${dpr}, Viewport: ${viewportWidth}x${viewportHeight}`);
  logs.push(
    `Expected image size: ${viewportWidth * dpr}x${viewportHeight * dpr}px`
  );

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

  try {
    // Get CF Browser Rendering binding
    logs.push("Getting Cloudflare context...");
    const { env } = await getCloudflareContext({ async: true });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cfEnv = env as any;
    if (!cfEnv.BROWSER) {
      logs.push("ERROR: BROWSER binding not found in Cloudflare context");
      return { success: false, logs, dpr, viewportWidth, viewportHeight };
    }
    logs.push("BROWSER binding found");

    // Launch browser via CF Browser Rendering
    logs.push("Launching browser via CF Browser Rendering...");
    browser = await puppeteer.launch(cfEnv.BROWSER);
    logs.push("Browser launched");

    const page = await browser.newPage();

    await page.setViewport({
      width: viewportWidth,
      height: viewportHeight,
      deviceScaleFactor: dpr,
    });
    logs.push(`Viewport set: ${viewportWidth}x${viewportHeight} @ ${dpr}x`);

    logs.push("Navigating...");
    const startNav = Date.now();
    await page.goto(targetUrl, { waitUntil: "networkidle0", timeout: 30_000 });
    logs.push(`Page loaded (${Date.now() - startNav}ms)`);

    logs.push('Waiting for [data-report-ready="true"]...');
    await page.waitForSelector('[data-report-ready="true"]', {
      timeout: 10_000,
    });
    logs.push("Selector found");

    logs.push("Taking screenshot...");
    const startShot = Date.now();
    const screenshot = await page.screenshot({
      encoding: "base64",
      type: "png",
      fullPage: true,
    });
    logs.push(`Screenshot captured (${Date.now() - startShot}ms)`);

    const image =
      typeof screenshot === "string"
        ? screenshot
        : Buffer.from(screenshot).toString("base64");

    logs.push(`Base64 size: ${(image.length / 1024).toFixed(1)} KB`);

    await page.close();
    await browser.close();
    browser = null;
    logs.push("Browser closed");

    return {
      success: true,
      image,
      logs,
      dpr,
      viewportWidth,
      viewportHeight,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logs.push(`ERROR: ${message}`);
    return { success: false, logs, dpr, viewportWidth, viewportHeight };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore close errors
      }
    }
  }
}
