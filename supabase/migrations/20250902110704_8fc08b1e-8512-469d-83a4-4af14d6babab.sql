-- Add RLS policy to allow authenticated users to update athlete avatars
CREATE POLICY "Allow authenticated users to update athlete avatars" 
ON public.athletes 
FOR UPDATE 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Add RLS policy for organisation/admin users to have full access to athletes
CREATE POLICY "Allow organisation admins to manage athletes" 
ON public.athletes 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('organisation', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('organisation', 'super_admin')
  )
);