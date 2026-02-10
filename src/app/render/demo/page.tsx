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
} from "lucide-react";

const stats = [
  {
    label: "Total Users",
    value: "12,847",
    change: "+12.5%",
    icon: Users,
  },
  {
    label: "Active Now",
    value: "1,429",
    change: "+3.2%",
    icon: Activity,
  },
  {
    label: "Revenue",
    value: "$48,352",
    change: "+8.1%",
    icon: TrendingUp,
  },
];

const teamMembers = [
  { name: "Alice Chen", role: "Engineering", avatar: "AC" },
  { name: "Bob Smith", role: "Design", avatar: "BS" },
  { name: "Carol Wu", role: "Product", avatar: "CW" },
];

export default function RenderDemoPage() {
  return (
    <div
      data-report-ready="true"
      className="flex min-h-screen items-center justify-center bg-background p-8"
    >
      <Card className="w-full max-w-lg">
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
          {/* Stats Grid */}
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

          {/* Team Section */}
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

          {/* Gradient visual test block */}
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
    </div>
  );
}
