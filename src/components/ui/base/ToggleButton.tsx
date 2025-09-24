import { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import { ToggleButtonProps } from "@/types/app";

const variants = cva(
  "px-3 py-2 rounded-full text-sm font-medium transition-all flex-shrink-0 flex items-center gap-2",
  {
    variants: {
      theme: {
        matrix: "",
        material: "",
      },
      isSelected: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      // Matrix theme variants
      {
        theme: "matrix",
        isSelected: true,
        className: "bg-green-400 text-gray-900 border border-green-400",
      },
      {
        theme: "matrix",
        isSelected: false,
        className: "bg-gray-900/50 text-green-400/70 border border-green-400/30 hover:border-green-400/50 hover:text-green-400",
      },
      // Material theme variants
      {
        theme: "material",
        isSelected: true,
        className: "bg-blue-600 text-white border border-blue-600",
      },
      {
        theme: "material",
        isSelected: false,
        className: "bg-gray-100 text-gray-700 border border-gray-300 hover:border-gray-400 hover:text-gray-900",
      },
    ],
    defaultVariants: {
      theme: "matrix",
      isSelected: false,
    },
  }
);

const badgeVariants = cva("text-xs px-1.5 py-0.5 rounded-full", {
  variants: {
    theme: {
      matrix: "",
      material: "",
    },
    isSelected: {
      true: "",
      false: "",
    },
  },
  compoundVariants: [
    {
      theme: "matrix",
      isSelected: true,
      className: "bg-gray-900/20 text-gray-900",
    },
    {
      theme: "matrix",
      isSelected: false,
      className: "bg-green-400/20 text-green-400",
    },
    {
      theme: "material",
      isSelected: true,
      className: "bg-white/20 text-white",
    },
    {
      theme: "material",
      isSelected: false,
      className: "bg-gray-200 text-gray-600",
    },
  ],
  defaultVariants: {
    theme: "matrix",
    isSelected: false,
  },
});

export function ToggleButton<T extends ElementType = 'button'>({
  as,
  isSelected = false,
  theme = 'matrix',
  className = '',
  children,
  badge,
  title,
  ...rest
}: ToggleButtonProps<T> & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'className'>) {
  const Component = (as || 'button') as ElementType;
  
  return (
    <Component 
      className={cn(
        variants({ theme, isSelected }),
        className
      )} 
      title={title}
      {...rest}
    >
      <span>{children}</span>
      {badge && (
        <div className={cn(badgeVariants({ theme, isSelected }))}>
          {badge}
        </div>
      )}
    </Component>
  );
}
