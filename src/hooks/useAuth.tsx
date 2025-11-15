import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type UserRole = "student" | "admin" | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  loading: boolean;
  signInStudent: (name: string, password: string) => Promise<{ error: any }>;
  signInAdmin: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching role:", error);
      return null;
    }
    return data?.role || null;
  };

  useEffect(() => {
    // Check for existing session first
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const userRole = await fetchUserRole(session.user.id);
        setRole(userRole);
      }
      setLoading(false);
    });

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer role fetching to avoid deadlock
          setTimeout(() => {
            fetchUserRole(session.user.id).then(setRole);
          }, 0);
        } else {
          setRole(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInStudent = async (name: string, password: string) => {
    // Generate email from name (normalized)
    const normalizedName = name.toLowerCase().replace(/\s+/g, '.');
    const email = `${normalizedName}@student.local`;
    
    // Try to sign in first
    let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // If sign in succeeds, ensure student role exists
    if (!signInError && signInData.user) {
      // Call the function to ensure student role is assigned
      await supabase.rpc('assign_student_role', { _user_id: signInData.user.id });
      return { error: null };
    }

    // If sign in fails with invalid credentials, try to sign up
    if (signInError?.message?.includes("Invalid login credentials")) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            is_student: true,
          },
          emailRedirectTo: `${window.location.origin}/student/dashboard`,
        },
      });

      // If signup fails because user already exists, this means they signed up before
      // but are using wrong password, so return the original sign in error
      if (signUpError?.message?.includes("already registered")) {
        return { error: { message: "Invalid password. Please check your password and try again." } };
      }

      if (signUpError) {
        console.error("Signup error:", signUpError);
        return { error: signUpError };
      }

      // Assign student role to new user
      if (signUpData.user) {
        await supabase.rpc('assign_student_role', { _user_id: signUpData.user.id });
        return { error: null };
      }
    }

    return { error: signInError };
  };

  const signInAdmin = async (email: string, password: string) => {
    // Try to sign in first
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // If sign in succeeds, ensure admin role is assigned
    if (!signInError && signInData.user) {
      // Call the secure function to assign admin role
      await supabase.rpc('assign_admin_role', { _user_id: signInData.user.id });
      return { error: null };
    }

    // If sign in fails with invalid credentials, try to sign up
    if (signInError?.message?.includes("Invalid login credentials") || 
        signInError?.message?.includes("Email not confirmed")) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin/dashboard`,
        },
      });

      if (signUpError) {
        // If signup also fails with "already registered", try sign in one more time
        if (signUpError.message?.includes("already registered")) {
          const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (!retryError && retryData.user) {
            await supabase.rpc('assign_admin_role', { _user_id: retryData.user.id });
          }
          return { error: retryError };
        }
        return { error: signUpError };
      }

      // Assign admin role to new user
      if (signUpData.user) {
        await supabase.rpc('assign_admin_role', { _user_id: signUpData.user.id });
      }

      return { error: null };
    }

    return { error: signInError };
  };

  const signOut = async () => {
    // Clear all state first
    setUser(null);
    setSession(null);
    setRole(null);
    
    // Clear any cached data
    localStorage.removeItem('sb-iddbyjhwqxgpfwzomicv-auth-token');
    localStorage.removeItem('student_data');
    
    // Sign out from Supabase
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        loading,
        signInStudent,
        signInAdmin,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
