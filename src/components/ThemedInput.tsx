import { ElementType, forwardRef } from "react";

interface ThemedInputProps<T extends ElementType = 'input'> {
  as?: T;
  theme?: 'matrix' | 'material';
  className?: string;
}

const styles = {
  matrix:
    'bg-black/80 text-[#00ff00] placeholder-[#00ff00]/50 border border-[#00ff00] rounded outline-none',
  material:
    'bg-white text-gray-800 placeholder-gray-400 border border-blue-600 rounded outline-none',
} as const;

export const ThemedInput = forwardRef(<T extends ElementType = 'input'>(
  {
    as,
    theme = 'matrix',
    className = '',
    ...rest
  }: ThemedInputProps<T> & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'className'>,
  ref: React.Ref<any>
) => {
  const Component = (as || 'input') as ElementType;
  return (
    <Component
      ref={ref}
      className={`${styles[theme]} ${className}`}
      {...rest}
    />
  );
});

ThemedInput.displayName = 'ThemedInput';

export default ThemedInput;

