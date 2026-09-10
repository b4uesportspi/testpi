import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface AdminLoginModalProps {
  onLogin: (token: string) => void;
}

export default function AdminLoginModal({ onLogin }: AdminLoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await apiRequest('POST', '/api/admin/login', credentials);
      return response.json();
    },
    onSuccess: (data) => {
      onLogin(data.token);
      toast({
        title: "Success",
        description: "Successfully logged in as admin",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({
        title: "Error",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ username, password });
  };

  return (
    <Card className="w-full max-w-md mx-4" data-testid="admin-login-modal">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-shield-alt text-2xl text-white"></i>
        </div>
        <CardTitle className="text-2xl">Admin Login</CardTitle>
        <p className="text-muted-foreground">Enter your admin credentials to access the dashboard</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter admin username"
              disabled={loginMutation.isPending}
              data-testid="admin-username"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              disabled={loginMutation.isPending}
              data-testid="admin-password"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loginMutation.isPending}
            data-testid="admin-login-submit"
          >
            {loginMutation.isPending ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Logging in...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt mr-2"></i>
                Login
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-amber-500/20 border border-amber-500 rounded-lg">
          <p className="text-sm text-amber-300">
            <i className="fas fa-info-circle mr-2"></i>
            Admin access is restricted. Contact system administrator for credentials.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
