-- Enable RLS on tables that don't have it enabled (excluding views)
ALTER TABLE "Elite Athletes New" ENABLE ROW LEVEL SECURITY;

-- Add missing policies for tables with RLS enabled but no policies
CREATE POLICY "Allow public read access" ON "Elite Athletes New" FOR SELECT USING (true);