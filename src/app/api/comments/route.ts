import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createCommentSchema } from '@/lib/validations';

// Simple in-memory cache for comments (5 minute TTL)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CommentWithStats {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  like_count: number;
  response_count: number;
  is_liked_by_user: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {
            // We can't set cookies in API routes, but this is required by the interface
          },
          remove() {
            // We can't remove cookies in API routes, but this is required by the interface
          },
        },
      }
    );
    
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const userId = searchParams.get('userId');
    const sort = searchParams.get('sort') || 'newest';

    // Create cache key
    const cacheKey = `comments_${category}_${status}_${priority}_${userId}_${sort}_${user.id}`;
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ comments: cached.data });
    }

    // Filters will be handled by the SQL function parameters

    // Try ultra-optimized single query first
    let { data: comments, error } = await supabase.rpc('get_comments_with_stats', {
      filter_category: category === 'all' ? null : category,
      filter_status: status === 'all' ? null : status,
      filter_priority: priority === 'all' ? null : priority,
      filter_user_id: userId || null,
      current_user_id: user.id,
      sort_order: sort
    });

    // Fallback to basic query if function doesn't exist
    if (error && error.message?.includes('function get_comments_with_stats')) {
      console.log('Using fallback query method');
      
      let query = supabase.from('comments').select('*');
      
      if (category && category !== 'all') query = query.eq('category', category);
      if (status && status !== 'all') query = query.eq('status', status);
      if (priority && priority !== 'all') query = query.eq('priority', priority);
      if (userId) query = query.eq('user_id', userId);

      switch (sort) {
        case 'oldest': query = query.order('created_at', { ascending: true }); break;
        case 'priority': query = query.order('priority', { ascending: false }); break;
        case 'status': query = query.order('status', { ascending: true }); break;
        default: query = query.order('created_at', { ascending: false }); break;
      }

      const result = await query;
      if (result.error) {
        console.error('Error fetching comments:', result.error);
        return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
      }

      // Transform to expected format with default values
      comments = (result.data || []).map(comment => ({
        ...comment,
        like_count: 0,
        response_count: 0,
        is_liked_by_user: false
      }));
      error = null;
    } else if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    // Transform the data to match expected format
    const commentsWithStats = (comments || []).map((comment: CommentWithStats) => ({
      id: comment.id,
      title: comment.title,
      content: comment.content,
      category: comment.category,
      priority: comment.priority,
      status: comment.status,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      user_id: comment.user_id,
      users: {
        email: 'User',
        name: 'User'
      },
      likeCount: Number(comment.like_count) || 0,
      responseCount: Number(comment.response_count) || 0,
      isLikedByUser: comment.is_liked_by_user || false
    }));

    // Cache the result
    cache.set(cacheKey, {
      data: commentsWithStats,
      timestamp: Date.now()
    });

    // Clean old cache entries (simple cleanup)
    if (cache.size > 100) {
      const entries = Array.from(cache.entries());
      entries.slice(0, 50).forEach(([key]) => cache.delete(key));
    }

    return NextResponse.json({ comments: commentsWithStats });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {
            // We can't set cookies in API routes, but this is required by the interface
          },
          remove() {
            // We can't remove cookies in API routes, but this is required by the interface
          },
        },
      }
    );
    
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate the request body
    const validationResult = createCommentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { title, content, category, priority } = validationResult.data;

    // Insert the comment
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        user_id: user.id,
        title,
        content,
        category,
        priority,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }

    // Add user info to the response
    const commentWithUser = {
      ...comment,
      users: {
        email: 'User',
        name: 'User'
      }
    };

    return NextResponse.json({ comment: commentWithUser }, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
