import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(
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

    // Get responses for the comment
    const { data: responses, error } = await supabase
      .from('comment_responses')
      .select('*')
      .eq('comment_id', commentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching responses:', error);
      return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 });
    }

    // Add user info to the responses (simplified for now)
    const responsesWithUsers = (responses || []).map(response => ({
      ...response,
      users: {
        email: 'User',
        name: 'User'
      }
    }));

    return NextResponse.json({ responses: responsesWithUsers });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const body = await request.json();
    const { content } = body;

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Check if comment exists
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Create the response
    const { data: response, error } = await supabase
      .from('comment_responses')
      .insert({
        comment_id: commentId,
        user_id: user.id,
        content: content.trim(),
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating response:', error);
      return NextResponse.json({ error: 'Failed to create response' }, { status: 500 });
    }

    // Add user info to the response
    const responseWithUser = {
      ...response,
      users: {
        email: 'User',
        name: 'User'
      }
    };

    return NextResponse.json({ response: responseWithUser }, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
