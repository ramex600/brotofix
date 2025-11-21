import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { UserCircle } from "lucide-react";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  student_id: z.string().min(1, "Student ID is required").max(50, "Student ID must be less than 50 characters"),
  course: z.string().min(1, "Course is required").max(100, "Course must be less than 100 characters"),
});

interface ProfileEditDialogProps {
  userId: string;
  currentProfile: {
    name: string;
    email?: string | null;
    student_id: string;
    course: string;
  };
  onUpdate: () => void;
}

interface ControlledProfileEditDialogProps extends ProfileEditDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const ProfileEditDialog = ({ userId, currentProfile, onUpdate, open: controlledOpen, onOpenChange }: ControlledProfileEditDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [name, setName] = useState(currentProfile.name);
  const [email, setEmail] = useState(currentProfile.email || "");
  const [studentId, setStudentId] = useState(currentProfile.student_id);
  const [course, setCourse] = useState(currentProfile.course);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    try {
      const validated = profileSchema.parse({
        name,
        email: email || undefined,
        student_id: studentId,
        course,
      });

      setSaving(true);

      const { error } = await supabase
        .from("profiles")
        .update({
          name: validated.name,
          email: validated.email || null,
          student_id: validated.student_id,
          course: validated.course,
        })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile information has been updated successfully.",
      });

      setOpen(false);
      onUpdate();
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

  const resetForm = () => {
    setName(currentProfile.name);
    setEmail(currentProfile.email || "");
    setStudentId(currentProfile.student_id);
    setCourse(currentProfile.course);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserCircle className="mr-2 h-4 w-4" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name *</Label>
            <Input
              id="edit-name"
              placeholder="e.g., John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-student-id">Student ID *</Label>
            <Input
              id="edit-student-id"
              placeholder="e.g., BT2024001"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-course">Course *</Label>
            <Input
              id="edit-course"
              placeholder="e.g., Full Stack Development"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email (Optional)</Label>
            <Input
              id="edit-email"
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
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)} 
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
