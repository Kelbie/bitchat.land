import { ElementType, ReactNode } from "react";
import { globalStyles } from "../../styles";

type ThemedButtonProps<T extends ElementType = 'button'> = {
  as?: T;
  active?: boolean;
  theme?: 'matrix' | 'material';
  className?: string;
  children: ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'className'>;

const styles = globalStyles["ThemedButton"];

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

