import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { updateCommentSchema } from '@/lib/validations';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    );

    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching comment:', error);
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Use optimized function for single comment if available
    const { data: commentStats, error: statsError } = await supabase.rpc('get_single_comment_stats', {
      comment_id: id,
      current_user_id: user.id
    });

    let likeCount = 0;
    let responseCount = 0;
    let isLikedByUser = false;

    if (statsError || !commentStats || commentStats.length === 0) {
      console.log('Using fallback queries for comment stats:', statsError?.message);
      
      // Fallback to parallel queries
      const [likeData, responseData, userLike] = await Promise.all([
        supabase.from('comment_likes').select('id').eq('comment_id', id),
        supabase.from('comment_responses').select('id').eq('comment_id', id),
        supabase.from('comment_likes').select('id').eq('comment_id', id).eq('user_id', user.id).maybeSingle()
      ]);

      likeCount = likeData.data?.length || 0;
      responseCount = responseData.data?.length || 0;
      isLikedByUser = !!userLike.data;
    } else {
      // The RPC function returns an array, so we need to access the first element
      const stats = commentStats[0];
      likeCount = Number(stats.like_count) || 0;
      responseCount = Number(stats.response_count) || 0;
      isLikedByUser = stats.is_liked_by_user || false;
    }

    // Add user info and stats to the response
    const commentWithUser = {
      ...comment,
      users: {
        email: 'User',
        name: 'User'
      },
      likeCount,
      responseCount,
      isLikedByUser
    };

    return NextResponse.json({ comment: commentWithUser });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
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
    const validationResult = updateCommentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Check if the comment exists and belongs to the user
    const { data: existingComment, error: fetchError } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (existingComment.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update the comment
    const { data: comment, error } = await supabase
      .from('comments')
      .update(validationResult.data)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating comment:', error);
      return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
    }

    // Add user info to the response
    const commentWithUser = {
      ...comment,
      users: {
        email: 'User',
        name: 'User'
      }
    };

    return NextResponse.json({ comment: commentWithUser });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    );

    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the comment exists and belongs to the user
    const { data: existingComment, error: fetchError } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (existingComment.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the comment
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting comment:', error);
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
