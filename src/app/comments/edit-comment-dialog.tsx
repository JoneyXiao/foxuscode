'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateCommentSchema } from '@/lib/validations';
import { toast } from 'sonner';
import { 
  Edit2, 
  Tag, 
  MessageSquare, 
  AlertCircle, 
  Save,
  Loader2
} from 'lucide-react';

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
}

interface EditCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comment: Comment;
  onCommentUpdated: (comment: Comment) => void;
}

export function EditCommentDialog({
  open,
  onOpenChange,
  comment,
  onCommentUpdated,
}: EditCommentDialogProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(updateCommentSchema),
    defaultValues: {
      title: comment.title,
      content: comment.content,
      category: comment.category as 'general' | 'bug' | 'feature' | 'improvement' | 'question',
      priority: comment.priority as 'low' | 'medium' | 'high' | 'urgent',
    },
  });

  useEffect(() => {
    if (comment) {
      form.reset({
        title: comment.title,
        content: comment.content,
        category: comment.category as 'general' | 'bug' | 'feature' | 'improvement' | 'question',
        priority: comment.priority as 'low' | 'medium' | 'high' | 'urgent',
      });
    }
  }, [comment, form]);

  const onSubmit = async (data: Record<string, unknown>) => {
    try {
      setIsSubmitting(true);

      const response = await fetch(`/api/comments/${comment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        onCommentUpdated(result.comment);
        onOpenChange(false);
      } else {
        toast.error(result.error || t('errors.generic'));
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error(t('errors.generic'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <Edit2 className="h-4 w-4 text-orange-600" />
            </div>
            {t('comments.edit')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 max-h-[calc(90vh-120px)] overflow-y-auto">
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Title Field */}
            <div className="space-y-3">
              <Label htmlFor="title" className="text-sm font-medium flex items-center gap-2">
                <Tag className="h-4 w-4" />
                {t('comments.form.title')}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder={t('comments.form.titlePlaceholder')}
                className="h-12 text-sm"
                {...form.register('title')}
              />
              {form.formState.errors.title && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {form.formState.errors.title.message}
                </div>
              )}
            </div>

            {/* Content Field */}
            <div className="space-y-3">
              <Label htmlFor="content" className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {t('comments.form.content')}
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="content"
                placeholder={t('comments.form.contentPlaceholder')}
                rows={6}
                className="text-sm resize-none"
                {...form.register('content')}
              />
              {form.formState.errors.content && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {form.formState.errors.content.message}
                </div>
              )}
            </div>

            {/* Category and Priority - Responsive Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Category Field */}
              <div className="space-y-3">
                <Label htmlFor="category" className="text-sm font-medium">
                  {t('comments.form.category')}
                </Label>
                <Select
                  value={form.watch('category')}
                  onValueChange={(value) => form.setValue('category', value as 'general' | 'bug' | 'feature' | 'improvement' | 'question')}
                >
                  <SelectTrigger className="h-12 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general" className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                        {t('comments.categories.general')}
                      </div>
                    </SelectItem>
                    <SelectItem value="bug" className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                        {t('comments.categories.bug')}
                      </div>
                    </SelectItem>
                    <SelectItem value="feature" className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                        {t('comments.categories.feature')}
                      </div>
                    </SelectItem>
                    <SelectItem value="improvement" className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                        {t('comments.categories.improvement')}
                      </div>
                    </SelectItem>
                    <SelectItem value="question" className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        {t('comments.categories.question')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Field */}
              <div className="space-y-3">
                <Label htmlFor="priority" className="text-sm font-medium">
                  {t('comments.form.priority')}
                </Label>
                <Select
                  value={form.watch('priority')}
                  onValueChange={(value) => form.setValue('priority', value as 'low' | 'medium' | 'high' | 'urgent')}
                >
                  <SelectTrigger className="h-12 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low" className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        {t('comments.priorities.low')}
                      </div>
                    </SelectItem>
                    <SelectItem value="medium" className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        {t('comments.priorities.medium')}
                      </div>
                    </SelectItem>
                    <SelectItem value="high" className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                        {t('comments.priorities.high')}
                      </div>
                    </SelectItem>
                    <SelectItem value="urgent" className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                        {t('comments.priorities.urgent')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex flex-col-reverse gap-3 p-6 border-t bg-muted/20 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="h-12 px-8 text-sm sm:h-10"
          >
            {t('common.cancel')}
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            onClick={form.handleSubmit(onSubmit)}
            className="h-12 px-8 text-sm bg-orange-600 hover:bg-orange-700 sm:h-10"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.submitting')}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {t('comments.update')}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
