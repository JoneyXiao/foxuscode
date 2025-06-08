-- Ultra-performance SQL function for comments with all stats
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_comments_with_stats(
  filter_category TEXT DEFAULT NULL,
  filter_status TEXT DEFAULT NULL,
  filter_priority TEXT DEFAULT NULL,
  filter_user_id UUID DEFAULT NULL,
  current_user_id UUID DEFAULT NULL,
  sort_order TEXT DEFAULT 'newest'
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  content TEXT,
  category TEXT,
  status TEXT,
  priority TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_id UUID,
  like_count BIGINT,
  response_count BIGINT,
  is_liked_by_user BOOLEAN
)
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    c.id,
    c.title,
    c.content,
    c.category,
    c.status,
    c.priority,
    c.created_at,
    c.updated_at,
    c.user_id,
    COALESCE(like_counts.like_count, 0) as like_count,
    COALESCE(response_counts.response_count, 0) as response_count,
    COALESCE(user_likes.is_liked, false) as is_liked_by_user
  FROM comments c
  
  -- Left join for like counts
  LEFT JOIN (
    SELECT 
      comment_id, 
      COUNT(*) as like_count
    FROM comment_likes 
    GROUP BY comment_id
  ) like_counts ON c.id = like_counts.comment_id
  
  -- Left join for response counts
  LEFT JOIN (
    SELECT 
      comment_id, 
      COUNT(*) as response_count
    FROM comment_responses 
    GROUP BY comment_id
  ) response_counts ON c.id = response_counts.comment_id
  
  -- Left join for current user likes
  LEFT JOIN (
    SELECT 
      comment_id, 
      true as is_liked
    FROM comment_likes 
    WHERE user_id = current_user_id
  ) user_likes ON c.id = user_likes.comment_id
  
  WHERE 1=1
    AND (filter_category IS NULL OR c.category = filter_category)
    AND (filter_status IS NULL OR c.status = filter_status)
    AND (filter_priority IS NULL OR c.priority = filter_priority)
    AND (filter_user_id IS NULL OR c.user_id = filter_user_id)
  
  ORDER BY 
    CASE 
      WHEN sort_order = 'oldest' THEN c.created_at 
    END ASC,
    CASE 
      WHEN sort_order = 'priority' THEN 
        CASE c.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END
    END ASC,
    CASE 
      WHEN sort_order = 'status' THEN c.status 
    END ASC,
    CASE 
      WHEN sort_order = 'newest' OR sort_order IS NULL THEN c.created_at 
    END DESC;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_comments_with_stats(TEXT, TEXT, TEXT, UUID, UUID, TEXT) TO authenticated;

-- Function for single comment stats
CREATE OR REPLACE FUNCTION get_single_comment_stats(
  comment_id UUID,
  current_user_id UUID
)
RETURNS TABLE(
  like_count BIGINT,
  response_count BIGINT,
  is_liked_by_user BOOLEAN
)
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    COALESCE(like_counts.like_count, 0) as like_count,
    COALESCE(response_counts.response_count, 0) as response_count,
    COALESCE(user_likes.is_liked, false) as is_liked_by_user
  FROM (SELECT 1) dummy
  
  -- Left join for like counts
  LEFT JOIN (
    SELECT COUNT(*) as like_count
    FROM comment_likes 
    WHERE comment_likes.comment_id = get_single_comment_stats.comment_id
  ) like_counts ON true
  
  -- Left join for response counts
  LEFT JOIN (
    SELECT COUNT(*) as response_count
    FROM comment_responses 
    WHERE comment_responses.comment_id = get_single_comment_stats.comment_id
  ) response_counts ON true
  
  -- Left join for current user likes
  LEFT JOIN (
    SELECT true as is_liked
    FROM comment_likes 
    WHERE comment_likes.comment_id = get_single_comment_stats.comment_id
      AND comment_likes.user_id = current_user_id
    LIMIT 1
  ) user_likes ON true;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_single_comment_stats(UUID, UUID) TO authenticated;
