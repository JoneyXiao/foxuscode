'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Plus, 
  MessageSquare, 
  Calendar, 
  User, 
  Filter,
  SortAsc,
  Edit2,
  Trash2,
  Heart,
  ExternalLink
} from 'lucide-react';
import { CreateCommentDialog } from './create-comment-dialog';
import { EditCommentDialog } from './edit-comment-dialog';
import { createClientComponentClient } from '@/lib/supabase';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

interface User {
  id: string;
  email?: string;
}

export function CommentsContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [user, setUser] = useState<User | null>(null);
  
  // Use ref to store current translation function for stable callbacks
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);
  
  // Filters and sorting
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [viewFilter, setViewFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const supabase = createClientComponentClient();

  const fetchUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  }, [supabase]); // Use stable supabase reference

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (viewFilter === 'myComments' && user) params.append('userId', user.id);
      if (sortBy) params.append('sort', sortBy);

      const response = await fetch(`/api/comments?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setComments(data.comments || []);
      } else {
        toast.error(tRef.current('comments.errors.failedToLoadComments'));
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error(tRef.current('comments.errors.failedToLoadComments'));
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter, priorityFilter, viewFilter, sortBy, user]); // Stable dependencies only

  // Fetch user once on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Fetch comments when user or filters change
  useEffect(() => {
    if (user !== null) { // Only fetch when user state is initialized
      fetchComments();
    }
  }, [fetchComments, user]);

  const handleCommentCreated = (newComment: Omit<Comment, 'likeCount' | 'responseCount' | 'isLikedByUser'>) => {
    const commentWithDefaults = {
      ...newComment,
      likeCount: 0,
      responseCount: 0,
      isLikedByUser: false
    };
    setComments(prev => [commentWithDefaults, ...prev]);
    setShowCreateDialog(false);
    toast.success(t('success.commentCreated'));
  };

  const handleCommentUpdated = (updatedComment: Omit<Comment, 'likeCount' | 'responseCount' | 'isLikedByUser'>) => {
    setComments(prev => 
      prev.map(comment => 
        comment.id === updatedComment.id ? {
          ...updatedComment,
          likeCount: comment.likeCount,
          responseCount: comment.responseCount,
          isLikedByUser: comment.isLikedByUser
        } : comment
      )
    );
    setEditingComment(null);
    toast.success(t('success.commentUpdated'));
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm(t('comments.delete'))) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setComments(prev => prev.filter(comment => comment.id !== commentId));
        toast.success(t('success.commentDeleted'));
      } else {
        toast.error(t('errors.generic'));
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error(t('errors.generic'));
    }
  };

  const handleLike = async (commentId: string) => {
    if (!user) return;

    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    const wasLiked = comment.isLikedByUser;
    const optimisticLikeCount = wasLiked ? comment.likeCount - 1 : comment.likeCount + 1;

    // Optimistic update - update UI immediately
    setComments(prev => 
      prev.map(c => 
        c.id === commentId 
          ? {
              ...c,
              likeCount: optimisticLikeCount,
              isLikedByUser: !wasLiked
            }
          : c
      )
    );

    try {
      const method = wasLiked ? 'DELETE' : 'POST';
      const response = await fetch(`/api/comments/${commentId}/likes`, {
        method,
      });

      if (!response.ok) {
        // Revert optimistic update on error
        setComments(prev => 
          prev.map(c => 
            c.id === commentId 
              ? {
                  ...c,
                  likeCount: comment.likeCount,
                  isLikedByUser: wasLiked
                }
              : c
          )
        );
        toast.error(t('errors.generic'));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert optimistic update on error
      setComments(prev => 
        prev.map(c => 
          c.id === commentId 
            ? {
                ...c,
                likeCount: comment.likeCount,
                isLikedByUser: wasLiked
              }
            : c
        )
      );
      toast.error(t('errors.generic'));
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('comments.title')}</h1>
          <p className="text-gray-600 mt-1 text-sm">{t('comments.subtitle')}</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          {t('comments.create')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-sm">
            <Filter className="mr-2 h-4 w-4" />
            {t('common.filter')} & {t('common.sort')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 text-sm">
            <Select value={viewFilter} onValueChange={setViewFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('comments.filters.all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('comments.filters.all')}</SelectItem>
                <SelectItem value="myComments">{t('comments.filters.myComments')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('comments.form.category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('comments.filters.all')}</SelectItem>
                <SelectItem value="general">{t('comments.categories.general')}</SelectItem>
                <SelectItem value="bug">{t('comments.categories.bug')}</SelectItem>
                <SelectItem value="feature">{t('comments.categories.feature')}</SelectItem>
                <SelectItem value="improvement">{t('comments.categories.improvement')}</SelectItem>
                <SelectItem value="question">{t('comments.categories.question')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('comments.status.open')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('comments.filters.all')}</SelectItem>
                <SelectItem value="open">{t('comments.status.open')}</SelectItem>
                <SelectItem value="in_progress">{t('comments.status.in_progress')}</SelectItem>
                <SelectItem value="resolved">{t('comments.status.resolved')}</SelectItem>
                <SelectItem value="closed">{t('comments.status.closed')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('comments.form.priority')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('comments.filters.all')}</SelectItem>
                <SelectItem value="low">{t('comments.priorities.low')}</SelectItem>
                <SelectItem value="medium">{t('comments.priorities.medium')}</SelectItem>
                <SelectItem value="high">{t('comments.priorities.high')}</SelectItem>
                <SelectItem value="urgent">{t('comments.priorities.urgent')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder={t('comments.sort.newest')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t('comments.sort.newest')}</SelectItem>
                <SelectItem value="oldest">{t('comments.sort.oldest')}</SelectItem>
                <SelectItem value="priority">{t('comments.sort.priority')}</SelectItem>
                <SelectItem value="status">{t('comments.sort.status')}</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center text-sm text-gray-600">
              <SortAsc className="mr-2 h-4 w-4" />
              {comments.length} {t('comments.allComments')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments List */}
      {comments.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t('comments.noComments')}
              </h3>
              <p className="text-gray-600 mb-4">
                {t('comments.noCommentsDescription')}
              </p>
              <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                {t('comments.create')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <Card key={comment.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-base mb-2">{comment.title}</CardTitle>
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
                  {user && comment.user_id === user.id && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingComment(comment)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4 whitespace-pre-wrap text-sm">{comment.content}</p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center">
                      <User className="mr-1 h-3 w-3" />
                      {comment.users.name || comment.users.email}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="mr-1 h-3 w-3" />
                      {formatDate(comment.created_at)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleLike(comment.id)}
                      className={`flex items-center gap-1 hover:text-red-600 transition-colors ${
                        comment.isLikedByUser ? 'text-red-600' : ''
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${comment.isLikedByUser ? 'fill-current' : ''}`} />
                      <span>{comment.likeCount}</span>
                    </button>
                    
                    <div className="flex items-center gap-1 text-gray-500">
                      <MessageSquare className="h-4 w-4" />
                      <span>{comment.responseCount}</span>
                    </div>
                    
                    <Link 
                      href={`/comments/${comment.id}`}
                      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                      onMouseEnter={() => router.prefetch(`/comments/${comment.id}`)}
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>{t('comments.responses.view')}</span>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CreateCommentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCommentCreated={handleCommentCreated}
      />

      {editingComment && (
        <EditCommentDialog
          open={!!editingComment}
          onOpenChange={() => setEditingComment(null)}
          comment={editingComment}
          onCommentUpdated={handleCommentUpdated}
        />
      )}
    </div>
  );
}
