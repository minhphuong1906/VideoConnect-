import { useEffect, useState } from "react";
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
  const [key, setKey] = useState(0);

  useEffect(() => {
    setDisplayed(value);
    setKey((k) => k + 1);
  }, [value]);

  return (
    <span key={key} className="count-animate inline-block tabular-nums">
      {displayed.toLocaleString()}
    </span>
  );
}

export default function HomePage() {
  const { user, logout } = useAuth();
  const { onlineCount, isConnected } = useWebSocket();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();

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
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Video className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-base">ConnectNow</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Badge
              variant="secondary"
              className="gap-1.5 hidden sm:flex"
              data-testid="badge-online-count"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-500" : "bg-muted-foreground"}`}
              />
              <AnimatedCounter value={onlineCount} />
              <span>online</span>
            </Badge>

            <span className="text-sm text-muted-foreground hidden md:block">
              Hi, <span className="font-medium text-foreground">{user?.username}</span>
            </span>

            <Button
              size="icon"
              variant="ghost"
              onClick={toggleTheme}
              data-testid="button-theme-toggle"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={logout}
              data-testid="button-logout"
              className="gap-1.5"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 md:py-32">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 0%, hsl(217 91% 60% / 0.15) 0%, transparent 70%)",
            }}
          />

          <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
            {/* Online indicator */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                <AnimatedCounter value={onlineCount} /> people online now
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
              Meet New People
              <br />
              <span className="text-primary">Face to Face</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Connect instantly with strangers from around the world through high-quality,
              encrypted video calls. Press a button and start talking.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                onClick={handleStartCall}
                data-testid="button-start-call"
                className="w-full sm:w-auto text-base px-8 h-12 gap-2 shadow-lg"
              >
                <Video className="h-5 w-5" />
                Start Video Chat
                <ChevronRight className="h-4 w-4 opacity-70" />
              </Button>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wifi className="h-4 w-4" />
                <span>No registration needed to browse — but you're in!</span>
              </div>
            </div>

            {/* Mobile online badge */}
            <div className="mt-8 flex sm:hidden justify-center">
              <Badge variant="secondary" className="gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <AnimatedCounter value={onlineCount} /> online
              </Badge>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto px-4 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-xl border border-border bg-card hover-elevate transition-all duration-200"
              >
                <div className={`w-10 h-10 rounded-lg ${f.bg} flex items-center justify-center mb-4`}>
                  <f.icon className={`h-5 w-5 ${f.color}`} />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Banner */}
        <section className="border-t border-border">
          <div className="max-w-4xl mx-auto px-4 py-16 text-center">
            <Users className="h-10 w-10 text-primary mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Ready to Connect?</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Join thousands of people having conversations right now. It only takes one click.
            </p>
            <Button
              size="lg"
              onClick={handleStartCall}
              data-testid="button-start-call-cta"
              className="gap-2 px-8 h-12"
            >
              <Video className="h-5 w-5" />
              Find Someone to Talk To
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            <span>ConnectNow &copy; {new Date().getFullYear()}</span>
          </div>
          <p>Connecting people worldwide through video</p>
        </div>
      </footer>
    </div>
  );
}
