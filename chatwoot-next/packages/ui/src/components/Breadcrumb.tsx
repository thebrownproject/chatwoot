// Source: app/javascript/dashboard/components-next/breadcrumb/
import type { FC, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface BreadcrumbProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: ReactNode;
}

export const Breadcrumb: FC<BreadcrumbProps> = ({ className, children, ...rest }) => (
  <div className={cn(className)} {...rest}>{children}</div>
);
