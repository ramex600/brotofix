import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import brototypelogo from "@/assets/brototype-logo.jpg";
const studentSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  password: z.string().min(6, "Password must be at least 6 characters")
});
const adminSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});
const Login = () => {
  const navigate = useNavigate();
  const {
    signInStudent,
    signInAdmin,
    user,
    role
  } = useAuth();
  const {
    toast
  } = useToast();
  const [studentEmail, setStudentEmail] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [studentLoading, setStudentLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  // Redirect if already logged in
  if (user && role) {
    if (role === "student") {
      navigate("/student/dashboard", {
        replace: true
      });
    } else if (role === "admin") {
      navigate("/admin/dashboard", {
        replace: true
      });
    }
  }
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentLoading(true);
    try {
      const validated = studentSchema.parse({
        email: studentEmail,
        name: studentName,
        password: studentPassword
      });
      const {
        error
      } = await signInStudent(validated.email, validated.name, validated.password);
      if (error) {
        toast({
          variant: "destructive",
          title: "Authentication Failed",
          description: error.message
        });
      } else {
        toast({
          title: "Welcome!",
          description: "Successfully authenticated as student."
        });
        navigate("/student/dashboard");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: error.errors[0].message
        });
      }
    } finally {
      setStudentLoading(false);
    }
  };
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);
    try {
      const validated = adminSchema.parse({
        email: adminEmail,
        password: adminPassword
      });
      const {
        error
      } = await signInAdmin(validated.email, validated.password);
      if (error) {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: error.message
        });
      } else {
        toast({
          title: "Welcome Admin!",
          description: "Successfully logged in."
        });
        navigate("/admin/dashboard");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: error.errors[0].message
        });
      }
    } finally {
      setAdminLoading(false);
    }
  };
  return <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex justify-center mb-8">
          <img src={brototypelogo} alt="Brototype Logo" className="w-32 h-32 rounded-full object-contain" />
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Complaint Resolution</CardTitle>
            <CardDescription className="text-center">
              Select your role and login to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="student" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="student">Student</TabsTrigger>
                <TabsTrigger value="admin">Admin</TabsTrigger>
              </TabsList>

              <TabsContent value="student">
                <form onSubmit={handleStudentLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="student-email">Email *</Label>
                    
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="student-name">Name *</Label>
                    <Input id="student-name" type="text" placeholder="Your full name" value={studentName} onChange={e => setStudentName(e.target.value)} required maxLength={100} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="student-password">Password *</Label>
                    <Input id="student-password" type="password" placeholder="Your password" value={studentPassword} onChange={e => setStudentPassword(e.target.value)} required minLength={6} />
                  </div>
                  <Button type="submit" className="w-full" disabled={studentLoading}>
                    {studentLoading ? "Processing..." : "Login / Sign Up"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    First time? Your account will be created automatically
                  </p>
                </form>
              </TabsContent>

              <TabsContent value="admin">
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Email *</Label>
                    <Input id="admin-email" type="email" placeholder="admin@brototype.com" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Password *</Label>
                    <Input id="admin-password" type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={adminLoading}>
                    {adminLoading ? "Logging in..." : "Login as Admin"}
                  </Button>
                  
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default Login;