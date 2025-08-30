import { ElementType, ReactNode } from "react";

type ThemedButtonProps<T extends ElementType = 'button'> = {
  as?: T;
  active?: boolean;
  theme?: 'matrix' | 'material';
  className?: string;
  children: ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'className'>;

const styles = {
  matrix: {
    base: 'border font-mono font-bold uppercase transition-colors',
    active:
      'bg-[#00ff00] text-black shadow-[0_0_10px_rgba(0,255,0,0.5)] border-[#00ff00]',
    inactive:
      'bg-black/70 text-[#00ff00] border-[#00ff00] hover:bg-[#00ff00]/10 hover:shadow-[0_0_5px_rgba(0,255,0,0.3)]',
  },
  material: {
    base: 'border font-sans font-bold uppercase transition-colors',
    active: 'bg-blue-600 text-white border-blue-600',
    inactive: 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50',
  },
} as const;

export function ThemedButton<T extends ElementType = 'button'>({
  as,
  active = false,
  theme = 'matrix',
  className = '',
  children,
  ...rest
}: ThemedButtonProps<T>) {
  const Component = (as || 'button') as ElementType;
  const t = styles[theme];
  return (
    <Component className={`${t.base} ${active ? t.active : t.inactive} ${className}`} {...rest}>
      {children}
    </Component>
  );
}

