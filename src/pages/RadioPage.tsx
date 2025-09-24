import React from "react";

interface RadioPageProps {
  // We'll extract the radio-related props from the main App component when we refactor
  children: React.ReactNode;
}

export const RadioPage: React.FC<RadioPageProps> = ({ children }) => {
  return (
    <div className="w-full h-full">
      {children}
    </div>
  );
};