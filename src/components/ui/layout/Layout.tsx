import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FlexProps {
  direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
  gap?: '0' | '1' | '2' | '3' | '4' | '6' | '8' | '12' | '16' | '20' | '24';
  wrap?: 'wrap' | 'nowrap' | 'wrap-reverse';
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
  align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch';
  children: ReactNode;
  className?: string;
}

export function Flex({ 
  direction = 'row', 
  gap = '2', 
  wrap = 'nowrap',
  justify = 'start',
  align = 'start',
  children, 
  className 
}: FlexProps) {
  const directionClass = direction === 'row' ? 'flex-row' : 
                        direction === 'col' ? 'flex-col' :
                        direction === 'row-reverse' ? 'flex-row-reverse' : 'flex-col-reverse';
  
  const gapClass = `gap-${gap}`;
  const wrapClass = wrap === 'wrap' ? 'flex-wrap' : 
                   wrap === 'nowrap' ? 'flex-nowrap' : 'flex-wrap-reverse';
  const justifyClass = justify === 'start' ? 'justify-start' :
                      justify === 'end' ? 'justify-end' :
                      justify === 'center' ? 'justify-center' :
                      justify === 'between' ? 'justify-between' :
                      justify === 'around' ? 'justify-around' : 'justify-evenly';
  const alignClass = align === 'start' ? 'items-start' :
                    align === 'end' ? 'items-end' :
                    align === 'center' ? 'items-center' :
                    align === 'baseline' ? 'items-baseline' : 'items-stretch';

  return (
    <div className={cn(
      'flex',
      directionClass,
      gapClass,
      wrapClass,
      justifyClass,
      alignClass,
      className
    )}>
      {children}
    </div>
  );
}

interface StackProps {
  gap?: '0' | '1' | '2' | '3' | '4' | '6' | '8' | '12' | '16' | '20' | '24';
  children: ReactNode;
  className?: string;
}

export function Stack({ gap = '2', children, className }: StackProps) {
  return (
    <Flex direction="col" gap={gap} className={className}>
      {children}
    </Flex>
  );
}

interface HStackProps {
  gap?: '0' | '1' | '2' | '3' | '4' | '6' | '8' | '12' | '16' | '20' | '24';
  wrap?: 'wrap' | 'nowrap' | 'wrap-reverse';
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
  align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch';
  children: ReactNode;
  className?: string;
}

export function HStack({ 
  gap = '2', 
  wrap = 'nowrap',
  justify = 'start',
  align = 'start',
  children, 
  className 
}: HStackProps) {
  return (
    <Flex 
      direction="row" 
      gap={gap} 
      wrap={wrap}
      justify={justify}
      align={align}
      className={className}
    >
      {children}
    </Flex>
  );
}

interface VStackProps {
  gap?: '0' | '1' | '2' | '3' | '4' | '6' | '8' | '12' | '16' | '20' | '24';
  children: ReactNode;
  className?: string;
}

export function VStack({ gap = '2', children, className }: VStackProps) {
  return (
    <Flex direction="col" gap={gap} className={className}>
      {children}
    </Flex>
  );
}

interface CenterProps {
  children: ReactNode;
  className?: string;
}

export function Center({ children, className }: CenterProps) {
  return (
    <Flex justify="center" align="center" className={className}>
      {children}
    </Flex>
  );
}

interface SpacerProps {
  className?: string;
}

export function Spacer({ className }: SpacerProps) {
  return <div className={cn('flex-1', className)} />;
}
