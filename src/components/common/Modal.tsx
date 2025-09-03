import React, { useEffect, useRef } from "react";
import { globalStyles } from "../../styles";
import { X } from "lucide-react";

export type ModalTab<T = string> = {
  id: T;
  label: string;
  icon?: string;
  content: React.ReactNode;
};

export type ModalFlow = {
  id: string;
  title: string;
  content: React.ReactNode;
  actions?: React.ReactNode;
};

export type ModalProps<T = string> = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  theme: "matrix" | "material";
  children?: React.ReactNode;
  tabs?: ModalTab<T>[];
  activeTab?: T;
  onTabChange?: (tabId: T) => void;
  flows?: ModalFlow[];
  activeFlow?: string;
  onFlowChange?: (flowId: string) => void;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const styles = globalStyles["Modal"];

const sizeClasses = {
  sm: "max-w-sm w-full max-h-[60vh]",
  md: "max-w-md w-full max-h-[70vh]",
  lg: "max-w-2xl w-full max-h-[80vh]",
  xl: "max-w-4xl w-full max-h-[90vh]",
} as const;

export function Modal<T = string>({
  isOpen,
  onClose,
  title,
  theme,
  children,
  tabs,
  activeTab,
  onTabChange,
  flows,
  activeFlow,
  size = "lg",
  className,
}: ModalProps<T>) {
  const modalRef = useRef<HTMLDivElement>(null);
  const t = styles[theme];

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  // Handle click outside
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const renderContent = () => {
    if (flows && activeFlow) {
      const flow = flows.find(f => f.id === activeFlow);
      if (!flow) return null;

      return (
        <div className={t.flowContainer}>
          <h3 className={t.flowTitle}>{flow.title}</h3>
          {flow.content}
          {flow.actions && (
            <div className={t.flowActions}>
              {flow.actions}
            </div>
          )}
        </div>
      );
    }

    if (tabs && activeTab) {
      const tab = tabs.find(t => t.id === activeTab);
      if (!tab) return null;

      return tab.content;
    }

    return children;
  };

  return (
    <div className={t.overlay} onClick={handleOverlayClick}>
      <div 
        ref={modalRef}
        className={`${t.container} ${sizeClasses[size]} ${className || ""}`}
      >
        <div className={t.header}>
          <div className="flex items-center justify-between">
            <h2 className={t.title}>{title}</h2>
            <button
              onClick={onClose}
              className={t.closeButton}
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Tabs */}
          {tabs && onTabChange && (
            <div className={t.tabContainer}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`${t.tabButton} ${
                    activeTab === tab.id ? t.tabButtonActive : t.tabButtonInactive
                  }`}
                  type="button"
                >
                  {tab.icon && <span className="mr-2">{tab.icon}</span>}
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className={t.body}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
