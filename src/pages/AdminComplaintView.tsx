import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, Save, User, Calendar, FileText, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import brototypelogo from "@/assets/brototype-logo.jpg";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useChatSession } from "@/hooks/useChatSession";
import ChatWindow from "@/components/chat/ChatWindow";
import { ComplaintTimeline } from "@/components/ComplaintTimeline";

const updateSchema = z.object({
  status: z.enum(["pending", "in-progress", "resolved"]),
  admin_notes: z.string().max(2000, "Notes must be less than 2000 characters"),
});

interface ComplaintDetails {
  id: string;
  category: string;
  description: string;
  status: "pending" | "in-progress" | "resolved";
  file_paths: string[] | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  student_id: string;
  student_name: string;
  student_id_display: string;
  course: string;
  student_email: string;
}

const AdminComplaintView = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();

  const [complaint, setComplaint] = useState<ComplaintDetails | null>(null);
  const [status, setStatus] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const { activeSession, createSession, joinSession } = useChatSession(user?.id, 'admin');

  useEffect(() => {
    const fetchComplaint = async () => {
      if (!id) return;

      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Complaint not found",
        });
        navigate("/admin/dashboard");
        return;
      }

      // Get student profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.student_id)
        .maybeSingle();

      const formatted: ComplaintDetails = {
        id: data.id,
        category: data.category,
        description: data.description,
        status: data.status as "pending" | "in-progress" | "resolved",
        file_paths: data.file_paths,
        admin_notes: data.admin_notes,
        created_at: data.created_at,
        updated_at: data.updated_at,
        student_id: data.student_id,
        student_name: profileData?.name || "Unknown Student",
        student_id_display: profileData?.student_id || "N/A",
        course: profileData?.course || "N/A",
        student_email: profileData?.email || "N/A",
      };

      setComplaint(formatted);
      setStatus(formatted.status);
      setAdminNotes(formatted.admin_notes || "");
      setLoading(false);
    };

    fetchComplaint();
  }, [id, navigate, toast]);

  const handleSave = async () => {
    if (!complaint || !id) return;

    setSaving(true);

    try {
      const validated = updateSchema.parse({
        status,
        admin_notes: adminNotes,
      });

      const { error } = await supabase
        .from("complaints")
        .update({
          status: validated.status,
          admin_notes: validated.admin_notes || null,
        })
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Success",
        description: "Complaint updated successfully",
      });

      // Refresh data
      const { data: updatedData } = await supabase
        .from("complaints")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (updatedData) {
        setComplaint((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: updatedData.status as "pending" | "in-progress" | "resolved",
            admin_notes: updatedData.admin_notes,
            updated_at: updatedData.updated_at,
          };
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: error.errors[0].message,
        });
      } else if (error instanceof Error) {
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: error.message,
        });
      }
    } finally {
      setSaving(false);
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

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = filePath.split("/").pop() || "file";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-pending text-pending-foreground">Pending</Badge>;
      case "in-progress":
        return <Badge className="bg-warning text-warning-foreground">In Progress</Badge>;
      case "resolved":
        return <Badge className="bg-resolved text-resolved-foreground">Resolved</Badge>;
      default:
        return null;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading complaint...</p>
        </div>
      </div>
    );
  }

  if (!complaint) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
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
              <h1 className="text-xl font-bold">Complaint Details</h1>
              <p className="text-sm text-muted-foreground">Review and respond to complaint</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="outline"
          onClick={() => navigate("/admin/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="grid gap-6">
          {/* Student Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Student Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Name</p>
                <p className="font-semibold">{complaint.student_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Student ID</p>
                <p className="font-semibold">{complaint.student_id_display}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Course</p>
                <p className="font-semibold">{complaint.course}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Email</p>
                <p className="font-semibold text-sm">{complaint.student_email}</p>
              </div>
              <div className="md:col-span-2">
                <Button 
                  onClick={async () => {
                    // Check if there's an active session with this student
                    const { data: existingSession } = await supabase
                      .from('chat_sessions')
                      .select('*')
                      .eq('student_id', complaint.student_id)
                      .neq('status', 'ended')
                      .maybeSingle();

                    if (existingSession) {
                      await joinSession(existingSession.id);
                      setShowChat(true);
                    } else {
                      toast({
                        title: 'No Active Chat',
                        description: 'Student must initiate a chat first',
                        variant: 'destructive',
                      });
                    }
                  }}
                  className="w-full"
                  variant="outline"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Start Live Chat
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Complaint Details */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Complaint Details
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={getCategoryColor(complaint.category)} variant="outline">
                    {complaint.category}
                  </Badge>
                  {getStatusBadge(complaint.status)}
                </div>
              </div>
              <CardDescription className="flex items-center gap-2 mt-2">
                <Calendar className="w-4 h-4" />
                Submitted on {new Date(complaint.created_at).toLocaleDateString()} at{" "}
                {new Date(complaint.created_at).toLocaleTimeString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Description</Label>
                <p className="mt-2 p-4 bg-muted rounded-lg">{complaint.description}</p>
              </div>

              {complaint.file_paths && complaint.file_paths.length > 0 && (
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">
                    Attachments ({complaint.file_paths.length})
                  </Label>
                  <div className="space-y-2">
                    {complaint.file_paths.map((filePath, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        onClick={() => handleDownloadFile(filePath)}
                        className="w-full justify-start"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Attachment {index + 1}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Admin Actions</CardTitle>
              <CardDescription>
                Update the status and add resolution notes for this complaint
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin_notes">Resolution Notes</Label>
                  <Textarea
                    id="admin_notes"
                    placeholder="Add notes about actions taken or resolution details..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={6}
                    maxLength={2000}
                  />
                  <p className="text-xs text-muted-foreground">
                    {adminNotes.length}/2000 characters
                  </p>
                </div>

                <Button type="submit" disabled={saving} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Update Complaint"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Timeline */}
          <ComplaintTimeline complaintId={id!} />
        </div>
      </main>

      {/* Live Chat Window */}
      {showChat && activeSession && (
        <ChatWindow
          sessionId={activeSession.id}
          userId={user?.id || ''}
          userRole="admin"
          studentId={complaint.student_id}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
};

export default AdminComplaintView;
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-notes">Resolution Notes</Label>
                <Textarea
                  id="admin-notes"
                  placeholder="Add notes about the resolution or any actions taken..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={6}
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground">
                  {adminNotes.length}/2000 characters
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/admin/dashboard")}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>

              {complaint.updated_at !== complaint.created_at && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Last updated: {new Date(complaint.updated_at).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Chat Window */}
      {showChat && activeSession && (
        <ChatWindow session={activeSession} onClose={() => setShowChat(false)} />
      )}
    </div>
  );
};

export default AdminComplaintView;
