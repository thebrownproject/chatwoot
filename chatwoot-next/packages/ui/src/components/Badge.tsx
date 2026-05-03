// Source: app/javascript/dashboard/components-next/badge/
import type { FC, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: ReactNode;
}

export const Badge: FC<BadgeProps> = ({ className, children, ...rest }) => (
  <div className={cn(className)} {...rest}>{children}</div>
);
