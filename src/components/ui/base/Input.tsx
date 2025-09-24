import { ElementType, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import { InputProps } from "@/types/app";

const variants = cva(
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      theme: {
        matrix: "border-green-400 bg-gray-900/50 text-green-400 placeholder:text-green-400/50 focus-visible:ring-green-400",
        material: "border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 focus-visible:ring-blue-500",
      },
    },
    defaultVariants: {
      theme: "matrix",
    },
  }
);

export const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps<"input" | "textarea"> & Omit<React.ComponentPropsWithoutRef<"input" | "textarea">, "as" | "className">>(
  ({ as, theme = 'matrix', className = '', ...rest }, ref) => {
    const Component = (as || 'input') as ElementType;
    
    return (
      <Component
        ref={ref}
        className={cn(
          variants({ theme }),
          className
        )}
        {...rest}
      />
    );
  }
);

Input.displayName = 'Input';
