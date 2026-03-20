import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Video,
  Users,
  Globe,
  Shield,
  Zap,
  LogOut,
  Moon,
  Sun,
  ChevronRight,
  Wifi,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/contexts/websocket-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/hooks/use-theme";

function AnimatedCounter({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(value);

  useEffect(() => {
    setDisplayed(value);
  }, [value]);

  return <>{displayed.toLocaleString()}</>;
}

export default function HomePage() {
  const { user, logout } = useAuth();
  const { onlineCount, isConnected } = useWebSocket();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();

  const displayName = useMemo(() => {
    return user?.displayName || user?.username || "Guest";
  }, [user]);

  const avatarUrl = user?.avatarUrl ?? "";

  const handleStartCall = () => {
    setLocation("/call");
  };

  const features = [
    {
      icon: Zap,
      title: "Instant Connection",
      description: "Connect with someone new in seconds using smart matchmaking",
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
    },
    {
      icon: Shield,
      title: "Safe & Secure",
      description: "End-to-end encrypted calls using WebRTC peer-to-peer technology",
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      icon: Globe,
      title: "Global Community",
      description: "Meet people from all around the world, anytime",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
              <Video className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">ConnectNow</h1>
              <p className="text-xs text-muted-foreground">Video chat made simple</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              variant={isConnected ? "default" : "secondary"}
              className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1"
            >
              <Wifi className="h-3.5 w-3.5" />
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>

            <div className="hidden md:flex items-center gap-2">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-8 w-8 rounded-full object-cover ring-1 ring-border"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                  {displayName.slice(0, 1).toUpperCase()}
                </div>
              )}

              <span className="text-sm text-muted-foreground">
                Hi, <span className="font-medium text-foreground">{displayName}</span>
              </span>
            </div>

            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm">
                  <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <AnimatedCounter value={onlineCount} /> people online now
                </div>

                <div className="space-y-4">
                  <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
                    Meet New People
                    <span className="block text-primary">Face to Face</span>
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-xl">
                    Connect instantly with strangers from around the world through
                    high-quality, encrypted video calls. Press a button and start talking.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={handleStartCall}
                    size="lg"
                    className="h-12 px-6 rounded-2xl text-base gap-2 shadow-lg"
                  >
                    Start Video Chat
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                  No registration needed to browse — but you're in!
                </p>
              </div>

              <div className="relative">
                <div className="grid gap-4">
                  {features.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <div
                        key={feature.title}
                        className="rounded-3xl border bg-card p-5 shadow-sm flex gap-4 items-start"
                      >
                        <div className={`p-3 rounded-2xl ${feature.bg}`}>
                          <Icon className={`h-5 w-5 ${feature.color}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{feature.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="rounded-3xl border bg-card p-8 md:p-12 text-center shadow-sm">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">
                  {onlineCount} users online
                </span>
              </div>

              <h3 className="text-2xl md:text-3xl font-bold">Ready to Connect?</h3>
              <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
                Join thousands of people having conversations right now. It only takes one click.
              </p>

              <Button onClick={handleStartCall} size="lg" className="mt-6 rounded-2xl gap-2">
                Find Someone to Talk To
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-sm text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ConnectNow © {new Date().getFullYear()}</span>
          <span>Connecting people worldwide through video</span>
        </div>
      </footer>
    </div>
  );
              }
