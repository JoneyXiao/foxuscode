import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth-server';
import { Navbar } from '@/components/navbar';
import { CommentsContent } from './comments-content';

// Force this route to be dynamic since it uses authentication
export const dynamic = 'force-dynamic';

export default async function CommentsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={session.user} showCreateButton={false} />
      <main className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading...</div>}>
          <CommentsContent />
        </Suspense>
      </main>
    </div>
  );
}
