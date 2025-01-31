import React from 'react';
import { X } from 'lucide-react';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  icon?: string;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ items, position, onClose }) => {
  return (
    <>
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div
        className="fixed z-50 bg-gray-800 rounded-lg shadow-lg py-1 min-w-[200px]"
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        {items.map((item, index) => (
          <button
            key={index}
            className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center gap-2"
            onClick={() => {
              item.onClick();
              onClose();
            }}
          >
            {item.icon && <span className="text-lg">{item.icon}</span>}
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
};

interface InfoModalProps {
  title: string;
  content: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ title, content, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X size={20} />
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
        <div className="text-gray-300 space-y-2">
          {content}
        </div>
      </div>
    </div>
  );
};