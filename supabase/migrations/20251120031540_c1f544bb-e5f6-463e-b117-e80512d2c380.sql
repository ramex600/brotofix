-- Add AI intelligence fields to complaints table
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS device_info jsonb;
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS ai_category_suggestion text;
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS ai_root_cause text;
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS ai_severity text CHECK (ai_severity IN ('low', 'medium', 'high', 'critical'));
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS ai_tags text[];
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS ai_confidence_score decimal(3,2);
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS screenshot_analysis jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.complaints.device_info IS 'Auto-detected device information (browser, OS, screen, network, battery, performance)';
COMMENT ON COLUMN public.complaints.ai_category_suggestion IS 'AI-suggested complaint category';
COMMENT ON COLUMN public.complaints.ai_root_cause IS 'AI-identified root cause of the issue';
COMMENT ON COLUMN public.complaints.ai_severity IS 'AI-assessed severity level';
COMMENT ON COLUMN public.complaints.ai_tags IS 'AI-generated tags for categorization';
COMMENT ON COLUMN public.complaints.ai_confidence_score IS 'AI confidence score (0.00 to 1.00)';
COMMENT ON COLUMN public.complaints.screenshot_analysis IS 'AI analysis of uploaded screenshot (OCR text, detected errors, suggested fixes)';