// Source: app/javascript/dashboard/components-next/input/
import type { FC, InputHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Input: FC<InputProps> = ({ className, ...rest }) => (
  <input className={cn(className)} {...rest} />
);
