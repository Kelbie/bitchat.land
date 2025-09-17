import React from "react";

interface ChatPageProps {
  // We'll extract the chat-related props from the main App component when we refactor
  children: React.ReactNode;
}

export const ChatPage: React.FC<ChatPageProps> = ({ children }) => {
  return (
    <div className="w-full h-full">
      {children}
    </div>
  );
};
