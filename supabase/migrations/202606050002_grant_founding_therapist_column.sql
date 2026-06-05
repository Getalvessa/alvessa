-- Grant column-level SELECT on is_founding_therapist to public roles.
-- Migration 202605310002 set column-level grants on providers; the new column
-- added by 202606050001 was not included, causing the /aanbod query to fail
-- with permission denied (42501) for any request that selects this column.
GRANT SELECT (is_founding_therapist) ON public.providers TO anon;
GRANT SELECT (is_founding_therapist) ON public.providers TO authenticated;
