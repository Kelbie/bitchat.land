import React from "react";

interface MapPageProps {
  // We'll extract the map-related props from the main App component when we refactor
  children: React.ReactNode;
}

export const MapPage: React.FC<MapPageProps> = ({ children }) => {
  return (
    <div className="w-full h-full">
      {children}
    </div>
  );
};
