import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [localLoading, setLocalLoading] = React.useState(false);
  const { login, isAuthenticated, user, isLoading: authIsLoading } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalLoading(true);
    try {
      const success = await login(email, password);
      if (!success) {
        toast({
          title: "Login Failed",
          description: "Invalid email or password. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred during login.",
        variant: "destructive",
      });
    } finally {
      setLocalLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      toast({ 
        title: "Login successful!", 
        description: `Welcome back, ${user.username || user.email}! Redirecting...`,
      });
      if (user.role === 'doctor') {
        navigate("/doctor-dashboard");
      } else if (user.role === 'patient') {
        navigate("/patient-dashboard");
      } else {
        navigate("/");
      }
    }
  }, [isAuthenticated, user, navigate, toast]);

  const isProcessing = localLoading || authIsLoading;

  return (
    <div className="min-h-screen flex items-center justify-center bg-medical-light p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">MedicalAI</CardTitle>
          <CardDescription>Login to access your dashboard</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="doctor@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isProcessing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isProcessing}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit" disabled={isProcessing}>
              {isProcessing ? "Logging in..." : "Login"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Login;
