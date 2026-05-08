'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Tag, Plus, X } from 'lucide-react';
import type { Label } from '@buildpass/shell';

interface LabelPickerProps {
  currentLabels: Label[];
  availableLabels: Label[];
  onAdd: (labelId: string) => void;
  onRemove: (labelId: string) => void;
}

export function LabelPicker({
  currentLabels,
  availableLabels,
  onAdd,
  onRemove,
}: LabelPickerProps) {
  const currentIds = new Set(currentLabels.map((l) => l.id));
  const unselected = availableLabels.filter((l) => !currentIds.has(l.id));

  return (
    <div>
      <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
        Labels
      </h4>

      <div className="flex flex-wrap gap-1">
        {currentLabels.map((label) => (
          <span
            key={label.id}
            className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600"
          >
            {label.color && (
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: label.color }}
              />
            )}
            {label.name}
            <button
              onClick={() => onRemove(label.id)}
              className="rounded-full p-0.5 hover:bg-slate-100"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-400 transition-colors hover:border-slate-400 hover:text-slate-600">
              <Plus className="h-3 w-3" />
              Add
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="start"
              sideOffset={4}
              className="z-50 min-w-[180px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
            >
              {unselected.map((label) => (
                <DropdownMenu.Item
                  key={label.id}
                  onSelect={() => onAdd(label.id)}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-100"
                >
                  <Tag className="h-3.5 w-3.5 text-slate-400" />
                  {label.color && (
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                  )}
                  <span>{label.name}</span>
                </DropdownMenu.Item>
              ))}
              {unselected.length === 0 && (
                <div className="px-3 py-2 text-sm text-slate-400">All labels applied</div>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  );
}
