import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PendingAdmin {
  user_id: string;
  name: string | null;
  email: string | null;
}

export const PendingAdmins = () => {
  const [pendingAdmins, setPendingAdmins] = useState<PendingAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingAdmins();

    // Set up real-time subscription
    const channel = supabase
      .channel("pending-admins-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_roles",
        },
        () => {
          fetchPendingAdmins();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPendingAdmins = async () => {
    const { data, error } = await supabase
      .from("user_roles")
      .select(`
        user_id,
        approved,
        profiles (
          name,
          email
        )
      `)
      .eq("role", "admin")
      .eq("approved", false);

    if (error) {
      console.error("Error fetching pending admins:", error);
    } else {
      const formatted = data?.map((item: any) => ({
        user_id: item.user_id,
        name: item.profiles?.name || null,
        email: item.profiles?.email || null,
      })) || [];
      setPendingAdmins(formatted);
    }
    setLoading(false);
  };

  const handleApprove = async (userId: string) => {
    setApproving(userId);
    try {
      const { error } = await supabase.rpc("approve_admin", {
        _admin_user_id: userId,
      });

      if (error) throw error;

      toast({
        title: "Admin Approved",
        description: "The admin has been approved and can now access the system.",
      });

      fetchPendingAdmins();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Approval Failed",
        description: error.message,
      });
    } finally {
      setApproving(null);
    }
  };

  if (loading) {
    return null;
  }

  if (pendingAdmins.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-200 dark:border-amber-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-amber-600" />
          Pending Admin Approvals
        </CardTitle>
        <CardDescription>
          New admins waiting for approval
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingAdmins.map((admin) => (
          <div
            key={admin.user_id}
            className="flex items-center justify-between p-4 rounded-lg border bg-card"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">
                  {admin.name || "New Admin"}
                </p>
                <Badge variant="outline" className="text-xs">
                  Pending
                </Badge>
              </div>
              {admin.email && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <Mail className="h-3 w-3" />
                  {admin.email}
                </div>
              )}
            </div>
            <Button
              onClick={() => handleApprove(admin.user_id)}
              disabled={approving === admin.user_id}
              size="sm"
            >
              {approving === admin.user_id ? "Approving..." : "Approve"}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
