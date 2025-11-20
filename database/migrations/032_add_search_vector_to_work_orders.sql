-- Migration 032: Add search_vector column to work_orders table
-- This migration adds the search_vector tsvector column needed by the work_orders_search_trigger

-- Add the search_vector column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN search_vector tsvector;
    
    -- Create GIN index on search_vector for full-text search performance
    CREATE INDEX idx_work_orders_search_vector 
    ON work_orders USING gin (search_vector);
    
    -- Update existing rows with search vectors
    UPDATE work_orders 
    SET search_vector = 
      setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
      setweight(to_tsvector('simple', COALESCE(category, '')), 'C')
    WHERE search_vector IS NULL;
    
  END IF;
END $$;