'use client';

import { Search, Bell, ChevronDown } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Avatar from '@radix-ui/react-avatar';
import type { User } from '../types';
import { initials } from '../lib/format';

interface HeaderProps {
  user?: User | null | undefined;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  notificationCount?: number | undefined;
}

export function Header({
  user,
  searchQuery,
  onSearchChange,
  notificationCount = 0,
}: HeaderProps) {
  return (
    <header className="flex h-14 items-center gap-4 border-b border-slate-200 bg-white px-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search conversations..."
          className="w-full max-w-md rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <button className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
        <Bell className="h-5 w-5" />
        {notificationCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {notificationCount > 9 ? '9+' : notificationCount}
          </span>
        )}
      </button>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-slate-100">
            <Avatar.Root className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-blue-600">
              {user?.avatarUrl ? (
                <Avatar.Image
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              ) : null}
              <Avatar.Fallback className="text-xs font-medium text-white">
                {user?.name ? initials(user.name) : 'U'}
              </Avatar.Fallback>
            </Avatar.Root>
            <span className="text-sm font-medium text-slate-700">
              {user?.name ?? 'User'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className="z-50 min-w-[180px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
          >
            <DropdownMenu.Item className="cursor-pointer rounded-md px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-100">
              Profile
            </DropdownMenu.Item>
            <DropdownMenu.Item className="cursor-pointer rounded-md px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-100">
              Preferences
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-slate-200" />
            <DropdownMenu.Item className="cursor-pointer rounded-md px-3 py-2 text-sm text-red-600 outline-none hover:bg-red-50">
              Sign out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </header>
  );
}
