'use client';

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Plus, User, LogOut, MessageSquare } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { createClientComponentClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { FoxIcon } from '@/components/iconify-icons';

interface NavbarProps {
  user?: {
    email?: string;
    user_metadata?: {
      name?: string;
    };
  };
  showCreateButton?: boolean;
}

export function Navbar({ user, showCreateButton = false }: NavbarProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success(t('success.logoutSuccess') || 'Logged out successfully');
      router.push('/');
    } catch {
      toast.error(t('errors.generic') || 'An error occurred');
    }
  };

  return (
    <header className="bg-white border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <FoxIcon size={24} />
            <h1 className="text-xl font-bold text-slate-900">
              {t('app.name')}
            </h1>
          </Link>
          
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            
            {showCreateButton && (
              <Link href="/forms/create">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('forms.create')}
                </Button>
              </Link>
            )}
            
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {user.user_metadata?.name || user.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center">
                      <FoxIcon className="mr-2" size={16} />
                      {t('navigation.dashboard')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/forms/create" className="flex items-center">
                      <Plus className="mr-2 h-4 w-4" />
                      {t('navigation.createForm')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/comments" className="flex items-center">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      {t('navigation.comments')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="flex items-center text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    {t('auth.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
