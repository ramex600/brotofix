import { Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ProfileEditDialog } from "@/components/ProfileEditDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";

interface DashboardLayoutProps {
  userRole: "student" | "admin";
  userName?: string;
  userCourse?: string;
  userId: string;
  currentProfile: any;
  onProfileUpdate: () => void;
}

export const DashboardLayout = ({
  userRole,
  userName,
  userCourse,
  userId,
  currentProfile,
  onProfileUpdate,
}: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [showEditProfile, setShowEditProfile] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar
          userRole={userRole}
          userName={userName}
          userCourse={userCourse}
          onLogout={handleLogout}
          onEditProfile={() => setShowEditProfile(true)}
        />
        
        <main className="flex-1 flex flex-col">
          <header className="border-b border-border p-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold">
              {userRole === "student" ? "Student Dashboard" : "Admin Dashboard"}
            </h1>
            <div className="flex items-center gap-2">
              <NotificationBell userId={userId} userRole={userRole} />
              <ThemeToggle />
            </div>
          </header>
          
          <div className="flex-1 overflow-auto">
            <Outlet />
          </div>
        </main>

        {currentProfile && (
          <ProfileEditDialog
            userId={userId}
            currentProfile={currentProfile}
            onUpdate={() => {
              onProfileUpdate();
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
