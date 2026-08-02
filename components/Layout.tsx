
import React, { useState } from 'react';
import { Menu, Home, Settings, Layers, Users, Command, Bell, Search, Moon, Sun, Megaphone, LogOut, Download, AlertTriangle, X, Cloud, UserCog, ShoppingBag, ShoppingCart, MessageCircle, HelpCircle, Zap, Calendar, Tag } from 'lucide-react';
import { LOGO_ICON_DATA_URI } from '../assets/logoIcon';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  toggleTheme: () => void;
  isDarkMode: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate, toggleTheme, isDarkMode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showExitModal, setShowExitModal] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'داشبورد', icon: <Home size={20} />, color: 'dark:text-blue-400 text-blue-600' },
    { id: 'broadcast', label: 'پیام همگانی', icon: <Megaphone size={20} />, color: 'dark:text-purple-400 text-purple-600' },
    { id: 'channels', label: 'مدیریت کانال‌ها', icon: <Users size={20} />, color: 'dark:text-pink-400 text-pink-600' },
    { id: 'keyboard', label: 'دکمه‌ساز', icon: <Layers size={20} />, color: 'dark:text-indigo-400 text-indigo-600' },
    { id: 'commands', label: 'دستورات', icon: <Command size={20} />, color: 'dark:text-cyan-400 text-cyan-600' },
    { id: 'users', label: 'کاربران ربات', icon: <UserCog size={20} />, color: 'dark:text-emerald-400 text-emerald-600' },
    { id: 'products', label: 'محصولات', icon: <ShoppingBag size={20} />, color: 'dark:text-amber-400 text-amber-600' },
    { id: 'orders', label: 'سفارش‌ها', icon: <ShoppingCart size={20} />, color: 'dark:text-orange-400 text-orange-600' },
    { id: 'coupons', label: 'کدهای تخفیف', icon: <Tag size={20} />, color: 'dark:text-rose-400 text-rose-600' },
    { id: 'booking', label: 'نوبت‌دهی', icon: <Calendar size={20} />, color: 'dark:text-teal-400 text-teal-600' },
    { id: 'customer-tickets', label: 'تیکت‌های پشتیبانی', icon: <HelpCircle size={20} />, color: 'dark:text-sky-400 text-sky-600' },
    { id: 'automations', label: 'قوانین خودکار', icon: <Zap size={20} />, color: 'dark:text-yellow-400 text-yellow-600' },
    { id: 'support', label: 'پشتیبانی', icon: <MessageCircle size={20} />, color: 'dark:text-green-400 text-green-600' },
    { id: 'settings', label: 'تنظیمات', icon: <Settings size={20} />, color: 'dark:text-slate-400 text-slate-500' },
  ];

  // Helper function to trigger quick backup
  const performQuickBackup = () => {
        const backupData = {
            meta: { version: "2.5.1", type: "quick_exit_backup", date: new Date().toISOString() },
            data: {
                menus: JSON.parse(localStorage.getItem('kb_menus') || '{}'),
                forms: JSON.parse(localStorage.getItem('kb_forms') || '{}'),
                commands: JSON.parse(localStorage.getItem('bot_commands') || '[]'),
                channels: JSON.parse(localStorage.getItem('saved_channels') || '[]'),
                config: {
                    token: localStorage.getItem('bot_token'),
                    db_channel: localStorage.getItem('bot_db_channel')
                }
            }
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `QuickBackup_${Date.now()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
  };

  const handleConfirmExit = (withBackup: boolean) => {
      // Actually log out — the previous version only navigated to a
      // different page inside the panel while staying fully logged in, so
      // "خروج از پنل" never exited anything. Clearing the same key
      // LicenseGate itself uses, then a full reload, makes LicenseGate
      // re-mount with no cached license and show the login form again —
      // the same reliable reset every other logout flow in the app uses.
      const doLogout = () => {
          localStorage.removeItem('license_cache');
          window.location.reload();
      };

      if (withBackup) {
          performQuickBackup();
          setTimeout(doLogout, 1000);
      } else {
          doLogout();
      }
  };

  return (
    <div className="flex min-h-screen dark:text-white/90 text-slate-800 overflow-hidden">
      
      {/* EXIT MODAL */}
      {showExitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
              <div className="bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                  <div className="p-6 text-center">
                      <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-500">
                          <AlertTriangle size={32}/>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">آیا می‌خواهید خارج شوید؟</h3>
                      <p className="text-slate-400 text-sm mb-6">برای جلوگیری از حذف احتمالی اطلاعات در مرورگر، پیشنهاد می‌کنیم قبل از خروج یک نسخه پشتیبان بگیرید.</p>
                      
                      <div className="flex flex-col gap-3">
                          <button 
                              onClick={() => handleConfirmExit(true)}
                              className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-600/20"
                          >
                              <Download size={18}/>
                              بله، دانلود بکاپ و خروج
                          </button>
                          <button 
                              onClick={() => handleConfirmExit(false)}
                              className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-xl font-medium transition-colors"
                          >
                              خیر، فقط خارج شو
                          </button>
                      </div>
                  </div>
                  <div className="bg-black/20 p-3 flex justify-center border-t border-white/5">
                      <button onClick={() => setShowExitModal(false)} className="text-xs text-slate-500 hover:text-white transition-colors">
                          انصراف و بازگشت به پنل
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Sidebar - RTL: Right Side */}
      <aside 
        className={`${isSidebarOpen ? 'w-64' : 'w-20'} 
        dark:bg-white/5 bg-white/60 backdrop-blur-xl border-l dark:border-white/10 border-white/40 transition-all duration-300 relative flex flex-col z-20 shadow-lg`}
      >
        <div className="p-6 flex items-center gap-3.5">
           <div className="w-11 h-11 rounded-xl bg-white shadow-lg flex items-center justify-center shrink-0 p-1.5 border dark:border-white/10 border-slate-200">
             <img src={LOGO_ICON_DATA_URI} alt="AsanHub" className="w-full h-full object-contain" />
           </div>
           {isSidebarOpen && (
             <h1 className="font-bold text-2xl whitespace-nowrap tracking-wider dark:text-white text-slate-800">
               Asan<span className="text-purple-600 dark:text-purple-400">Hub</span>
             </h1>
           )}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden
                ${currentPage === item.id 
                  ? 'bg-gradient-to-l from-blue-600/80 to-purple-600/80 shadow-[0_0_20px_rgba(59,130,246,0.5)] text-white' 
                  : 'hover:bg-black/5 dark:hover:bg-white/5 dark:text-white/60 text-slate-600 hover:text-slate-900 dark:hover:text-white'
                }
              `}
            >
              <div className={`${currentPage === item.id ? 'text-white' : item.color} transition-transform group-hover:scale-110`}>
                {item.icon}
              </div>
              
              {isSidebarOpen && (
                <span className="font-medium animate-fade-in">{item.label}</span>
              )}
              
              {/* Active Indicator Strip */}
              {currentPage === item.id && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-l-full shadow-[0_0_10px_white]" />
              )}
            </button>
          ))}
        </nav>
        
        {/* Footer Actions */}
        <div className={`p-4 border-t dark:border-white/5 border-black/5 flex items-center gap-2 ${isSidebarOpen ? 'flex-row' : 'flex-col'}`}>
            <button 
                onClick={() => setShowExitModal(true)}
                className={`flex-1 flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden hover:bg-red-500/10 text-red-400 min-w-0`}
            >
                <div className="transition-transform group-hover:scale-110 group-hover:translate-x-1 shrink-0">
                    <LogOut size={20} className="rotate-180" />
                </div>
                {isSidebarOpen && <span className="font-medium animate-fade-in whitespace-nowrap">خروج از پنل</span>}
            </button>

            {/* Toggle Sidebar Button — sits in normal flow now, never overlaps
                the logout button above (it used to float with `absolute`
                positioning at a fixed offset, which collided with the logout
                button whenever the sidebar was collapsed). */}
            <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="shrink-0 p-2.5 rounded-lg dark:bg-white/5 bg-black/5 hover:bg-black/10 dark:hover:bg-white/10 dark:text-white/50 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
                <Menu size={20} />
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-20 px-8 flex items-center justify-between z-10">
          <div className="flex items-center gap-4 dark:bg-white/5 bg-white/60 backdrop-blur-md px-4 py-2 rounded-full border dark:border-white/5 border-white/40 shadow-sm">
             <Search size={18} className="dark:text-white/40 text-slate-400" />
             <input 
                type="text" 
                placeholder="جستجو..." 
                className="bg-transparent border-none outline-none text-sm dark:text-white text-slate-800 dark:placeholder-white/40 placeholder-slate-400 w-48"
             />
          </div>

          <div className="flex items-center gap-4">
             {/* Stats Capsule */}
             <div className="hidden md:flex items-center gap-4 dark:bg-white/5 bg-white/60 backdrop-blur-md px-5 py-2 rounded-full border dark:border-white/5 border-white/40 text-sm shadow-sm">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                   <span className="dark:text-white/80 text-slate-700">سیستم آنلاین</span>
                </div>
                <div className="w-[1px] h-4 dark:bg-white/10 bg-black/10" />
                <span className="dark:text-white/60 text-slate-500">نسخه 2.5.1</span>
             </div>

             {/* Theme Toggle */}
             <button 
                onClick={toggleTheme}
                className="relative p-3 rounded-full dark:hover:bg-white/10 hover:bg-black/5 transition-colors dark:text-white text-slate-700"
             >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
             </button>

             <button className="relative p-3 rounded-full dark:hover:bg-white/10 hover:bg-black/5 transition-colors dark:text-white text-slate-700">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500" />
             </button>
             
             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-2 dark:border-white/20 border-white/50 shadow-lg cursor-pointer transform hover:scale-105 transition-transform" />
          </div>
        </header>

        {/* Dynamic Content Area */}
        <div className="flex-1 overflow-y-auto px-8 pb-8 relative">
           {/* Background Decor */}
           <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1]">
              <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />
              <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />
           </div>

           {children}
        </div>
      </main>
    </div>
  );
};

const BotIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4Z" fill="white" fillOpacity="0.2"/>
    <path d="M12 6L9 11H15L12 6Z" fill="white"/>
    <path d="M9 13C9 14.1 9.9 15 11 15C12.1 15 13 14.1 13 13C13 11.9 12.1 11 11 11C9.9 11 9 11.9 9 13Z" fill="white"/>
  </svg>
);
