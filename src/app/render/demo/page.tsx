import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Activity,
  TrendingUp,
  Users,
  Star,
  ArrowUpRight,
  BarChart3,
  Hash,
} from "lucide-react";

const stats = [
  { label: "Total Users", value: "12,847", change: "+12.5%", icon: Users },
  { label: "Active Now", value: "1,429", change: "+3.2%", icon: Activity },
  { label: "Revenue", value: "$48,352", change: "+8.1%", icon: TrendingUp },
];

const teamMembers = [
  { name: "Alice Chen", role: "Engineering", avatar: "AC" },
  { name: "Bob Smith", role: "Design", avatar: "BS" },
  { name: "Carol Wu", role: "Product", avatar: "CW" },
];

const cardColors = [
  "from-blue-500 to-cyan-500",
  "from-purple-500 to-pink-500",
  "from-orange-500 to-red-500",
  "from-green-500 to-emerald-500",
  "from-indigo-500 to-violet-500",
  "from-yellow-500 to-amber-500",
  "from-teal-500 to-green-500",
  "from-rose-500 to-pink-500",
];

export default async function RenderDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ cards?: string }>;
}) {
  const params = await searchParams;
  const cardCount = Math.min(Math.max(parseInt(params.cards || "0", 10) || 0, 0), 50);

  return (
    <div
      data-report-ready="true"
      className="bg-background p-8"
    >
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Original complex dashboard card */}
        <Card data-need-capture="true" data-capture-id="dashboard">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Dashboard Overview</CardTitle>
                <CardDescription>
                  Monthly performance snapshot - Jan 2025
                </CardDescription>
              </div>
              <Badge variant="secondary" className="gap-1">
                <BarChart3 className="size-3" />
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border bg-muted/30 p-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <stat.icon className="size-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-emerald-600">
                      {stat.change}
                    </span>
                  </div>
                  <p className="text-lg font-bold tracking-tight">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Team Members</h3>
                <Badge variant="outline" className="text-xs">
                  {teamMembers.length} people
                </Badge>
              </div>
              <div className="space-y-2">
                {teamMembers.map((member) => (
                  <div
                    key={member.name}
                    className="flex items-center justify-between rounded-md border p-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarImage
                          src={`https://api.dicebear.com/9.x/initials/svg?seed=${member.name}`}
                        />
                        <AvatarFallback className="text-xs">
                          {member.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium leading-none">
                          {member.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.role}
                        </p>
                      </div>
                    </div>
                    <Star className="size-4 text-muted-foreground/50" />
                  </div>
                ))}
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Visual Fidelity Test
              </p>
              <div className="h-12 rounded-lg bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
              <div className="flex gap-1.5">
                {["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500", "bg-blue-500", "bg-indigo-500", "bg-violet-500"].map(
                  (color) => (
                    <div
                      key={color}
                      className={`h-3 flex-1 rounded-sm ${color}`}
                    />
                  )
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <Button size="sm" className="gap-1">
              View Report
              <ArrowUpRight className="size-3" />
            </Button>
            <Button variant="outline" size="sm">
              Export
            </Button>
          </CardFooter>
        </Card>

        {/* YouTube embed card — suspected cause of 180s timeout */}
        <Card data-need-capture="true" data-capture-id="youtube-embed">
          <CardHeader>
            <CardTitle className="text-lg">Embedded Video</CardTitle>
            <CardDescription>
              YouTube iframe — suspected to cause screenshot timeout
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%" }}>
              <iframe
                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                title="embed"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  border: 0,
                  borderRadius: "2px",
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </CardContent>
        </Card>

        {/* Dynamic numbered cards for stress testing */}
        {cardCount > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: cardCount }, (_, i) => (
              <Card
                key={i}
                data-need-capture="true"
                data-capture-id={`card-${i + 1}`}
              >
                <CardContent className="p-4 space-y-3">
                  <div
                    className={`flex h-20 items-center justify-center rounded-lg bg-gradient-to-br ${cardColors[i % cardColors.length]}`}
                  >
                    <Hash className="size-8 text-white/80" />
                    <span className="text-3xl font-bold text-white">
                      {i + 1}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Card #{i + 1}</p>
                    <p className="text-xs text-muted-foreground">
                      Stress test element for CDP screenshot
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Badge variant="outline" className="text-xs">
                      capture
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      #{i + 1}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
