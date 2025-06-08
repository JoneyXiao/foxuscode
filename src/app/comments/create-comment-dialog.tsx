'use client';

import { useState } from 'react';
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
import { createCommentSchema } from '@/lib/validations';
import { toast } from 'sonner';

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

interface CreateCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommentCreated: (comment: Comment) => void;
}

export function CreateCommentDialog({
  open,
  onOpenChange,
  onCommentCreated,
}: CreateCommentDialogProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(createCommentSchema),
    defaultValues: {
      title: '',
      content: '',
      category: 'general' as const,
      priority: 'medium' as const,
    },
  });

  const onSubmit = async (data: {
    title: string;
    content: string;
    category: string;
    priority: string;
  }) => {
    try {
      setIsSubmitting(true);

      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        onCommentCreated(result.comment);
        form.reset();
        onOpenChange(false);
      } else {
        toast.error(result.error || t('errors.generic'));
      }
    } catch (error) {
      console.error('Error creating comment:', error);
      toast.error(t('errors.generic'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('comments.create')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">{t('comments.form.title')}</Label>
            <Input
              id="title"
              placeholder={t('comments.form.titlePlaceholder')}
              {...form.register('title')}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-red-600">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">{t('comments.form.content')}</Label>
            <Textarea
              id="content"
              placeholder={t('comments.form.contentPlaceholder')}
              rows={6}
              {...form.register('content')}
            />
            {form.formState.errors.content && (
              <p className="text-sm text-red-600">
                {form.formState.errors.content.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">{t('comments.form.category')}</Label>
              <Select
                value={form.watch('category')}
                onValueChange={(value) => form.setValue('category', value as 'general' | 'bug' | 'feature' | 'improvement' | 'question')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">
                    {t('comments.categories.general')}
                  </SelectItem>
                  <SelectItem value="bug">
                    {t('comments.categories.bug')}
                  </SelectItem>
                  <SelectItem value="feature">
                    {t('comments.categories.feature')}
                  </SelectItem>
                  <SelectItem value="improvement">
                    {t('comments.categories.improvement')}
                  </SelectItem>
                  <SelectItem value="question">
                    {t('comments.categories.question')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">{t('comments.form.priority')}</Label>
              <Select
                value={form.watch('priority')}
                onValueChange={(value) => form.setValue('priority', value as 'low' | 'medium' | 'high' | 'urgent')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    {t('comments.priorities.low')}
                  </SelectItem>
                  <SelectItem value="medium">
                    {t('comments.priorities.medium')}
                  </SelectItem>
                  <SelectItem value="high">
                    {t('comments.priorities.high')}
                  </SelectItem>
                  <SelectItem value="urgent">
                    {t('comments.priorities.urgent')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('common.submitting') : t('common.submit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
