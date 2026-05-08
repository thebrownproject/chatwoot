// Source: app/javascript/dashboard/components-next/dialog/
import type { FC, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface DialogProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: ReactNode;
}

export const Dialog: FC<DialogProps> = ({ className, children, ...rest }) => (
  <div className={cn(className)} {...rest}>{children}</div>
);
