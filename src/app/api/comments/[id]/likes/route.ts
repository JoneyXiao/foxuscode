import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: commentId } = await params;

    // Ultra-fast approach: Single operation with conflict handling
    const { data: like, error } = await supabase
      .from('comment_likes')
      .upsert({
        comment_id: commentId,
        user_id: user.id,
      }, {
        onConflict: 'comment_id,user_id',
        ignoreDuplicates: true
      })
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Error creating like:', error);
      if (error.code === '23503') { // Foreign key violation - comment doesn't exist
        return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to create like' }, { status: 500 });
    }

    // If no data returned, it was a duplicate (already liked)
    if (!like) {
      return NextResponse.json({ error: 'Already liked' }, { status: 409 });
    }

    // Return success without expensive count query
    // Frontend will increment optimistically
    return NextResponse.json({ 
      like,
      success: true
    }, { status: 201 });
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

    const { id: commentId } = await params;

    // Ultra-fast delete without count query
    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting like:', error);
      return NextResponse.json({ error: 'Failed to delete like' }, { status: 500 });
    }

    // Return success immediately - frontend will decrement optimistically
    return NextResponse.json({ 
      success: true
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
