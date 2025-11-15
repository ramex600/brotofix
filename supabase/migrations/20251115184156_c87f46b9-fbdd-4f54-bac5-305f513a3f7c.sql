-- Create enum for chat session status
CREATE TYPE chat_status AS ENUM ('waiting', 'active', 'ended');

-- Create enum for message types
CREATE TYPE message_type AS ENUM ('text', 'system', 'file');

-- Create enum for WebRTC signal types
CREATE TYPE signal_type AS ENUM ('offer', 'answer', 'ice-candidate');

-- Create chat_sessions table
CREATE TABLE public.chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status chat_status NOT NULL DEFAULT 'waiting',
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type message_type NOT NULL DEFAULT 'text',
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create webrtc_signals table
CREATE TABLE public.webrtc_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_type signal_type NOT NULL,
  signal_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_chat_sessions_student_id ON public.chat_sessions(student_id);
CREATE INDEX idx_chat_sessions_admin_id ON public.chat_sessions(admin_id);
CREATE INDEX idx_chat_sessions_status ON public.chat_sessions(status);
CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX idx_webrtc_signals_session_id ON public.webrtc_signals(session_id);

-- Enable Row Level Security
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webrtc_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_sessions
CREATE POLICY "Students can view their own chat sessions"
  ON public.chat_sessions FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Admins can view all chat sessions"
  ON public.chat_sessions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can create their own chat sessions"
  ON public.chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admins can update chat sessions"
  ON public.chat_sessions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can update their own chat sessions"
  ON public.chat_sessions FOR UPDATE
  USING (auth.uid() = student_id);

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their sessions"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND (chat_sessions.student_id = auth.uid() OR chat_sessions.admin_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert messages in their sessions"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND (chat_sessions.student_id = auth.uid() OR chat_sessions.admin_id = auth.uid())
    )
    AND auth.uid() = sender_id
  );

-- RLS Policies for webrtc_signals
CREATE POLICY "Users can view signals in their sessions"
  ON public.webrtc_signals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE chat_sessions.id = webrtc_signals.session_id
      AND (chat_sessions.student_id = auth.uid() OR chat_sessions.admin_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert signals in their sessions"
  ON public.webrtc_signals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE chat_sessions.id = webrtc_signals.session_id
      AND (chat_sessions.student_id = auth.uid() OR chat_sessions.admin_id = auth.uid())
    )
    AND auth.uid() = sender_id
  );

-- Create trigger for updated_at on chat_sessions
CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for all three tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.webrtc_signals;

-- Create function to notify admins of new chat requests
CREATE OR REPLACE FUNCTION public.notify_admins_new_chat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
  student_name TEXT;
BEGIN
  -- Get student name
  SELECT name INTO student_name
  FROM public.profiles
  WHERE id = NEW.student_id;

  IF student_name IS NULL THEN
    student_name := 'A student';
  END IF;

  -- Create notification for all approved admins
  FOR admin_record IN
    SELECT DISTINCT user_id
    FROM public.user_roles
    WHERE role = 'admin' 
    AND approved = true
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
      admin_record.user_id,
      'New Live Chat Request',
      student_name || ' is requesting live chat support',
      'new_chat_request',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger for new chat notifications
CREATE TRIGGER notify_admins_on_new_chat
  AFTER INSERT ON public.chat_sessions
  FOR EACH ROW
  WHEN (NEW.status = 'waiting')
  EXECUTE FUNCTION public.notify_admins_new_chat();