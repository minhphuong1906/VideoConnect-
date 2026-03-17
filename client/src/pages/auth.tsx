import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Video, Eye, EyeOff, User, Lock, UserPlus, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z
    .string()
    .min(3, "At least 3 characters")
    .max(20, "At most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, and underscores only"),
  password: z.string().min(6, "At least 6 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

function LoginTab() {
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (data: LoginForm) => {
    setError("");
    try {
      await login(data.username, data.password);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed");
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-username">Username</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="login-username"
            data-testid="input-login-username"
            placeholder="Enter your username"
            className="pl-9"
            {...form.register("username")}
          />
        </div>
        {form.formState.errors.username && (
          <p className="text-sm text-destructive">{form.formState.errors.username.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="login-password"
            data-testid="input-login-password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            className="pl-9 pr-9"
            {...form.register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {form.formState.errors.password && (
          <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        data-testid="button-login-submit"
        disabled={form.formState.isSubmitting}
      >
        <LogIn className="mr-2 h-4 w-4" />
        {form.formState.isSubmitting ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
}

function RegisterTab() {
  const { register } = useAuth();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: RegisterForm) => {
    setError("");
    try {
      await register(data.username, data.password);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Registration failed");
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reg-username">Username</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="reg-username"
            data-testid="input-register-username"
            placeholder="Choose a username"
            className="pl-9"
            {...form.register("username")}
          />
        </div>
        {form.formState.errors.username && (
          <p className="text-sm text-destructive">{form.formState.errors.username.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="reg-password"
            data-testid="input-register-password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a password"
            className="pl-9 pr-9"
            {...form.register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {form.formState.errors.password && (
          <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-confirm">Confirm Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="reg-confirm"
            data-testid="input-register-confirm"
            type={showPassword ? "text" : "password"}
            placeholder="Repeat your password"
            className="pl-9"
            {...form.register("confirmPassword")}
          />
        </div>
        {form.formState.errors.confirmPassword && (
          <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        data-testid="button-register-submit"
        disabled={form.formState.isSubmitting}
      >
        <UserPlus className="mr-2 h-4 w-4" />
        {form.formState.isSubmitting ? "Creating account..." : "Create Account"}
      </Button>
    </form>
  );
}

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      {/* Background gradient blobs */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 40%, hsl(217 91% 60% / 0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 70%, hsl(280 65% 60% / 0.08) 0%, transparent 60%)",
        }}
      />

      <div className="w-full max-w-md px-4 py-8 relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <Video className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">ConnectNow</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Meet new people through video chat
          </p>
        </div>

        <Card className="shadow-xl border-card-border">
          <CardContent className="pt-6">
            <Tabs defaultValue="login">
              <TabsList className="grid grid-cols-2 w-full mb-6">
                <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <LoginTab />
              </TabsContent>

              <TabsContent value="register">
                <RegisterTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
