import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from '@/api'; 
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
        toast.error("Please enter both email and password.");
        return;
    }
    
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      
      // ✅ 1. Get both the user and the new token from the response
      const { user, token } = response.data;

      // ✅ 2. Store BOTH the token and user info in local storage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      toast.success('Login successful!');

      // Redirect based on role
      if (user.role === 'Admin') {
        navigate('/admin');
      } else if(user.role === 'HR') {
        navigate('/hr');
      } else {
        navigate('/employee');
      }
    } catch (error) {
      toast.error('Login failed. Please check your credentials.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false); 
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">HRMS Login</CardTitle>
          <CardDescription>
            Enter your email and password to access your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="employee@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button onClick={handleLogin} className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
            {/* Test Credentials Section */}
            <div className="mt-4 p-4 border rounded-lg bg-gray-50 text-sm text-gray-600">
              <h3 className="font-bold text-center mb-2">Test Accounts</h3>
              <div className="space-y-2">
                <div>
                  <p className="font-semibold">Admin:</p>
                  <p>Email: <span className="font-mono">rahuladmin@gmail.com</span></p>
                  <p>Password: <span className="font-mono">pass123</span></p>
                </div>
                <div>
                  <p className="font-semibold">Employee:</p>
                  <p>Email: <span className="font-mono">pranav@gmail.com</span></p>
                  <p>Password: <span className="font-mono">pranavupp12</span></p>
                </div>
                <div>
                  <p className="font-semibold">HR:</p>
                  <p>Email: <span className="font-mono">priyahr@gmail.com</span></p>
                  <p>Password: <span className="font-mono">pass123</span></p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
