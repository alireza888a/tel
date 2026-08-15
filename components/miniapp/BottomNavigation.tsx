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

// Each module gets its own consistent color, always visible (a light tint
// when inactive, solid when active) — same pattern used for the admin
// panel's own settings tabs, so a buyer can tell the icons apart at a
// glance instead of a row of identical gray icons that only differ once
// tapped.
const TAB_CONFIG: Record<MiniAppModule, { icon: React.ElementType; label: string; color: string }> = {
  shop: { icon: ShoppingBag, label: 'فروشگاه', color: 'blue' },
  orders: { icon: Package, label: 'سفارش‌ها', color: 'emerald' },
  support: { icon: MessageSquare, label: 'پشتیبانی', color: 'cyan' },
  forms: { icon: FileText, label: 'فرم‌ها', color: 'violet' },
  gallery: { icon: ImageIcon, label: 'گالری', color: 'fuchsia' },
  announcements: { icon: Bell, label: 'اعلانات', color: 'amber' },
  booking: { icon: Calendar, label: 'نوبت‌دهی', color: 'rose' },
};

// Tailwind needs each class written out in full somewhere in the source to
// generate it — a template string like `bg-${color}-600` would not
// compile into real CSS. This map is that literal list, one row per color
// used above.
const COLOR_CLASSES: Record<string, { active: string; inactiveIcon: string; inactiveBg: string }> = {
  blue: { active: 'bg-blue-600 text-white shadow-sm shadow-blue-600/30', inactiveIcon: 'text-blue-500', inactiveBg: 'bg-blue-50' },
  emerald: { active: 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30', inactiveIcon: 'text-emerald-500', inactiveBg: 'bg-emerald-50' },
  cyan: { active: 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30', inactiveIcon: 'text-cyan-500', inactiveBg: 'bg-cyan-50' },
  violet: { active: 'bg-violet-600 text-white shadow-sm shadow-violet-600/30', inactiveIcon: 'text-violet-500', inactiveBg: 'bg-violet-50' },
  fuchsia: { active: 'bg-fuchsia-600 text-white shadow-sm shadow-fuchsia-600/30', inactiveIcon: 'text-fuchsia-500', inactiveBg: 'bg-fuchsia-50' },
  amber: { active: 'bg-amber-600 text-white shadow-sm shadow-amber-600/30', inactiveIcon: 'text-amber-600', inactiveBg: 'bg-amber-50' },
  rose: { active: 'bg-rose-600 text-white shadow-sm shadow-rose-600/30', inactiveIcon: 'text-rose-500', inactiveBg: 'bg-rose-50' },
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
      // FIX: light-theme redesign — was a dark, edge-to-edge bar
      // (bg-[#121826]). Now a floating white pill with its own shadow,
      // matching the Aradbot reference the design is modeled on.
      className="fixed bottom-3 left-3 right-3 z-40 bg-white rounded-3xl shadow-[0_4px_24px_rgba(15,23,42,0.12)] border border-slate-100 px-1.5 py-1.5"
      style={{ marginBottom: `${safeAreaBottom}px` }}
    >
      <div className="max-w-2xl mx-auto flex items-center justify-around">
        {enabledModules.map((mod) => {
          const cfg = TAB_CONFIG[mod];
          if (!cfg) return null;
          const Icon = cfg.icon;
          const isActive = activeTab === mod;
          const colors = COLOR_CLASSES[cfg.color];
          return (
            <button
              key={mod}
              onClick={() => setActiveTab(mod)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-2xl transition-all ${
                isActive ? colors.active : `${colors.inactiveBg} ${colors.inactiveIcon}`
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
