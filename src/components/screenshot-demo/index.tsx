"use client";

import { useState, useTransition } from "react";
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
import { takeScreenshot } from "@/actions/screenshot";
import { Camera, Loader2, Monitor, ImageIcon } from "lucide-react";

interface ScreenshotResult {
  success: boolean;
  image?: string;
  logs: string[];
  dpr: number;
  viewportWidth: number;
  viewportHeight: number;
}

export function ScreenshotDemo() {
  const [dpr, setDpr] = useState<number>(2);
  const [result, setResult] = useState<ScreenshotResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleScreenshot = () => {
    startTransition(async () => {
      const res = await takeScreenshot(dpr);
      setResult(res);
    });
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl space-y-6">
        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            CF Browser Rendering Demo
          </h1>
          <p className="text-muted-foreground">
            Test CDP screenshot with configurable DPR (Device Pixel Ratio)
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Action Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="size-5" />
                Screenshot Configuration
              </CardTitle>
              <CardDescription>
                Configure DPR and trigger a CDP screenshot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <p className="text-xs text-muted-foreground">
                  Common values: 1 (standard), 2 (Retina), 3 (high-DPI mobile),
                  4 (ultra)
                </p>
              </div>

              {/* DPR Presets */}
              <div className="flex flex-wrap gap-2">
                {[1, 1.5, 2, 3, 4].map((v) => (
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
                    Taking screenshot...
                  </>
                ) : (
                  <>
                    <Camera />
                    Take Screenshot (DPR: {dpr})
                  </>
                )}
              </Button>

              {/* Logs */}
              {result && (
                <div className="max-h-48 overflow-auto rounded-md bg-muted p-3">
                  <p className="mb-1 text-xs font-semibold">Logs:</p>
                  {result.logs.map((log, i) => (
                    <p
                      key={i}
                      className={`font-mono text-xs ${
                        log.startsWith("ERROR")
                          ? "text-destructive"
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
                Live preview of <code>/render/demo</code> (screenshot target)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border">
                <iframe
                  src="/render/demo"
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
                Screenshot Result
                {result && (
                  <Badge
                    variant={result.success ? "default" : "destructive"}
                    className="ml-2"
                  >
                    {result.success ? "Success" : "Failed"}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {result
                  ? `DPR: ${result.dpr} | Viewport: ${result.viewportWidth}x${result.viewportHeight} | Expected image: ${result.viewportWidth * result.dpr}x${result.viewportHeight * result.dpr}px`
                  : "Take a screenshot to see the result here"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result?.image ? (
                <div className="overflow-auto rounded-lg border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${result.image}`}
                    alt="Screenshot result"
                    className="w-full"
                  />
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                  No screenshot yet. Configure DPR above and click &quot;Take
                  Screenshot&quot;.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
