// Source: app/javascript/dashboard/components-next/banner/
import type { FC, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface BannerProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: ReactNode;
}

export const Banner: FC<BannerProps> = ({ className, children, ...rest }) => (
  <div className={cn(className)} {...rest}>{children}</div>
);
