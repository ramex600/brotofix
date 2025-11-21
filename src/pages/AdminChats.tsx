import { ChatInterface } from "@/components/chat/ChatInterface";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ProfileEditDialog } from "@/components/ProfileEditDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const AdminChats = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showEditProfile, setShowEditProfile] = useState(false);

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar
          userRole="admin"
          userName={profile?.name}
          userCourse={profile?.course}
          onLogout={handleLogout}
          onEditProfile={() => setShowEditProfile(true)}
        />
        
        <main className="flex-1 flex flex-col">
          <div className="h-full">
            <ChatInterface userRole="admin" />
          </div>
        </main>

        {profile && (
          <ProfileEditDialog
            userId={user?.id || ""}
            currentProfile={profile}
            onUpdate={() => {
              refetchProfile();
              setShowEditProfile(false);
            }}
            open={showEditProfile}
            onOpenChange={setShowEditProfile}
          />
        )}
      </div>
    </SidebarProvider>
  );
};

export default AdminChats;
