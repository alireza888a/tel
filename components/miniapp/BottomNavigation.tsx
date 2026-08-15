import React from 'react';
import { ShoppingBag, Package, MessageSquare, FileText, Image as ImageIcon, Bell, Calendar } from 'lucide-react';
import { MiniAppModule } from '../../types';

export interface BottomNavigationProps {
  enabledModules: MiniAppModule[];
  activeTab: MiniAppModule;
  setActiveTab: (tab: MiniAppModule) => void;
  /** Extra bottom padding (px) to clear the device's safe area (home indicator) in full-screen mode. */
  safeAreaBottom?: number;
}

const TAB_CONFIG: Record<MiniAppModule, { icon: React.ElementType; label: string }> = {
  shop: { icon: ShoppingBag, label: 'فروشگاه' },
  orders: { icon: Package, label: 'سفارش‌ها' },
  support: { icon: MessageSquare, label: 'پشتیبانی' },
  forms: { icon: FileText, label: 'فرم‌ها' },
  gallery: { icon: ImageIcon, label: 'گالری' },
  announcements: { icon: Bell, label: 'اعلانات' },
  booking: { icon: Calendar, label: 'نوبت‌دهی' },
};

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  enabledModules,
  activeTab,
  setActiveTab,
  safeAreaBottom = 0
}) => {
  if (!enabledModules || enabledModules.length === 0) return null;

  return (
    <nav
      // FIX: back to a single uniform color (the multi-color-per-tab
      // version was tried and explicitly not wanted) — kept a slightly
      // stronger border (black/15 vs the previous barely-visible
      // slate-100) and a deeper shadow so the floating bar still reads
      // clearly against the page instead of nearly blending into it.
      className="fixed bottom-3 left-3 right-3 z-40 bg-white rounded-3xl shadow-[0_6px_28px_rgba(15,23,42,0.18)] border border-black/15 px-1.5 py-1.5"
      style={{ marginBottom: `${safeAreaBottom}px` }}
    >
      <div className="max-w-2xl mx-auto flex items-center justify-around">
        {enabledModules.map((mod) => {
          const cfg = TAB_CONFIG[mod];
          if (!cfg) return null;
          const Icon = cfg.icon;
          const isActive = activeTab === mod;
          return (
            <button
              key={mod}
              onClick={() => setActiveTab(mod)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-2xl transition-all ${
                isActive ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30' : 'text-slate-400'
              }`}
            >
              <Icon size={18} className={isActive ? 'scale-105' : ''} />
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{cfg.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
