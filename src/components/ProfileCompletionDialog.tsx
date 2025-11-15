import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const profileSchema = z.object({
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  student_id: z.string().min(1, "Student ID is required"),
  course: z.string().min(1, "Course is required"),
});

interface ProfileCompletionDialogProps {
  userId: string;
  currentProfile: {
    email?: string | null;
    student_id?: string;
    course?: string;
  } | null;
  onComplete: () => void;
}

export const ProfileCompletionDialog = ({ userId, currentProfile, onComplete }: ProfileCompletionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [course, setCourse] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Only check if profile data is loaded
    if (!currentProfile) return;
    
    // Check if profile needs completion
    const needsCompletion = !currentProfile.student_id || 
                           !currentProfile.course || 
                           currentProfile.student_id.startsWith('STU-') ||
                           currentProfile.course === 'General';
    
    if (needsCompletion) {
      // Check if user has dismissed this before
      const dismissed = localStorage.getItem(`profile_completion_dismissed_${userId}`);
      if (!dismissed) {
        setOpen(true);
      }
    }

    // Pre-fill with current values
    setEmail(currentProfile.email || "");
    setStudentId(currentProfile.student_id || "");
    setCourse(currentProfile.course || "");
  }, [currentProfile, userId]);

  const handleDismiss = () => {
    localStorage.setItem(`profile_completion_dismissed_${userId}`, 'true');
    setOpen(false);
  };

  const handleSubmit = async () => {
    try {
      const validated = profileSchema.parse({
        email: email || undefined,
        student_id: studentId,
        course: course,
      });

      setSaving(true);

      const { error } = await supabase
        .from("profiles")
        .update({
          email: validated.email || null,
          student_id: validated.student_id,
          course: validated.course,
        })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully.",
      });

      localStorage.removeItem(`profile_completion_dismissed_${userId}`);
      setOpen(false);
      onComplete();
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Please provide your details so the admin team can assist you better with your complaints.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="student-id">Student ID *</Label>
            <Input
              id="student-id"
              placeholder="e.g., BT2024001"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="course">Course *</Label>
            <Input
              id="course"
              placeholder="e.g., Full Stack Development"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (Optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSubmit} disabled={saving} className="flex-1">
            {saving ? "Saving..." : "Submit"}
          </Button>
          <Button variant="outline" onClick={handleDismiss} disabled={saving}>
            Dismiss
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
