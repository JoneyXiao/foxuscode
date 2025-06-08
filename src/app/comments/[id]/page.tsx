import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth-server';
import { Navbar } from '@/components/navbar';
import { CommentDetailContent } from '@/app/comments/[id]/comment-detail-content';

// Force this route to be dynamic since it uses authentication
export const dynamic = 'force-dynamic';

interface CommentPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CommentPage({ params }: CommentPageProps) {
  const session = await getServerSession();

  if (!session) {
    redirect('/auth/signin');
  }

  const { id } = await params;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={session.user} showCreateButton={false} />
      <main className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading...</div>}>
          <CommentDetailContent commentId={id} />
        </Suspense>
      </main>
    </div>
  );
}
