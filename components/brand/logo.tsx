import Image from 'next/image';
import { cn } from '@/lib/utils';

const MARK_SRC = '/brand/alvessa-mark.svg';

export type LogoProps = {
  /** `full` = mark + “Alvessa” text; `mark` = icon only */
  variant?: 'full' | 'mark';
  /** Text tone when variant is full; mark always uses brand royal */
  tone?: 'brand' | 'on-light' | 'on-dark';
  /** Mark edge length in CSS pixels (square, no stretch) */
  markSize?: number;
  className?: string;
  priority?: boolean;
  /** Accessible name for mark-only; ignored when full (link/parent provides name) */
  label?: string;
};

/**
 * Central Alvessa brand mark. Geometry source: /brand/alvessa-mark.svg (frozen).
 * No custom wordmark — site name is real text in the project font.
 */
export default function Logo({
  variant = 'full',
  tone = 'brand',
  markSize = 32,
  className,
  priority = false,
  label = 'Alvessa',
}: LogoProps) {
  const textClass = tone === 'on-dark' ? 'text-white' : 'text-foreground';

  const mark = (
    <Image
      src={MARK_SRC}
      alt={variant === 'mark' ? label : ''}
      width={markSize}
      height={markSize}
      priority={priority}
      className="block shrink-0"
      style={{ width: markSize, height: markSize }}
      unoptimized
      aria-hidden={variant === 'full' ? true : undefined}
    />
  );

  if (variant === 'mark') {
    return <span className={cn('inline-flex items-center', className)}>{mark}</span>;
  }

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {mark}
      <span
        className={cn(
          'text-base font-semibold tracking-tight sm:text-lg',
          textClass,
        )}
      >
        Alvessa
      </span>
    </span>
  );
}
