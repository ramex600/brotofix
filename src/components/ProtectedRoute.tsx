import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole: "student" | "admin";
}

export const ProtectedRoute = ({ children, allowedRole }: ProtectedRouteProps) => {
  const { user, role, isApprovedAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not logged in, redirect to login
        navigate("/login", { replace: true });
      } else if (role && role !== allowedRole) {
        // Wrong role, redirect to their correct dashboard
        if (role === "student") {
          navigate("/student/dashboard", { replace: true });
        } else if (role === "admin") {
          navigate("/admin/dashboard", { replace: true });
        }
      } else if (role === "admin" && allowedRole === "admin" && isApprovedAdmin === false) {
        // Admin but not approved, redirect to login
        navigate("/login", { replace: true });
      }
    }
  }, [user, role, isApprovedAdmin, loading, allowedRole, navigate]);

  // Add timeout to prevent infinite loading
  useEffect(() => {
    if (user && !loading && !role) {
      const timeout = setTimeout(() => {
        console.error("Role not assigned to user:", user.id);
        navigate("/login", { replace: true });
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [user, loading, role, navigate]);

  // Show loading state while auth is loading OR while role is being fetched
  if (loading || (user && !role)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If not logged in, show nothing (redirect will handle it)
  if (!user) {
    return null;
  }

  // If user is authenticated and has correct role, show content
  if (role === allowedRole) {
    // For admin routes, also check approval status
    if (allowedRole === "admin" && isApprovedAdmin === false) {
      return null; // Redirect will handle it
    }
    return <>{children}</>;
  }

  // Otherwise show nothing (redirect will handle it)
  return null;
};
