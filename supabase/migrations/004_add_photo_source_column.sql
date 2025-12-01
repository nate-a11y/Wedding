-- Add source column to track whether photo was taken via camera or uploaded
ALTER TABLE photos ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'upload';

-- Create index for filtering by source
CREATE INDEX IF NOT EXISTS idx_photos_source ON photos(source);
