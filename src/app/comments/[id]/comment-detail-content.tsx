'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Heart, 
  MessageSquare, 
  Calendar, 
  User, 
  Send,
  Edit2,
  Trash2
} from 'lucide-react';
import { createClientComponentClient } from '@/lib/supabase';
import { toast } from 'sonner';
import Link from 'next/link';

interface Comment {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  users: {
    email: string;
    name?: string;
  };
  user_id: string;
  likeCount: number;
  responseCount: number;
  isLikedByUser: boolean;
}

interface Response {
  id: string;
  comment_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  users: {
    email: string;
    name?: string;
  };
}

interface User {
  id: string;
  email?: string;
}

interface CommentDetailContentProps {
  commentId: string;
}

export function CommentDetailContent({ commentId }: CommentDetailContentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [comment, setComment] = useState<Comment | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [responseLoading, setResponseLoading] = useState(false);
  const [newResponse, setNewResponse] = useState('');
  const [user, setUser] = useState<User | null>(null);

  // Use ref to store current translation function for stable callbacks
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const supabase = createClientComponentClient();

  const fetchUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  }, [supabase]);

  const fetchComment = useCallback(async () => {
    try {
      const response = await fetch(`/api/comments/${commentId}`);
      const data = await response.json();

      if (response.ok) {
        setComment(data.comment);
      } else {
        toast.error(tRef.current('comments.errors.failedToLoadComment'));
        router.push('/comments');
      }
    } catch (error) {
      console.error('Error fetching comment:', error);
      toast.error(tRef.current('comments.errors.failedToLoadComment'));
      router.push('/comments');
    }
  }, [commentId, router]);

  const fetchResponses = useCallback(async () => {
    try {
      const response = await fetch(`/api/comments/${commentId}/responses`);
      const data = await response.json();

      if (response.ok) {
        setResponses(data.responses || []);
      } else {
        toast.error(tRef.current('comments.errors.failedToLoadResponses'));
      }
    } catch (error) {
      console.error('Error fetching responses:', error);
      toast.error(tRef.current('comments.errors.failedToLoadResponses'));
    }
  }, [commentId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (user !== null) {
      setLoading(true);
      Promise.all([fetchComment(), fetchResponses()]).finally(() => {
        setLoading(false);
      });
    }
  }, [user, fetchComment, fetchResponses]);

  const handleLike = async () => {
    if (!comment || !user) return;

    const wasLiked = comment.isLikedByUser;
    const optimisticLikeCount = wasLiked ? comment.likeCount - 1 : comment.likeCount + 1;

    // Optimistic update - update UI immediately
    setComment(prev => prev ? {
      ...prev,
      likeCount: optimisticLikeCount,
      isLikedByUser: !wasLiked
    } : null);

    try {
      const method = wasLiked ? 'DELETE' : 'POST';
      const response = await fetch(`/api/comments/${commentId}/likes`, {
        method,
      });

      if (!response.ok) {
        // Revert optimistic update on error
        setComment(prev => prev ? {
          ...prev,
          likeCount: comment.likeCount,
          isLikedByUser: wasLiked
        } : null);
        toast.error(tRef.current('errors.failedToLike'));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert optimistic update on error
      setComment(prev => prev ? {
        ...prev,
        likeCount: comment.likeCount,
        isLikedByUser: wasLiked
      } : null);
      toast.error(tRef.current('errors.failedToLike'));
    }
  };

  const handleSubmitResponse = async () => {
    if (!newResponse.trim() || !user) return;

    setResponseLoading(true);
    try {
      const response = await fetch(`/api/comments/${commentId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newResponse }),
      });

      if (response.ok) {
        const data = await response.json();
        setResponses(prev => [...prev, data.response]);
        setNewResponse('');
        setComment(prev => prev ? {
          ...prev,
          responseCount: prev.responseCount + 1
        } : null);
        toast.success(tRef.current('success.responseCreated'));
      } else {
        toast.error(tRef.current('errors.failedToAddResponse'));
      }
    } catch (error) {
      console.error('Error adding response:', error);
      toast.error(tRef.current('errors.failedToAddResponse'));
    } finally {
      setResponseLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'bug': return 'bg-red-100 text-red-800';
      case 'feature': return 'bg-blue-100 text-blue-800';
      case 'improvement': return 'bg-purple-100 text-purple-800';
      case 'question': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!comment) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">{t('comments.notFound')}</p>
        <Link href="/comments">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/comments">
        <Button variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.back')}
        </Button>
      </Link>

      {/* Main Comment */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">{comment.title}</CardTitle>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge className={getCategoryColor(comment.category)}>
                  {t(`comments.categories.${comment.category}`)}
                </Badge>
                <Badge className={getPriorityColor(comment.priority)}>
                  {t(`comments.priorities.${comment.priority}`)}
                </Badge>
                <Badge className={getStatusColor(comment.status)}>
                  {t(`comments.status.${comment.status}`)}
                </Badge>
              </div>
            </div>
            {user?.id === comment.user_id && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none mb-6">
            <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>{comment.users.name || comment.users.email}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(comment.created_at)}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={comment.isLikedByUser ? 'text-red-600' : ''}
              >
                <Heart className={`w-4 h-4 mr-1 ${comment.isLikedByUser ? 'fill-current' : ''}`} />
                <span>{comment.likeCount}</span>
              </Button>
              <div className="flex items-center gap-1 text-gray-500">
                <MessageSquare className="w-4 h-4" />
                <span>{comment.responseCount}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Response */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('comments.responses.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              placeholder={t('comments.responses.placeholder')}
              value={newResponse}
              onChange={(e) => setNewResponse(e.target.value)}
              rows={4}
            />
            <Button 
              onClick={handleSubmitResponse}
              disabled={!newResponse.trim() || responseLoading}
            >
              {responseLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {responseLoading ? t('comments.responses.submitting') : t('comments.responses.submit')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Responses */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          {t('comments.responses.count')} ({responses.length})
        </h3>
        
        {responses.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              {t('comments.responses.noResponses')}
            </CardContent>
          </Card>
        ) : (
          responses.map((response) => (
            <Card key={response.id}>
              <CardContent className="pt-6">
                <div className="prose max-w-none mb-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{response.content}</p>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{response.users.name || response.users.email}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(response.created_at)}</span>
                    </div>
                  </div>
                  
                  {user?.id === response.user_id && (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
