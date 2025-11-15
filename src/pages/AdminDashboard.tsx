import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, Search, Eye, Clock, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import brototypelogo from "@/assets/brototype-logo.jpg";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";

interface ComplaintWithStudent {
  id: string;
  category: string;
  description: string;
  status: "pending" | "in-progress" | "resolved";
  file_path: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  student_name: string;
  student_id_display: string;
  course: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [complaints, setComplaints] = useState<ComplaintWithStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComplaints = async () => {
      // Fetch all complaints
      const { data: complaintsData, error: complaintsError } = await supabase
        .from("complaints")
        .select("*")
        .order("created_at", { ascending: false });

      if (complaintsError) {
        toast({
          variant: "destructive",
          title: "Error loading complaints",
          description: complaintsError.message,
        });
        setLoading(false);
        return;
      }

      // Fetch all profiles
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*");

      const profilesMap = new Map(profilesData?.map((p) => [p.id, p]) || []);

      const formatted = complaintsData?.map((c: any) => {
        const profile = profilesMap.get(c.student_id);
        return {
          id: c.id,
          category: c.category,
          description: c.description,
          status: c.status as "pending" | "in-progress" | "resolved",
          file_path: c.file_path,
          admin_notes: c.admin_notes,
          created_at: c.created_at,
          updated_at: c.updated_at,
          student_name: profile?.name || "Unknown",
          student_id_display: profile?.student_id || "N/A",
          course: profile?.course || "N/A",
        };
      }) || [];

      setComplaints(formatted);
      setLoading(false);
    };

    fetchComplaints();

    // Set up real-time subscription
    const channel = supabase
      .channel("admin-complaints-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "complaints",
        },
        async () => {
          // Refetch all data when any change happens
          fetchComplaints();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const getStatusBadge = (status: ComplaintWithStudent["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-pending text-pending-foreground">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "in-progress":
        return (
          <Badge className="bg-warning text-warning-foreground">
            <Clock className="w-3 h-3 mr-1" />
            In Progress
          </Badge>
        );
      case "resolved":
        return (
          <Badge className="bg-resolved text-resolved-foreground">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Resolved
          </Badge>
        );
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

  const filteredComplaints = complaints.filter((complaint) => {
    const matchesSearch =
      complaint.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.student_id_display.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || complaint.status === filterStatus;
    const matchesCategory = filterCategory === "all" || complaint.category === filterCategory;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Separate active and resolved complaints
  const activeComplaints = filteredComplaints.filter((c) => c.status !== "resolved");
  const resolvedComplaints = filteredComplaints.filter((c) => c.status === "resolved");

  const stats = {
    total: complaints.length,
    pending: complaints.filter((c) => c.status === "pending").length,
    inProgress: complaints.filter((c) => c.status === "in-progress").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
  };

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
              <h1 className="text-xl font-bold">Admin Portal</h1>
              <p className="text-sm text-muted-foreground">Manage all complaints</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell userId={user?.id} userRole="admin" />
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
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="border-pending/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-pending">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card className="border-warning/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card className="border-resolved/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Resolved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-resolved">{stats.resolved}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name, ID, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Classroom">Classroom</SelectItem>
              <SelectItem value="Mentor">Mentor</SelectItem>
              <SelectItem value="Environment">Environment</SelectItem>
              <SelectItem value="Misc">Miscellaneous</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active Complaints */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-warning" />
              Active Complaints
              <Badge variant="outline" className="ml-2">{activeComplaints.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading complaints...</p>
                </div>
              </div>
            ) : activeComplaints.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Active Complaints</h3>
                <p className="text-muted-foreground">All complaints have been resolved</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeComplaints.map((complaint) => (
                  <Card
                    key={complaint.id}
                    className="hover:border-primary/50 transition-all cursor-pointer"
                    onClick={() => navigate(`/admin/complaint/${complaint.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {/* Student Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge className={getCategoryColor(complaint.category)} variant="outline">
                              {complaint.category}
                            </Badge>
                            {getStatusBadge(complaint.status)}
                            {complaint.file_path && (
                              <Badge variant="outline" className="text-xs">
                                <Download className="w-3 h-3 mr-1" />
                                File
                              </Badge>
                            )}
                          </div>
                          <p className="font-semibold text-sm mb-1">
                            {complaint.student_name} ({complaint.student_id_display})
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {complaint.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Submitted {new Date(complaint.created_at).toLocaleDateString()} at{" "}
                            {new Date(complaint.created_at).toLocaleTimeString()}
                          </p>
                        </div>

                        {/* Action */}
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/complaint/${complaint.id}`);
                          }}
                          size="sm"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resolved Complaints */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-resolved" />
              Resolved Complaints
              <Badge variant="outline" className="ml-2">{resolvedComplaints.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading complaints...</p>
                </div>
              </div>
            ) : resolvedComplaints.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Resolved Complaints</h3>
                <p className="text-muted-foreground">Resolved complaints will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {resolvedComplaints.map((complaint) => (
                  <Card
                    key={complaint.id}
                    className="hover:border-primary/50 transition-all cursor-pointer bg-muted/30"
                    onClick={() => navigate(`/admin/complaint/${complaint.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {/* Student Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge className={getCategoryColor(complaint.category)} variant="outline">
                              {complaint.category}
                            </Badge>
                            {getStatusBadge(complaint.status)}
                            {complaint.file_path && (
                              <Badge variant="outline" className="text-xs">
                                <Download className="w-3 h-3 mr-1" />
                                File
                              </Badge>
                            )}
                          </div>
                          <p className="font-semibold text-sm mb-1">
                            {complaint.student_name} ({complaint.student_id_display})
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {complaint.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Resolved on {new Date(complaint.updated_at).toLocaleDateString()} at{" "}
                            {new Date(complaint.updated_at).toLocaleTimeString()}
                          </p>
                        </div>

                        {/* Action */}
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/complaint/${complaint.id}`);
                          }}
                          size="sm"
                          variant="outline"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;
