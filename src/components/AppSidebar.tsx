import { Home, MessageSquare, LogOut, UserCircle } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import brototypelogo from "@/assets/brototype-logo.jpg";

interface AppSidebarProps {
  userRole: "student" | "admin";
  userName?: string;
  userCourse?: string;
  onLogout: () => void;
  onEditProfile?: () => void;
}

export function AppSidebar({ userRole, userName, userCourse, onLogout, onEditProfile }: AppSidebarProps) {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  
  const isCollapsed = state === "collapsed";

  const studentItems = [
    { title: "Dashboard", url: "/student", icon: Home },
    { title: "Chats", url: "/student/chats", icon: MessageSquare },
  ];

  const adminItems = [
    { title: "Dashboard", url: "/admin", icon: Home },
    { title: "Chats", url: "/admin/chats", icon: MessageSquare },
  ];

  const items = userRole === "student" ? studentItems : adminItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border p-4">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <img src={brototypelogo} alt="Brototype" className="w-8 h-8 rounded" />
            <span className="font-semibold text-foreground">BrotoFix</span>
          </div>
        )}
        {isCollapsed && (
          <img src={brototypelogo} alt="Brototype" className="w-8 h-8 rounded mx-auto" />
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        {!isCollapsed && userName && (
          <div className="mb-4 pb-4 border-b border-border">
            <div className="flex items-center gap-3 mb-3">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{userName}</p>
                {userCourse && (
                  <p className="text-xs text-muted-foreground truncate">{userCourse}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {onEditProfile && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEditProfile}
              className="w-full justify-start"
            >
              <UserCircle className="h-4 w-4" />
              {!isCollapsed && <span className="ml-2">Edit Profile</span>}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            className="w-full justify-start text-destructive hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
