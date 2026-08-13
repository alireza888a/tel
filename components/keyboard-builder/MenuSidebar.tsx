import React from'react';
import { List, ArrowRight } from'lucide-react';
import { MenuPage } from'../../types';

interface MenuSidebarProps {
  showMenuSidebar: boolean;
  setShowMenuSidebar: (show: boolean) => void;
  menus: Record<string, MenuPage>;
  currentMenuId: string;
  setCurrentMenuId: (id: string) => void;
  setHistory: (history: string[]) => void;
}

export const MenuSidebar: React.FC<MenuSidebarProps> = ({
  showMenuSidebar,
  setShowMenuSidebar,
  menus,
  currentMenuId,
  setCurrentMenuId,
  setHistory,
}) => {
  if (!showMenuSidebar) return null;

  return (
    <div className="absolute inset-y-0 right-0 w-64 bg-slate-900/95 backdrop-blur-xl border-l border-slate-200 z-50 p-4 shadow-2xl animate-fade-in overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <List size={18} /> لیست منوها
        </h3>
        <button onClick={() => setShowMenuSidebar(false)}>
          <ArrowRight className="text-slate-500 hover:text-slate-900"size={20} />
        </button>
      </div>
      <div className="space-y-2">
        {Object.entries(menus || {}).map(([menuKey, m]: [string, MenuPage]) => m && (
          <button
            key={menuKey}
            onClick={() => {
              setCurrentMenuId(menuKey);
              setShowMenuSidebar(false);
              setHistory([]);
            }}
            className={`w-full text-right p-3 rounded-xl text-sm transition-colors border ${
              currentMenuId === menuKey
                ?'bg-blue-600/20 border-blue-500/50 text-slate-800'
                :'bg-slate-100 border-transparent hover:bg-slate-200 text-slate-600'
            }`}
          >
            {m.title || menuKey}
            {menuKey ==='root'&& <span className="mr-2 text-xs bg-blue-500 text-slate-800 px-1.5 py-0.5 rounded">خانه</span>}
          </button>
        ))}
      </div>
    </div>
  );
};
