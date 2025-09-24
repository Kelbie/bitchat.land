import React from "react";
import { globalStyles } from "@/styles";

type SectionHeaderProps = {
  title: string;
  theme: "matrix" | "material";
};

const styles = globalStyles["SectionHeader"];

export const SectionHeader = React.memo(({ title, theme }: SectionHeaderProps) => {
  const t = styles[theme];
  return <div className={t}>{title}</div>;
});

SectionHeader.displayName = 'SectionHeader';
