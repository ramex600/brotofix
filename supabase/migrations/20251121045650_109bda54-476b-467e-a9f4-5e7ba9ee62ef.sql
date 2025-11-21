-- Add read tracking columns to chat_messages
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS read_by UUID REFERENCES auth.users(id);

-- Create index for unread message queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_read_at ON public.chat_messages(session_id, read_at) 
WHERE read_at IS NULL;

-- Add last_message fields to chat_sessions for quick display
ALTER TABLE public.chat_sessions
ADD COLUMN IF NOT EXISTS last_message TEXT,
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;

-- Create trigger to update last_message when new message arrives
CREATE OR REPLACE FUNCTION update_session_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_sessions
  SET 
    last_message = NEW.message,
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_last_message_trigger
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_session_last_message();

-- Update RLS policy to allow admins to create chat sessions with students
DROP POLICY IF EXISTS "Admins can create chat sessions" ON public.chat_sessions;
CREATE POLICY "Admins can create chat sessions"
  ON public.chat_sessions FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
  );