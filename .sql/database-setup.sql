-- FoxusCode Database Setup Script
-- Run this in your Supabase SQL Editor

-- First, ensure we're working with the public schema
SET search_path TO public;

-- Create forms table
CREATE TABLE IF NOT EXISTS forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  email_recipient TEXT NOT NULL,
  email_subject TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  files TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_forms_user_id ON forms(user_id);
CREATE INDEX IF NOT EXISTS idx_forms_created_at ON forms(created_at);
CREATE INDEX IF NOT EXISTS idx_forms_is_active ON forms(is_active);
CREATE INDEX IF NOT EXISTS idx_submissions_form_id ON submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own forms" ON forms;
DROP POLICY IF EXISTS "Users can create their own forms" ON forms;
DROP POLICY IF EXISTS "Users can update their own forms" ON forms;
DROP POLICY IF EXISTS "Users can delete their own forms" ON forms;
DROP POLICY IF EXISTS "Anyone can submit to active forms" ON submissions;
DROP POLICY IF EXISTS "Form owners can view submissions" ON submissions;

-- Create RLS policies for forms table
CREATE POLICY "Users can view their own forms" ON forms
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own forms" ON forms
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own forms" ON forms
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own forms" ON forms
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for submissions table
CREATE POLICY "Anyone can submit to active forms" ON submissions
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = form_id 
      AND forms.is_active = true
    )
  );

CREATE POLICY "Form owners can view submissions" ON submissions
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = form_id 
      AND forms.user_id = auth.uid()
    )
  );

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_forms_updated_at ON forms;
CREATE TRIGGER update_forms_updated_at
  BEFORE UPDATE ON forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON forms TO authenticated;
GRANT ALL ON submissions TO authenticated;
GRANT SELECT ON submissions TO anon;

-- Insert some sample data (optional - remove if you don't want sample data)
-- This will only work if you have a user authenticated
/*
INSERT INTO forms (user_id, title, description, fields, email_recipient, email_subject) 
SELECT 
  auth.uid(),
  'Contact Form',
  'A simple contact form for website visitors',
  '[{"id":"name","type":"text","label":"Full Name","placeholder":"Enter your name","required":true},{"id":"email","type":"email","label":"Email Address","placeholder":"Enter your email","required":true},{"id":"message","type":"textarea","label":"Message","placeholder":"Enter your message","required":true}]'::jsonb,
  'contact@example.com',
  'New Contact Form Submission'
WHERE auth.uid() IS NOT NULL;
*/

---

-- Create comments table for user feedback and suggestions
-- Run this in your Supabase SQL Editor

-- First, ensure we're working in the public schema
SET search_path TO public;

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'bug', 'feature', 'improvement', 'question')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comment_likes table for like functionality
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id) -- Ensure one like per user per comment
);

-- Create comment_responses table for threaded discussions
CREATE TABLE IF NOT EXISTS comment_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);
CREATE INDEX IF NOT EXISTS idx_comments_category ON comments(category);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_responses_comment_id ON comment_responses(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_responses_user_id ON comment_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_responses_created_at ON comment_responses(created_at);

-- Enable Row Level Security
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_responses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all comments" ON comments;
DROP POLICY IF EXISTS "Users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;
DROP POLICY IF EXISTS "Users can view all comment likes" ON comment_likes;
DROP POLICY IF EXISTS "Users can create comment likes" ON comment_likes;
DROP POLICY IF EXISTS "Users can delete their own comment likes" ON comment_likes;
DROP POLICY IF EXISTS "Users can view all comment responses" ON comment_responses;
DROP POLICY IF EXISTS "Users can create comment responses" ON comment_responses;
DROP POLICY IF EXISTS "Users can update their own comment responses" ON comment_responses;
DROP POLICY IF EXISTS "Users can delete their own comment responses" ON comment_responses;

-- Create RLS policies for comments table
CREATE POLICY "Users can view all comments" ON comments
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create comments" ON comments
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON comments
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON comments
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for comment_likes table
CREATE POLICY "Users can view all comment likes" ON comment_likes
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create comment likes" ON comment_likes
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comment likes" ON comment_likes
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for comment_responses table
CREATE POLICY "Users can view all comment responses" ON comment_responses
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create comment responses" ON comment_responses
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comment responses" ON comment_responses
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comment responses" ON comment_responses
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create trigger to automatically update updated_at for comments
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically update updated_at for comment_responses
DROP TRIGGER IF EXISTS update_comment_responses_updated_at ON comment_responses;
CREATE TRIGGER update_comment_responses_updated_at
  BEFORE UPDATE ON comment_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON comments TO authenticated;
GRANT ALL ON comment_likes TO authenticated;
GRANT ALL ON comment_responses TO authenticated;

-- Verify the setup
SELECT 
  'Tables created successfully!' as status,
  (SELECT COUNT(*) FROM forms) as forms_count,
  (SELECT COUNT(*) FROM submissions) as submissions_count,
  (SELECT COUNT(*) FROM comments) as comments_count,
  (SELECT COUNT(*) FROM comment_likes) as comment_likes_count,
  (SELECT COUNT(*) FROM comment_responses) as comment_responses_count;
