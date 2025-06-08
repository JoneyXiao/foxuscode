-- Performance optimization functions for comment stats
-- Run this in your Supabase SQL Editor

-- Function to get like counts for multiple comments in a single query
CREATE OR REPLACE FUNCTION get_comment_like_counts(comment_ids UUID[])
RETURNS TABLE(comment_id UUID, like_count BIGINT)
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    cl.comment_id,
    COUNT(*) as like_count
  FROM comment_likes cl
  WHERE cl.comment_id = ANY(comment_ids)
  GROUP BY cl.comment_id;
$$;

-- Function to get response counts for multiple comments in a single query
CREATE OR REPLACE FUNCTION get_comment_response_counts(comment_ids UUID[])
RETURNS TABLE(comment_id UUID, response_count BIGINT)
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    cr.comment_id,
    COUNT(*) as response_count
  FROM comment_responses cr
  WHERE cr.comment_id = ANY(comment_ids)
  GROUP BY cr.comment_id;
$$;

-- Function to toggle like with validation and count in a single transaction
CREATE OR REPLACE FUNCTION toggle_comment_like(p_comment_id UUID, p_user_id UUID)
RETURNS TABLE(id UUID, comment_id UUID, user_id UUID, created_at TIMESTAMPTZ, like_count BIGINT)
LANGUAGE plpgsql
AS $$
DECLARE
  like_record RECORD;
  current_count BIGINT;
BEGIN
  -- Check if comment exists
  IF NOT EXISTS (SELECT 1 FROM comments WHERE comments.id = p_comment_id) THEN
    RAISE EXCEPTION 'Comment not found';
  END IF;

  -- Check if user already liked this comment
  IF EXISTS (SELECT 1 FROM comment_likes WHERE comment_likes.comment_id = p_comment_id AND comment_likes.user_id = p_user_id) THEN
    RAISE EXCEPTION 'Already liked';
  END IF;

  -- Insert the like and get the record
  INSERT INTO comment_likes (comment_id, user_id) 
  VALUES (p_comment_id, p_user_id)
  RETURNING * INTO like_record;

  -- Get the updated count
  SELECT COUNT(*) INTO current_count 
  FROM comment_likes 
  WHERE comment_likes.comment_id = p_comment_id;

  -- Return the like record with count
  RETURN QUERY SELECT 
    like_record.id,
    like_record.comment_id,
    like_record.user_id,
    like_record.created_at,
    current_count;
END;
$$;

-- Function to unlike comment and return updated count
CREATE OR REPLACE FUNCTION unlike_comment(p_comment_id UUID, p_user_id UUID)
RETURNS TABLE(like_count BIGINT)
LANGUAGE plpgsql
AS $$
DECLARE
  current_count BIGINT;
BEGIN
  -- Delete the like
  DELETE FROM comment_likes 
  WHERE comment_likes.comment_id = p_comment_id 
  AND comment_likes.user_id = p_user_id;

  -- Get the updated count
  SELECT COUNT(*) INTO current_count 
  FROM comment_likes 
  WHERE comment_likes.comment_id = p_comment_id;

  -- Return the count
  RETURN QUERY SELECT current_count;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_comment_like_counts(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_comment_response_counts(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_comment_like(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unlike_comment(UUID, UUID) TO authenticated;
