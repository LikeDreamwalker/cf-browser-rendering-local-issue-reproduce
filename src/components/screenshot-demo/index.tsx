"use client";

import { useState, useTransition, useRef } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { takeScreenshot, testEvaluatePayload } from "@/actions/screenshot";
import { Camera, Loader2, Monitor, ImageIcon, Timer, FlaskConical } from "lucide-react";

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

interface PayloadTestResult {
  logs: string[];
  totalTime: number;
}

export function ScreenshotDemo() {
  const [dpr, setDpr] = useState<number>(2);
  const [cardCount, setCardCount] = useState<number>(0);
  const [result, setResult] = useState<ScreenshotResult | null>(null);
  const [payloadResult, setPayloadResult] = useState<PayloadTestResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isPayloadPending, startPayloadTransition] = useTransition();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleScreenshot = () => {
    startTransition(async () => {
      const res = await takeScreenshot(dpr, cardCount);
      setResult(res);
    });
  };

  const handlePayloadTest = () => {
    startPayloadTransition(async () => {
      const res = await testEvaluatePayload();
      setPayloadResult(res);
    });
  };

  const iframeSrc = `/render/demo${cardCount > 0 ? `?cards=${cardCount}` : ""}`;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl space-y-6">
        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            CF Browser Rendering Stress Test
          </h1>
          <p className="text-muted-foreground">
            Per-element CDP screenshots with configurable card count and DPR
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Action Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="size-5" />
                Configuration
              </CardTitle>
              <CardDescription>
                Each card with <code>data-need-capture</code> gets an individual CDP screenshot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Card Count */}
              <div className="space-y-2">
                <Label htmlFor="cardCount">Extra Cards (stress test)</Label>
                <Input
                  id="cardCount"
                  type="number"
                  min={0}
                  max={50}
                  step={1}
                  value={cardCount}
                  onChange={(e) => setCardCount(Math.max(0, Number(e.target.value)))}
                />
                <p className="text-xs text-muted-foreground">
                  Total elements to screenshot: {cardCount + 1} (1 dashboard + {cardCount} numbered)
                </p>
              </div>

              {/* Quick presets */}
              <div className="flex flex-wrap gap-2">
                {[0, 3, 6, 10, 20].map((v) => (
                  <Badge
                    key={v}
                    variant={cardCount === v ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setCardCount(v)}
                  >
                    {v === 0 ? "1 only" : `+${v}`}
                  </Badge>
                ))}
              </div>

              <Separator />

              {/* DPR */}
              <div className="space-y-2">
                <Label htmlFor="dpr">Device Pixel Ratio (DPR)</Label>
                <Input
                  id="dpr"
                  type="number"
                  min={0.5}
                  max={4}
                  step={0.5}
                  value={dpr}
                  onChange={(e) => setDpr(Number(e.target.value))}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4].map((v) => (
                  <Badge
                    key={v}
                    variant={dpr === v ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setDpr(v)}
                  >
                    {v}x
                  </Badge>
                ))}
              </div>

              <Separator />

              <Button
                onClick={handleScreenshot}
                disabled={isPending}
                className="w-full"
              >
                {isPending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Capturing {cardCount + 1} elements...
                  </>
                ) : (
                  <>
                    <Camera />
                    Capture {cardCount + 1} Elements (DPR: {dpr})
                  </>
                )}
              </Button>

              {/* Payload size test */}
              <Button
                onClick={handlePayloadTest}
                disabled={isPayloadPending}
                variant="outline"
                className="w-full"
              >
                {isPayloadPending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Testing payload sizes...
                  </>
                ) : (
                  <>
                    <FlaskConical />
                    Test evaluate() Payload Size
                  </>
                )}
              </Button>

              {payloadResult && (
                <div className="max-h-48 overflow-auto rounded-md bg-muted p-3">
                  <p className="mb-1 text-xs font-semibold">
                    Payload Test ({payloadResult.totalTime}ms):
                  </p>
                  {payloadResult.logs.map((log, i) => (
                    <p
                      key={i}
                      className={`font-mono text-xs ${
                        log.includes("FAILED")
                          ? "text-destructive font-bold"
                          : log.startsWith("---")
                            ? "font-bold text-foreground"
                            : "text-muted-foreground"
                      }`}
                    >
                      {log}
                    </p>
                  ))}
                </div>
              )}

              <Separator />

              {/* Timing summary */}
              {result?.totalTime && (
                <div className="flex items-center gap-2 rounded-md bg-muted p-3">
                  <Timer className="size-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">
                    {result.totalTime}ms total
                  </span>
                  {result.captureCount && (
                    <span className="text-xs text-muted-foreground">
                      ({(result.totalTime / result.captureCount).toFixed(0)}ms avg per element)
                    </span>
                  )}
                </div>
              )}

              {/* Logs */}
              {result && (
                <div className="max-h-64 overflow-auto rounded-md bg-muted p-3">
                  <p className="mb-1 text-xs font-semibold">Logs:</p>
                  {result.logs.map((log, i) => (
                    <p
                      key={i}
                      className={`font-mono text-xs ${
                        log.startsWith("ERROR") || log.includes("FAILED")
                          ? "text-destructive"
                          : log.startsWith("---")
                            ? "font-bold text-foreground"
                            : "text-muted-foreground"
                      }`}
                    >
                      {log}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* RSC Preview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="size-5" />
                RSC Page Preview
              </CardTitle>
              <CardDescription>
                Live preview of <code>{iframeSrc}</code>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border">
                <iframe
                  ref={iframeRef}
                  src={iframeSrc}
                  className="h-[480px] w-full"
                  title="RSC Preview"
                />
              </div>
            </CardContent>
          </Card>

          {/* Screenshot Result Card - full width */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="size-5" />
                Screenshot Result (HTML Preview)
                {result && (
                  <Badge
                    variant={result.success ? "default" : "destructive"}
                    className="ml-2"
                  >
                    {result.success ? "Success" : "Failed"}
                  </Badge>
                )}
                {result?.totalTime && (
                  <Badge variant="outline" className="ml-1">
                    {result.totalTime}ms
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {result
                  ? `DPR: ${result.dpr} | Captures: ${result.captureCount || 0} elements`
                  : "Take a screenshot to see individual element captures"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result?.html ? (
                <div className="overflow-auto rounded-lg border">
                  <iframe
                    srcDoc={result.html}
                    className="min-h-[400px] w-full"
                    style={{ height: `${Math.max(400, (result.captureCount || 1) * 250)}px` }}
                    title="Screenshot Result"
                  />
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                  No screenshots yet. Configure card count and DPR, then click capture.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
