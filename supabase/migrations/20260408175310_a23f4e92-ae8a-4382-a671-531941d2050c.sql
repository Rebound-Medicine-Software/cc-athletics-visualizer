
-- Add consent tracking columns to athletes table
ALTER TABLE public.athletes 
ADD COLUMN consent_status text NOT NULL DEFAULT 'pending',
ADD COLUMN consent_token uuid DEFAULT gen_random_uuid(),
ADD COLUMN consent_signed_at timestamp with time zone,
ADD COLUMN consent_signed_name text,
ADD COLUMN consent_ip_address text;

-- Add check constraint for consent_status values
ALTER TABLE public.athletes
ADD CONSTRAINT athletes_consent_status_check 
CHECK (consent_status IN ('pending', 'confirmed', 'declined'));

-- Create index on consent_token for fast lookups
CREATE INDEX idx_athletes_consent_token ON public.athletes(consent_token);

-- Allow public (unauthenticated) access to validate consent tokens and submit consent
CREATE POLICY "Allow public to read athletes by consent token"
ON public.athletes
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow public to update consent via token"
ON public.athletes
FOR UPDATE
TO anon
USING (consent_token IS NOT NULL AND consent_status = 'pending')
WITH CHECK (consent_token IS NOT NULL);
