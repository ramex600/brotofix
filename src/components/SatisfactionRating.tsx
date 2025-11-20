import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SatisfactionRatingProps {
  complaintId: string;
  isOpen: boolean;
  onClose: () => void;
  onRated?: () => void;
}

export const SatisfactionRating = ({ 
  complaintId, 
  isOpen, 
  onClose,
  onRated 
}: SatisfactionRatingProps) => {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        variant: "destructive",
        title: "Rating Required",
        description: "Please select a rating before submitting.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('complaints')
        .update({
          satisfaction_rating: rating,
          satisfaction_comment: comment || null,
          rated_at: new Date().toISOString(),
        })
        .eq('id', complaintId);

      if (error) throw error;

      toast({
        title: "Thank You!",
        description: "Your feedback has been submitted successfully.",
      });

      onRated?.();
      onClose();
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "Could not submit your rating. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingText = (stars: number) => {
    switch (stars) {
      case 1: return "Very Dissatisfied";
      case 2: return "Dissatisfied";
      case 3: return "Neutral";
      case 4: return "Satisfied";
      case 5: return "Very Satisfied";
      default: return "Select a rating";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Your Experience</DialogTitle>
          <DialogDescription>
            How satisfied are you with the resolution of your complaint?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`h-10 w-10 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>

            <p className="text-sm font-medium text-center">
              {getRatingText(hoveredRating || rating)}
            </p>
          </div>

          {/* Optional Comment */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Additional Feedback (Optional)
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us more about your experience..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/500
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Skip
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting || rating === 0}
          >
            {submitting ? "Submitting..." : "Submit Rating"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
