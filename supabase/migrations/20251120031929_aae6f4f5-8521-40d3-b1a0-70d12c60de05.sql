-- Fix security issue: Remove SECURITY DEFINER from view
DROP VIEW IF EXISTS public.admin_satisfaction_stats;

CREATE OR REPLACE VIEW public.admin_satisfaction_stats AS
SELECT 
  COUNT(*) FILTER (WHERE satisfaction_rating IS NOT NULL) as total_ratings,
  ROUND(AVG(satisfaction_rating)::numeric, 2) as avg_rating,
  COUNT(*) FILTER (WHERE satisfaction_rating >= 4) as positive_count,
  COUNT(*) FILTER (WHERE satisfaction_rating <= 2) as negative_count,
  COUNT(*) FILTER (WHERE satisfaction_rating = 5) as five_star_count,
  COUNT(*) FILTER (WHERE satisfaction_rating = 4) as four_star_count,
  COUNT(*) FILTER (WHERE satisfaction_rating = 3) as three_star_count,
  COUNT(*) FILTER (WHERE satisfaction_rating = 2) as two_star_count,
  COUNT(*) FILTER (WHERE satisfaction_rating = 1) as one_star_count
FROM public.complaints
WHERE satisfaction_rating IS NOT NULL;

-- Grant access
GRANT SELECT ON public.admin_satisfaction_stats TO authenticated;