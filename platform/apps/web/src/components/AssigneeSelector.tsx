'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { UserCircle, ChevronDown, X } from 'lucide-react';
import type { User } from '@buildpass/shell';
import { initials } from '@buildpass/shell';

interface AssigneeSelectorProps {
  currentAssignee: User | null;
  agents: User[];
  onAssign: (userId: string | null) => void;
}

export function AssigneeSelector({
  currentAssignee,
  agents,
  onAssign,
}: AssigneeSelectorProps) {
  return (
    <div>
      <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
        Assignee
      </h4>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button aria-label="Select assignee" className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50">
            {currentAssignee ? (
              <>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-medium text-blue-700">
                  {initials(currentAssignee.name)}
                </div>
                <span className="flex-1 text-left">{currentAssignee.name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </>
            ) : (
              <>
                <UserCircle className="h-5 w-5 text-slate-400" />
                <span className="flex-1 text-left text-slate-400">Unassigned</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </>
            )}
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={4}
            className="z-50 min-w-[220px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
          >
            {agents.map((agent) => (
              <DropdownMenu.Item
                key={agent.id}
                onSelect={() => onAssign(agent.id)}
                className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-100"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-medium text-blue-700">
                  {initials(agent.name)}
                </div>
                <span>{agent.name}</span>
                {agent.type === 'ai_agent' && (
                  <span className="rounded bg-purple-50 px-1 py-0.5 text-[10px] font-medium text-purple-600">
                    AI
                  </span>
                )}
              </DropdownMenu.Item>
            ))}
            {agents.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-400">No agents available</div>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {currentAssignee && (
        <button
          aria-label="Unassign"
          onClick={() => onAssign(null)}
          className="mt-1 flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-3 w-3" />
          Unassign
        </button>
      )}
    </div>
  );
}
