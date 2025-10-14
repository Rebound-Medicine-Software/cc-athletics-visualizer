-- Add RLS policies for Elite Athlete Data table to allow modifications

-- Allow authenticated users to insert elite athlete data
CREATE POLICY "Allow authenticated users to insert elite athlete data"
ON "Elite Athlete Data"
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update elite athlete data
CREATE POLICY "Allow authenticated users to update elite athlete data"
ON "Elite Athlete Data"
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete elite athlete data
CREATE POLICY "Allow authenticated users to delete elite athlete data"
ON "Elite Athlete Data"
FOR DELETE
TO authenticated
USING (true);