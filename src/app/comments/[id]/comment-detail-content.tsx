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
  Trash2,
  Loader2,
  UserCircle
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
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'in_progress': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'bug': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'feature': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'improvement': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'question': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!comment) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">{t('comments.notFound')}</h3>
            <p className="text-muted-foreground">{t('comments.commentNotFoundDescription')}</p>
          </div>
          <Link href="/comments">
            <Button variant="outline" size="lg">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
      {/* Back Button - Mobile optimized */}
      <div className="sticky top-4 z-10">
        <Link href="/comments">
          <Button variant="outline" size="lg" className="shadow-lg bg-background/95 backdrop-blur-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="sm:inline">{t('common.back')}</span>
          </Button>
        </Link>
      </div>

      {/* Main Comment - Enhanced mobile layout */}
      <Card className="border-l-4 border-l-blue-500 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-start sm:space-y-0">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl mb-4 leading-tight">{comment.title}</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge className={`${getCategoryColor(comment.category)} text-xs font-medium px-3 py-1`}>
                  {t(`comments.categories.${comment.category}`)}
                </Badge>
                <Badge className={`${getPriorityColor(comment.priority)} text-xs font-medium px-3 py-1`}>
                  {t(`comments.priorities.${comment.priority}`)}
                </Badge>
                <Badge className={`${getStatusColor(comment.status)} text-xs font-medium px-3 py-1`}>
                  {t(`comments.status.${comment.status}`)}
                </Badge>
              </div>
            </div>
            {user?.id === comment.user_id && (
              <div className="flex gap-2 shrink-0">
                <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-red-600 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="prose max-w-none">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
            </div>
            
            <div className="pt-4 border-t space-y-4">
              {/* Author Info - Mobile optimized */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                    <UserCircle className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {comment.users.name || comment.users.email}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(comment.created_at)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Actions - Mobile optimized */}
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLike}
                    className={`h-10 px-4 ${comment.isLikedByUser ? 'text-red-600' : 'text-muted-foreground'} hover:text-red-600`}
                  >
                    <Heart className={`w-4 h-4 mr-2 ${comment.isLikedByUser ? 'fill-current' : ''}`} />
                    <span className="font-medium">{comment.likeCount}</span>
                  </Button>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MessageSquare className="w-4 h-4" />
                    <span className="font-medium text-sm">{comment.responseCount}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Response - Enhanced mobile form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            {t('comments.responses.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              placeholder={t('comments.responses.placeholder')}
              value={newResponse}
              onChange={(e) => setNewResponse(e.target.value)}
              rows={4}
              className="text-base resize-none"
            />
            <Button 
              onClick={handleSubmitResponse}
              disabled={!newResponse.trim() || responseLoading}
              className="w-full sm:w-auto h-11 px-6 text-sm"
              size="lg"
            >
              {responseLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('comments.responses.submitting')}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {t('comments.responses.submit')}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Responses - Enhanced mobile layout */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold">
            {t('comments.responses.count')}
          </h3>
          <Badge variant="secondary" className="px-2 py-1">
            {responses.length}
          </Badge>
        </div>
        
        {responses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">{t('comments.responses.noResponses')}</h4>
                  <p className="text-sm text-muted-foreground">{t('comments.responses.beFirstToRespond')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {responses.map((response, index) => (
              <Card key={response.id} className={`${index === 0 ? 'ring-2 ring-blue-100' : ''}`}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{response.content}</p>
                    
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-3 border-t">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {response.users.name || response.users.email}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(response.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {user?.id === response.user_id && (
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
