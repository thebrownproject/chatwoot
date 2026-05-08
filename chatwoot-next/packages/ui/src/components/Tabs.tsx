// Source: app/javascript/dashboard/components-next/tabs/
import type { FC, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: ReactNode;
}

export const Tabs: FC<TabsProps> = ({ className, children, ...rest }) => (
  <div className={cn(className)} {...rest}>{children}</div>
);
