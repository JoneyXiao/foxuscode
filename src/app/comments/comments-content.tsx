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
  ExternalLink,
  ChevronDown,
  Search,
  X
} from 'lucide-react';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { CreateCommentDialog } from './create-comment-dialog';
import { EditCommentDialog } from './edit-comment-dialog';
import { createClientComponentClient } from '@/lib/supabase';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';

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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
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

  // Client-side filtering for search and display
  const filteredComments = comments.filter(comment => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      comment.title.toLowerCase().includes(searchLower) ||
      comment.content.toLowerCase().includes(searchLower) ||
      comment.users.name?.toLowerCase().includes(searchLower) ||
      comment.users.email.toLowerCase().includes(searchLower)
    );
  });

  // Count active filters
  const getActiveFilterCount = () => {
    let count = 0;
    if (viewFilter !== 'all') count++;
    if (categoryFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    if (priorityFilter !== 'all') count++;
    if (sortBy !== 'newest') count++;
    if (searchQuery) count++;
    return count;
  };

  const clearAllFilters = () => {
    setViewFilter('all');
    setCategoryFilter('all');
    setStatusFilter('all');
    setPriorityFilter('all');
    setSortBy('newest');
    setSearchQuery('');
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

  return (
    <>
      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div className="container mx-auto px-4 py-4 space-y-4 max-w-6xl">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-start sm:space-y-0">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">{t('comments.title')}</h1>
              <p className="text-muted-foreground text-sm">{t('comments.subtitle')}</p>
            </div>
            <Button 
              onClick={() => setShowCreateDialog(true)} 
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 h-10 px-6"
              size="default"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('comments.create')}
            </Button>
          </div>
        </div>

        {/* Mobile-first Collapsible Filters */}
        <div className="space-y-3">
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center text-sm">
                      <Filter className="mr-2 h-4 w-4" />
                      {t('common.filter')} & {t('common.sort')}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                        {filteredComments.length}
                      </Badge>
                      {getActiveFilterCount() > 0 && (
                        <Badge variant="default" className="text-xs bg-blue-600 px-1.5 py-0.5">
                          {getActiveFilterCount()}
                        </Badge>
                      )}
                      <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0 pb-3">
                  <div className="space-y-3">
                    {/* Search Bar - Compact */}
                    <div className="space-y-1.5">
                      {/* <label className="text-xs font-medium text-muted-foreground">
                        {t('common.search')}
                      </label> */}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder={t('comments.search.placeholder')}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8 h-8 text-sm"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mobile: Horizontal scrolling filters */}
                    <div className="space-y-2">
                      {/* <label className="text-xs font-medium text-muted-foreground">
                        {t('common.filter')}
                      </label> */}
                      <div 
                        className="flex gap-2 overflow-x-auto p-2 -mx-1 px-1 hide-scrollbar" 
                        style={{
                          scrollbarWidth: 'none', 
                          msOverflowStyle: 'none'
                        }}
                      >
                        {/* User Filter */}
                        <div className="flex-shrink-0 min-w-[120px]">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground font-medium">
                                {t('comments.filters.byUser')}
                              </span>
                            </div>
                            <Select value={viewFilter} onValueChange={setViewFilter}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">{t('comments.filters.all')}</SelectItem>
                                <SelectItem value="myComments">{t('comments.filters.myComments')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Category Filter */}
                        <div className="flex-shrink-0 min-w-[120px]">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground font-medium">
                                {t('comments.filters.byCategory')}
                              </span>
                            </div>
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
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
                          </div>
                        </div>

                        {/* Status Filter */}
                        <div className="flex-shrink-0 min-w-[120px]">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <div className="h-3 w-3 rounded-full bg-blue-500/20 border border-blue-500/40"></div>
                              <span className="text-xs text-muted-foreground font-medium">
                                {t('comments.filters.byStatus')}
                              </span>
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">{t('comments.filters.all')}</SelectItem>
                                <SelectItem value="open">{t('comments.status.open')}</SelectItem>
                                <SelectItem value="in_progress">{t('comments.status.in_progress')}</SelectItem>
                                <SelectItem value="resolved">{t('comments.status.resolved')}</SelectItem>
                                <SelectItem value="closed">{t('comments.status.closed')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Priority Filter */}
                        <div className="flex-shrink-0 min-w-[120px]">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <div className="h-3 w-3 border-2 border-orange-500 rounded-sm"></div>
                              <span className="text-xs text-muted-foreground font-medium">
                                {t('comments.filters.byPriority')}
                              </span>
                            </div>
                            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">{t('comments.filters.all')}</SelectItem>
                                <SelectItem value="low">{t('comments.priorities.low')}</SelectItem>
                                <SelectItem value="medium">{t('comments.priorities.medium')}</SelectItem>
                                <SelectItem value="high">{t('comments.priorities.high')}</SelectItem>
                                <SelectItem value="urgent">{t('comments.priorities.urgent')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Sort Filter */}
                        <div className="flex-shrink-0 min-w-[120px]">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <SortAsc className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground font-medium">
                                {t('comments.filters.bySort')}
                              </span>
                            </div>
                            <Select value={sortBy} onValueChange={setSortBy}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="newest">{t('comments.sort.newest')}</SelectItem>
                                <SelectItem value="oldest">{t('comments.sort.oldest')}</SelectItem>
                                <SelectItem value="priority">{t('comments.sort.priority')}</SelectItem>
                                <SelectItem value="status">{t('comments.sort.status')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Results and Clear Filters */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                        <SortAsc className="mr-1 h-3 w-3" />
                        {filteredComments.length} {t('comments.allComments')}
                      </div>
                      
                      {/* Clear Filters Button */}
                      {getActiveFilterCount() > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearAllFilters}
                          className="h-6 px-2 text-xs"
                        >
                          <X className="mr-1 h-3 w-3" />
                          {t('comments.filters.clearAll')}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* Comments List */}
        {filteredComments.length === 0 ? (
          <Card>
            <CardContent className="py-16">
              <div className="text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">
                    {searchQuery || getActiveFilterCount() > 0 
                      ? t('comments.noResultsFound') 
                      : t('comments.noComments')
                    }
                  </h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    {searchQuery || getActiveFilterCount() > 0 
                      ? t('comments.tryDifferentFilters') 
                      : t('comments.noCommentsDescription')
                    }
                  </p>
                </div>
                {searchQuery || getActiveFilterCount() > 0 ? (
                  <Button 
                    onClick={clearAllFilters} 
                    variant="outline"
                    size="lg"
                  >
                    <X className="mr-2 h-5 w-5" />
                    {t('comments.filters.clearAll')}
                  </Button>
                ) : (
                  <Button 
                    onClick={() => setShowCreateDialog(true)} 
                    className="bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    {t('comments.create')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredComments.map((comment) => (
              <Card key={comment.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-transparent hover:border-l-blue-500">
                <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg mb-2 line-clamp-2 leading-tight">
                        {comment.title}
                      </CardTitle>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge className={`${getCategoryColor(comment.category)} text-xs font-medium`}>
                          {t(`comments.categories.${comment.category}`)}
                        </Badge>
                        <Badge className={`${getPriorityColor(comment.priority)} text-xs font-medium`}>
                          {t(`comments.priorities.${comment.priority}`)}
                        </Badge>
                        <Badge className={`${getStatusColor(comment.status)} text-xs font-medium`}>
                          {t(`comments.status.${comment.status}`)}
                        </Badge>
                      </div>
                    </div>
                    {user && comment.user_id === user.id && (
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingComment(comment)}
                          className="h-7 w-7 p-0 hover:bg-muted"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <p className="text-muted-foreground mb-3 whitespace-pre-wrap line-clamp-3 text-sm leading-relaxed">
                    {comment.content}
                  </p>
                  
                  <div className="space-y-3">
                    {/* Author and Date - Mobile optimized */}
                    <div className="flex flex-col gap-2 text-sm text-muted-foreground flex-row items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-muted rounded-full flex items-center justify-center">
                          <User className="h-2.5 w-2.5" />
                        </div>
                        <span className="font-medium truncate text-xs">
                          {comment.users.name || comment.users.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-2.5 w-2.5" />
                        <span className="text-xs">{formatDate(comment.created_at)}</span>
                      </div>
                    </div>
                    
                    {/* Actions - Mobile optimized */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleLike(comment.id)}
                          className={`flex items-center gap-1.5 hover:text-red-600 transition-colors p-1.5 -m-1.5 rounded-md hover:bg-red-50 ${
                            comment.isLikedByUser ? 'text-red-600' : 'text-muted-foreground'
                          }`}
                        >
                          <Heart className={`h-3.5 w-3.5 ${comment.isLikedByUser ? 'fill-current' : ''}`} />
                          <span className="text-xs font-medium">{comment.likeCount}</span>
                        </button>
                        
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">{comment.responseCount}</span>
                        </div>
                      </div>
                      
                      <Link 
                        href={`/comments/${comment.id}`}
                        className="flex items-center gap-1.5 hover:text-blue-600 transition-colors p-1.5 -m-1.5 rounded-md hover:bg-blue-50 text-xs font-medium"
                        onMouseEnter={() => router.prefetch(`/comments/${comment.id}`)}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t('comments.responses.view')}</span>
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
    </>
  );
}

