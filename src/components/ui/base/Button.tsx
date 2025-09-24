import { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import { ButtonProps } from "@/types/app";

const variants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      theme: {
        matrix: "border font-mono font-bold uppercase transition-colors",
        material: "border font-sans font-bold uppercase transition-colors",
      },
      active: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      // Matrix theme variants
      {
        theme: "matrix",
        active: true,
        className: "bg-green-400 text-gray-900 shadow-[0_0_10px_rgba(74,222,128,0.5)] border-green-400",
      },
      {
        theme: "matrix",
        active: false,
        className: "bg-gray-900/70 text-green-400 border-green-400 hover:bg-green-400/10 hover:shadow-[0_0_5px_rgba(74,222,128,0.3)]",
      },
      // Material theme variants
      {
        theme: "material",
        active: true,
        className: "bg-blue-600 text-white border-blue-600",
      },
      {
        theme: "material",
        active: false,
        className: "bg-white text-blue-600 border-blue-600 hover:bg-blue-50",
      },
    ],
    defaultVariants: {
      theme: "matrix",
      active: false,
    },
  }
);

export function Button<T extends ElementType = 'button'>({
  as,
  active = false,
  theme = 'matrix',
  className = '',
  children,
  ...rest
}: ButtonProps<T> & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'className'>) {
  const Component = (as || 'button') as ElementType;
  
  return (
    <Component 
      className={cn(
        variants({ theme, active }),
        className
      )} 
      {...rest}
    >
      {children}
    </Component>
  );
}
