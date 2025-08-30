import React from "react";

type SectionHeaderProps = {
  title: string;
  theme: "matrix" | "material";
};

const styles = {
  matrix: "bg-black/95 text-[#00aa00] px-3 py-2 border-b border-[#003300] text-xs uppercase tracking-wider font-mono",
  material: "bg-gray-50 text-gray-600 px-3 py-2 border-b border-gray-200 text-xs uppercase tracking-wider font-medium",
} as const;

export const SectionHeader = React.memo(({ title, theme }: SectionHeaderProps) => {
  const t = styles[theme];
  return <div className={t}>{title}</div>;
});

SectionHeader.displayName = 'SectionHeader';
