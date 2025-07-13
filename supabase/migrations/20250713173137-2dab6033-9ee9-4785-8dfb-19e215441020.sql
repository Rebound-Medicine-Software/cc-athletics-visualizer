-- Drop the existing Region Testing table
DROP TABLE IF EXISTS public."Region Testing";

-- Create new Region Testing table with updated data
CREATE TABLE public."Region Testing" (
  id UUID DEFAULT gen_random_uuid(),
  "Team Name" TEXT NOT NULL,
  Country TEXT NOT NULL,
  Region TEXT,
  Address TEXT,
  Logo TEXT
);

-- Enable RLS
ALTER TABLE public."Region Testing" ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Enable read access for all users" 
ON public."Region Testing" 
FOR SELECT 
USING (true);

-- Insert the new data
INSERT INTO public."Region Testing" ("Team Name", Country, Region, Address, Logo) VALUES
('Two4 Martial Arts', 'Wales', 'Swansea', 'Queensway, Fforest-fach, Swansea SA5 4DL', 'https://two4martialarts.co.uk/wp-content/uploads/2019/06/IMG_2024-02-18-205233-uai-258x258.png'),
('Evolve Physiotherapy', 'Wales', 'Swansea', 'Tennis & Squash Club, The Flat, Cwm Farm Lane, Sketty, Swansea SA2 9AU', 'https://i.ytimg.com/vi/NUq_v5WHGIA/mqdefault.jpg'),
('Joshua Athletic', 'Wales', 'Swansea', '31 James Street, Pontarddulais, Swansea SA4 8HZ', NULL),
('Evolve Physiotherapy (Non-Consenting)', 'Wales', 'Swansea', 'Tennis & Squash Club, The Flat, Cwm Farm Lane, Sketty, Swansea SA2 9AU', 'https://i.ytimg.com/vi/NUq_v5WHGIA/mqdefault.jpg'),
('Chris Rees Academy', 'Wales', 'Swansea', 'Abertawe House, Industrial Estate, Ystrad Road, Fforest-fach, Swansea SA5 4JB', 'https://i.ytimg.com/vi/NUq_v5WHGIA/mqdefault.jpg'),
('Llanelli Town Academy AFC', 'Wales', 'Llanelli', 'Graig Campus, Sandy Rd, Llanelli SA15 4DN', 'https://upload.wikimedia.org/wikipedia/en/2/2e/Llanelli_Town_AFC_badge.jpeg'),
('Leon Welch Academy', 'Wales', 'Swansea', 'Abertawe House, Industrial Estate, Ystrad Road, Fforest-fach, Swansea SA5 4JB', 'https://leonwelchacademy.com/wp-content/uploads/2022/03/Full-Logo-White-1024x341.png'),
('Manchester United', 'England', 'Manchester', 'Old Trafford, Stretford, Manchester M16 0RA', 'https://upload.wikimedia.org/wikipedia/en/thumb/7/7a/Manchester_United_FC_crest.svg/1200px-Manchester_United_FC_crest.svg.png'),
('Tom Stoltman', 'Scotland', 'Alness', 'Near Tomich on A9 By, Invergordon IV18 0LF', NULL),
('Conor McGregor', 'Northern Ireland', 'Dublin', 'Whitehall Rd, Quarry Dr, Perrystown, Dublin 12, Ireland', NULL),
('Ian Garry', 'Ireland', 'Cork', '85A Sunday''s Well Rd, Sunday''s Well, Cork, T23 KX59, Ireland', NULL);