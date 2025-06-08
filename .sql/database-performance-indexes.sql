-- Additional performance indexes for likes
-- Run this in your Supabase SQL Editor

-- Composite index for faster unique constraint checking
CREATE INDEX IF NOT EXISTS idx_comment_likes_composite 
ON comment_likes(comment_id, user_id);

-- Index for faster user-specific queries
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_comment 
ON comment_likes(user_id, comment_id);

-- Index for faster comment deletion cascades
CREATE INDEX IF NOT EXISTS idx_comment_responses_comment_user 
ON comment_responses(comment_id, user_id);

-- Index for faster comment response queries
CREATE INDEX IF NOT EXISTS idx_comment_responses_created_at 
ON comment_responses(comment_id, created_at DESC);

-- Analyze tables to update statistics
ANALYZE comment_likes;
ANALYZE comment_responses;
ANALYZE comments;
