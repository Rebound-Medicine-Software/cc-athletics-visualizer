
-- Create test_videos table for associating tests with YouTube videos
CREATE TABLE test_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name text NOT NULL,
  test_link text NOT NULL, -- YouTube video URL
  created_at timestamptz DEFAULT now()
);

-- Optional: create an index on test_name for fast lookup
CREATE INDEX idx_test_videos_test_name ON test_videos (test_name);

-- Ensure test_name is unique if you want only one video per test:
-- ALTER TABLE test_videos ADD CONSTRAINT unique_test_name UNIQUE (test_name);
