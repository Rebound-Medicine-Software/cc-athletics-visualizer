
-- Remove the overly permissive public read policy on teams
DROP POLICY IF EXISTS "Allow public read access to teams" ON public.teams;

-- Create a secure view for public team metadata (excludes secrets)
CREATE OR REPLACE VIEW public.teams_public
WITH (security_invoker = true)
AS
SELECT
  id, name, logo_url, primary_color, secondary_color, accent_color, font_family,
  city, country, region, location, latitude, longitude, practitioner_count, creation_date
FROM public.teams;

-- Grant SELECT on the view to anon and authenticated
GRANT SELECT ON public.teams_public TO anon, authenticated;
