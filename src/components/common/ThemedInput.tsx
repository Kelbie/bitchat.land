import { ElementType, forwardRef } from "react";
import { globalStyles } from "../../styles";

interface ThemedInputProps<T extends ElementType = 'input'> {
  as?: T;
  theme?: 'matrix' | 'material';
  className?: string;
}

const styles =  globalStyles["ThemedInput"];

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

