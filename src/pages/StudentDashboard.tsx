import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, LogOut, FileText, Download, CheckCircle } from "lucide-react";
import brototypelogo from "@/assets/brototype-logo.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FixoBro } from "@/components/FixoBro";
import { NotificationBell } from "@/components/NotificationBell";
import { ProfileCompletionDialog } from "@/components/ProfileCompletionDialog";
import { ProfileEditDialog } from "@/components/ProfileEditDialog";
import LiveChatButton from "@/components/chat/LiveChatButton";

interface Complaint {
  id: string;
  category: string;
  description: string;
  status: "pending" | "in-progress" | "resolved";
  file_path: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Profile {
  name: string;
  student_id: string;
  course: string;
  email?: string | null;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [showFixoGreeting, setShowFixoGreeting] = useState(false);
  const [profileKey, setProfileKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setDataLoading(false);
        return;
      }

      try {
        // Try to get profile from database first
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profileData) {
          setProfile(profileData);
        } else {
          // Fallback to localStorage or user metadata
          const storedData = localStorage.getItem('student_data');
          if (storedData) {
            const parsed = JSON.parse(storedData);
            setProfile({
              name: parsed.name,
              student_id: parsed.student_id,
              course: parsed.course
            });
          } else if (user.user_metadata) {
            setProfile({
              name: user.user_metadata.name || 'Student',
              student_id: user.user_metadata.student_id || 'N/A',
              course: user.user_metadata.course || 'N/A'
            });
          }
        }

        // Fetch complaints
        const { data: complaintsData, error } = await supabase
          .from("complaints")
          .select("*")
          .eq("student_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          toast({
            variant: "destructive",
            title: "Error loading complaints",
            description: error.message,
          });
        } else {
          setComplaints(complaintsData as Complaint[] || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load dashboard data. Please try refreshing the page.",
        });
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();

    // Show Fixo Bro greeting on first login (check localStorage)
    const hasSeenGreeting = localStorage.getItem('fixobro_greeting_shown');
    if (!hasSeenGreeting) {
      setTimeout(() => {
        setShowFixoGreeting(true);
        localStorage.setItem('fixobro_greeting_shown', 'true');
      }, 1000);
    }

    // Set up real-time subscription
    const channel = supabase
      .channel("complaints-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "complaints",
          filter: `student_id=eq.${user?.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setComplaints((prev) => [payload.new as Complaint, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setComplaints((prev) =>
              prev.map((c) => (c.id === payload.new.id ? (payload.new as Complaint) : c))
            );
          } else if (payload.eventType === "DELETE") {
            setComplaints((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const handleProfileComplete = async () => {
    // Refresh profile data
    if (user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      
      if (profileData) {
        setProfile(profileData);
        setProfileKey(prev => prev + 1);
      }
    }
  };

  const handleMarkResolved = async (complaintId: string, currentStatus: string) => {
    if (currentStatus === "resolved") {
      toast({
        title: "Already Resolved",
        description: "This complaint has already been marked as resolved.",
      });
      return;
    }

    const { error } = await supabase
      .from("complaints")
      .update({ status: "resolved" })
      .eq("id", complaintId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      toast({
        title: "Success",
        description: "Complaint marked as resolved.",
      });
    }
  };

  const handleDownloadFile = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from("complaint-files")
      .download(filePath);

    if (error) {
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: error.message,
      });
      return;
    }

    // Create download link
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = filePath.split("/").pop() || "file";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: Complaint["status"]) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-pending text-pending-foreground">Pending</Badge>;
      case "in-progress":
        return <Badge className="bg-warning text-warning-foreground">In Progress</Badge>;
      case "resolved":
        return <Badge className="bg-resolved text-resolved-foreground">Resolved</Badge>;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Classroom: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      Mentor: "bg-green-500/10 text-green-500 border-green-500/20",
      Environment: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      Misc: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    };
    return colors[category] || "bg-muted text-muted-foreground";
  };

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to access your dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/login")} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Profile Completion Dialog */}
      {user && (
        <ProfileCompletionDialog
          key={profileKey}
          userId={user.id}
          currentProfile={profile}
          onComplete={handleProfileComplete}
        />
      )}
      
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src={brototypelogo}
              alt="Brototype Logo"
              className="w-12 h-12 rounded-full object-contain"
            />
            <div>
              <h1 className="text-xl font-bold">Student Portal</h1>
              <p className="text-sm text-muted-foreground">
                {profile ? `${profile.name} - ${profile.student_id}` : "Loading..."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {profile && user && (
              <ProfileEditDialog
                userId={user.id}
                currentProfile={profile}
                onUpdate={handleProfileComplete}
              />
            )}
            <NotificationBell userId={user?.id} userRole="student" />
            <ThemeToggle />
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {profile?.name.split(" ")[0] || "Student"}! 👋
          </h2>
          <p className="text-muted-foreground mb-6">
            Track your complaints and get updates from the admin team
          </p>
          <Button onClick={() => navigate("/student/new-complaint")} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Submit New Complaint
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Complaints
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{complaints.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-pending">
                {complaints.filter((c) => c.status === "pending").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Resolved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-resolved">
                {complaints.filter((c) => c.status === "resolved").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Complaints List */}
        <div>
          <h3 className="text-2xl font-bold mb-4">My Complaints</h3>
          {dataLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-6 w-24 bg-muted rounded"></div>
                      <div className="h-6 w-20 bg-muted rounded"></div>
                    </div>
                    <div className="h-4 w-3/4 bg-muted rounded"></div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="h-20 bg-muted rounded"></div>
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="h-4 w-40 bg-muted rounded"></div>
                      <div className="h-8 w-32 bg-muted rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : complaints.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Complaints Yet</h3>
                <p className="text-muted-foreground mb-4">
                  You have not submitted any complaints yet.
                </p>
                <Button onClick={() => navigate("/student/new-complaint")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Submit a Complaint
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {complaints.map((complaint) => (
                <Card key={complaint.id} className="hover:border-primary/50 transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getCategoryColor(complaint.category)} variant="outline">
                            {complaint.category}
                          </Badge>
                          {getStatusBadge(complaint.status)}
                        </div>
                        <CardDescription className="text-base text-foreground">
                          {complaint.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Admin Notes */}
                    {complaint.admin_notes && (
                      <div className="bg-muted p-4 rounded-lg">
                        <p className="text-sm font-semibold mb-1">Admin Response:</p>
                        <p className="text-sm">{complaint.admin_notes}</p>
                      </div>
                    )}

                    {/* File Download */}
                    {complaint.file_path && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadFile(complaint.file_path!)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Attachment
                      </Button>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Submitted on {new Date(complaint.created_at).toLocaleDateString()}
                        {complaint.updated_at !== complaint.created_at &&
                          ` • Updated ${new Date(complaint.updated_at).toLocaleDateString()}`}
                      </p>
                      {complaint.status !== "resolved" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkResolved(complaint.id, complaint.status)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark as Resolved
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Fixo Bro AI Assistant */}
      <FixoBro />
      
      {/* Fixo Bro Greeting Popup */}
      {showFixoGreeting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <Card className="w-[90vw] md:w-96 shadow-2xl border-2 border-destructive/20 animate-scale-in">
            <CardHeader className="bg-destructive text-destructive-foreground">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center">
                  <span className="text-2xl">🤖</span>
                </div>
                <div>
                  <CardTitle>Meet Fixo Bro!</CardTitle>
                  <CardDescription className="text-destructive-foreground/80">
                    Your Tech Support Assistant
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 pb-4">
              <p className="mb-4 text-muted-foreground">
                Hey, I'm Fixo Bro 👋. Having device issues? Just click the red button at the bottom right, and I'll help you troubleshoot!
              </p>
              <Button 
                onClick={() => setShowFixoGreeting(false)}
                className="w-full"
              >
                Got it, thanks!
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Live Chat Button */}
      <LiveChatButton />
    </div>
  );
};

export default StudentDashboard;
