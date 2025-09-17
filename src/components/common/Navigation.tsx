import React from "react";
import { Link, useLocation } from "react-router-dom";

interface NavigationProps {
  theme?: "matrix" | "material";
}

export const Navigation: React.FC<NavigationProps> = ({ theme = "matrix" }) => {
  const location = useLocation();
  
  const navItems = [
    { path: "/", label: "Map", icon: "🗺️" },
    { path: "/chat", label: "Chat", icon: "💬" },
    { path: "/panel", label: "Panel", icon: "📊" },
    { path: "/radio", label: "Radio", icon: "📻" },
    { path: "/admin", label: "Admin", icon: "⚙️" },
  ];

  const themeClasses = {
    container: theme === "matrix" 
      ? "bg-black/80 border-[#00ff00]" 
      : "bg-white/90 border-gray-200",
    text: theme === "matrix" 
      ? "text-[#00ff00]" 
      : "text-gray-700",
    activeLink: theme === "matrix" 
      ? "bg-[#00ff00]/20 text-[#00ff00] border-[#00ff00]" 
      : "bg-blue-100 text-blue-700 border-blue-300",
    inactiveLink: theme === "matrix" 
      ? "text-[#00ff00]/70 hover:text-[#00ff00] hover:bg-[#00ff00]/10" 
      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
  };

  return (
    <nav className={`fixed top-4 left-4 z-50 border rounded-lg p-2 backdrop-blur-sm ${themeClasses.container}`}>
      <div className="flex flex-col space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3 py-2 rounded text-sm font-medium border transition-all duration-200 flex items-center space-x-2 ${
                isActive 
                  ? `${themeClasses.activeLink} border` 
                  : `${themeClasses.inactiveLink} border-transparent hover:border-current/30`
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
