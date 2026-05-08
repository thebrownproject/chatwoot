// Source: app/javascript/dashboard/components-next/button/
import type { ButtonHTMLAttributes, FC, ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children?: ReactNode;
}

export const Button: FC<ButtonProps> = ({ className, children, ...rest }) => (
  <button className={cn(className)} {...rest}>{children}</button>
);
