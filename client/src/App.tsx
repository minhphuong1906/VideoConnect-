import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { WebSocketProvider } from "@/contexts/websocket-context";
import { ThemeProvider } from "@/hooks/use-theme";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth";
import HomePage from "@/pages/home";
import VideoCallPage from "@/pages/video-call";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) return <LoadingScreen />;
  if (!user) return null;
  return <Component />;
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) return <LoadingScreen />;
  if (user) return null;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <ProtectedRoute component={HomePage} />} />
      <Route path="/call" component={() => <ProtectedRoute component={VideoCallPage} />} />
      <Route path="/auth" component={() => <PublicRoute component={AuthPage} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function InnerApp() {
  return (
    <WebSocketProvider>
      <Router />
      <Toaster />
    </WebSocketProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <InnerApp />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
