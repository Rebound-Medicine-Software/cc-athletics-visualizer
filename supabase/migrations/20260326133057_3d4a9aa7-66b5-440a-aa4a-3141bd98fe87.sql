CREATE POLICY "Allow authenticated users to insert region testing"
ON public."Region Testing"
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update region testing"
ON public."Region Testing"
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete region testing"
ON public."Region Testing"
FOR DELETE
TO authenticated
USING (true);