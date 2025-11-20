import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle2, 
  Clock, 
  FileText, 
  AlertCircle, 
  MessageSquare,
  Star,
  User
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TimelineEvent {
  id: string;
  event_type: string;
  actor_name: string | null;
  actor_role: string | null;
  old_value: string | null;
  new_value: string | null;
  comment: string | null;
  created_at: string;
}

interface ComplaintTimelineProps {
  complaintId: string;
}

export const ComplaintTimeline = ({ complaintId }: ComplaintTimelineProps) => {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimeline();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`timeline-${complaintId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'complaint_timeline',
          filter: `complaint_id=eq.${complaintId}`
        },
        (payload) => {
          setTimeline(prev => [payload.new as TimelineEvent, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [complaintId]);

  const fetchTimeline = async () => {
    try {
      const { data, error } = await supabase
        .from('complaint_timeline')
        .select('*')
        .eq('complaint_id', complaintId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTimeline(data || []);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'submitted':
        return <FileText className="h-4 w-4" />;
      case 'status_changed':
        return <AlertCircle className="h-4 w-4" />;
      case 'note_added':
        return <MessageSquare className="h-4 w-4" />;
      case 'rated':
        return <Star className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'submitted':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'status_changed':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'note_added':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'rated':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getEventTitle = (event: TimelineEvent) => {
    switch (event.event_type) {
      case 'submitted':
        return 'Complaint Submitted';
      case 'status_changed':
        return `Status changed to ${event.new_value}`;
      case 'note_added':
        return 'Admin added notes';
      case 'rated':
        return `Rated ${event.new_value} stars`;
      default:
        return event.event_type;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4">
          {/* Vertical line */}
          <div className="absolute left-[17px] top-2 bottom-2 w-px bg-border" />

          {timeline.map((event, index) => (
            <div key={event.id} className="relative flex gap-4 animate-fade-in">
              {/* Icon */}
              <div className={`
                relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2
                ${getEventColor(event.event_type)}
              `}>
                {getEventIcon(event.event_type)}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {getEventTitle(event)}
                    </p>
                    
                    {event.actor_name && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{event.actor_name}</span>
                        {event.actor_role && (
                          <Badge variant="outline" className="text-xs">
                            {event.actor_role}
                          </Badge>
                        )}
                      </div>
                    )}

                    {event.comment && (
                      <p className="text-sm text-muted-foreground mt-2 bg-muted/50 p-2 rounded">
                        {event.comment}
                      </p>
                    )}

                    {event.old_value && event.new_value && event.event_type === 'status_changed' && (
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        <Badge variant="outline">{event.old_value}</Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant="outline">{event.new_value}</Badge>
                      </div>
                    )}
                  </div>

                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {timeline.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No timeline events yet
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
