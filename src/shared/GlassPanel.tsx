import type { HTMLAttributes } from 'react';

type GlassPanelProps = HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'section' | 'aside' | 'header' | 'footer' | 'nav';
  variant?: 'panel' | 'editor' | 'popover' | 'modal';
};

export function GlassPanel({
  as: Element = 'div',
  variant = 'panel',
  className = '',
  ...props
}: GlassPanelProps) {
  return <Element className={`glass glass--${variant} ${className}`} {...props} />;
}
