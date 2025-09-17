import React from "react";

interface PanelPageProps {
  // We'll extract the panel-related props from the main App component when we refactor
  children: React.ReactNode;
}

export const PanelPage: React.FC<PanelPageProps> = ({ children }) => {
  return (
    <div className="absolute inset-0 w-full h-full bg-black overflow-hidden">
      {children}
    </div>
  );
};
