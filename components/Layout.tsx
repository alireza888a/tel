
import React, { useState, useRef } from 'react';
import { Menu, Home, Settings, Layers, Users, Command, Bell, Search, Megaphone, LogOut, Download, AlertTriangle, X, Cloud, UserCog, ShoppingBag, ShoppingCart, MessageCircle, HelpCircle, Zap, Calendar, Tag, Camera } from 'lucide-react';
import { LOGO_ICON_DATA_URI } from '../assets/logoIcon';
import { LOGO_WORDMARK_DATA_URI } from '../assets/logoWordmark';
import { telegramService } from '../services/telegramService';
import { getDisplayableImageUrl } from '../utils/image';
import { syncNow } from '../services/cloudSync';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  toggleTheme: () => void;
  isDarkMode: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate, toggleTheme, isDarkMode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [profilePhotoFileId, setProfilePhotoFileId] = useState<string | null>(localStorage.getItem('profile_photo_file_id'));
  const [isUploadingProfilePhoto, setIsUploadingProfilePhoto] = useState(false);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);

  const handleProfilePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    const token = localStorage.getItem('bot_token') || '';
    const dbChannel = localStorage.getItem('bot_db_channel') || '';
    if (!token || !dbChannel) {
      alert('اول باید ربات‌تون رو وصل کنید و کانال «دیتابیس/بکاپ» رو توی تنظیمات تنظیم کنید، بعد بتونید عکس پروفایل بذارید.');
      return;
    }

    setIsUploadingProfilePhoto(true);
    try {
      const fileId = await telegramService.uploadToDb(token, dbChannel, file, 'image');
      if (fileId) {
        localStorage.setItem('profile_photo_file_id', fileId);
        setProfilePhotoFileId(fileId);
        syncNow();
      } else {
        alert('آپلود عکس ناموفق بود، دوباره امتحان کنید.');
      }
    } finally {
      setIsUploadingProfilePhoto(false);
    }
  };

  // NEW — profile dropdown: reads the same license_cache LicenseGate already
  // maintains, so no new API call/state is needed. The code is masked
  // (only first/last segment shown) since this is the merchant's own
  // panel-login credential — no reason to ever show it in full on screen.
  const licenseInfo = (() => {
    try {
      const cache = JSON.parse(localStorage.getItem('license_cache') || '{}');
      const code: string = cache.code || '';
      const maskedCode = code.length > 8
        ? code.slice(0, 4) + '••••' + code.slice(-4)
        : code;
      let daysLeft: number | null = null;
      if (cache.validUntil) {
        const diffMs = new Date(cache.validUntil).getTime() - Date.now();
        daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      }
      return { maskedCode, daysLeft };
    } catch {
      return { maskedCode: '', daysLeft: null };
    }
  })();

  const menuItems = [
    { id: 'dashboard', label: 'داشبورد', icon: <Home size={20} /> },
    { id: 'broadcast', label: 'پیام همگانی', icon: <Megaphone size={20} /> },
    { id: 'keyboard', label: 'دکمه‌ساز', icon: <Layers size={20} /> },
    { id: 'channels', label: 'مدیریت کانال‌ها', icon: <Users size={20} /> },
    { id: 'commands', label: 'دستورات', icon: <Command size={20} /> },
    { id: 'users', label: 'کاربران ربات', icon: <UserCog size={20} /> },
    { id: 'products', label: 'محصولات', icon: <ShoppingBag size={20} /> },
    { id: 'orders', label: 'سفارش‌ها', icon: <ShoppingCart size={20} /> },
    { id: 'coupons', label: 'کدهای تخفیف', icon: <Tag size={20} /> },
    { id: 'booking', label: 'نوبت‌دهی', icon: <Calendar size={20} /> },
    { id: 'customer-tickets', label: 'تیکت‌های پشتیبانی', icon: <HelpCircle size={20} /> },
    { id: 'automations', label: 'قوانین خودکار', icon: <Zap size={20} /> },
    { id: 'support', label: 'پشتیبانی', icon: <MessageCircle size={20} /> },
    { id: 'settings', label: 'تنظیمات', icon: <Settings size={20} /> },
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
    <div className="flex min-h-screen text-brand-navy overflow-hidden">
      
      {/* EXIT MODAL */}
      {showExitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in p-4">
              <div className="bg-white border border-black/5 rounded-2xl shadow-lg w-full max-w-md overflow-hidden transform transition-all scale-100">
                  <div className="p-6 text-center">
                      <div className="w-16 h-16 bg-brand-amber/15 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-orange">
                          <AlertTriangle size={32}/>
                      </div>
                      <h3 className="text-xl font-bold text-brand-navy mb-2">آیا می‌خواهید خارج شوید؟</h3>
                      <p className="text-brand-navy/60 text-sm mb-6">برای جلوگیری از حذف احتمالی اطلاعات در مرورگر، پیشنهاد می‌کنیم قبل از خروج یک نسخه پشتیبان بگیرید.</p>
                      
                      <div className="flex flex-col gap-3">
                          <button 
                              onClick={() => handleConfirmExit(true)}
                              className="w-full py-3 bg-brand-teal hover:bg-brand-teal/90 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                          >
                              <Download size={18}/>
                              بله، دانلود بکاپ و خروج
                          </button>
                          <button 
                              onClick={() => handleConfirmExit(false)}
                              className="w-full py-3 bg-black/5 hover:bg-black/10 border border-black/5 text-brand-navy/70 hover:text-brand-navy rounded-xl font-medium transition-colors"
                          >
                              خیر، فقط خارج شو
                          </button>
                      </div>
                  </div>
                  <div className="bg-black/[0.03] p-3 flex justify-center border-t border-black/5">
                      <button onClick={() => setShowExitModal(false)} className="text-xs text-brand-navy/50 hover:text-brand-navy transition-colors">
                          انصراف و بازگشت به پنل
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Mobile backdrop — tapping it closes the drawer. Desktop never renders this. */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - RTL: Right Side.
          Mobile (below md): fixed overlay drawer, hidden off-screen (translate-x-full)
          until isMobileMenuOpen, always full width regardless of isSidebarOpen (the
          icon-only collapse mode doesn't apply to a drawer you open on purpose).
          Desktop (md+): unchanged from before — static, in-flow, width toggles with
          isSidebarOpen, always visible (translate-x-0). */}
      <aside 
        style={{ willChange: 'width' }}
        className={`w-64 ${isSidebarOpen ? 'md:w-64' : 'md:w-20'} 
        fixed md:relative inset-y-0 right-0 z-40 md:z-20
        ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0
        bg-brand-navy transition-transform md:transition-[width] duration-300 flex flex-col shadow-lg`}
      >
        <div className="p-4 flex items-center gap-2">
           <div className="bg-white rounded-xl shadow-lg flex-1 flex items-center justify-center gap-2 px-3 py-3 min-w-0">
             <img src={LOGO_ICON_DATA_URI} alt="AsanHub" className="w-8 h-8 object-contain shrink-0" />
             {isSidebarOpen && (
               <img src={LOGO_WORDMARK_DATA_URI} alt="AsanHub" className="h-6 w-auto object-contain block" />
             )}
           </div>
           {/* Mobile-only close (X) button — the desktop collapse-to-icons
               button below is hidden on mobile since it doesn't apply to an
               overlay drawer; this is the mobile equivalent of "close it". */}
           <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden shrink-0 p-2 rounded-lg hover:bg-white/10 text-white/60"
           >
              <X size={20} />
           </button>
        </div>

        <div className="mx-4 mt-1 border-t-2 border-white/20"></div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { onNavigate(item.id); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden
                ${currentPage === item.id 
                  ? 'bg-brand-teal text-white' 
                  : 'hover:bg-white/5 text-brand-light/70 hover:text-white'
                }
              `}
            >
              <div className="transition-transform group-hover:scale-110">
                {item.icon}
              </div>
              
              {isSidebarOpen && (
                <span className="font-medium animate-fade-in">{item.label}</span>
              )}
            </button>
          ))}
        </nav>
        
        {/* Footer Actions */}
        <div className={`p-4 border-t border-white/10 flex items-center gap-2 ${isSidebarOpen ? 'flex-row' : 'flex-col'}`}>
            <button 
                onClick={() => { setShowExitModal(true); setIsMobileMenuOpen(false); }}
                className={`flex-1 flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden hover:bg-red-500/10 text-red-400 min-w-0`}
            >
                <div className="transition-transform group-hover:scale-110 group-hover:translate-x-1 shrink-0">
                    <LogOut size={20} className="rotate-180" />
                </div>
                {isSidebarOpen && <span className="font-medium animate-fade-in whitespace-nowrap">خروج از پنل</span>}
            </button>

            {/* Toggle Sidebar Button (icon-only collapse) — desktop only.
                Mobile closes via the X button above or the backdrop instead. */}
            <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="hidden md:block shrink-0 p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-brand-light/70 hover:text-white transition-colors"
            >
                <Menu size={20} />
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden w-full">
        {/* Header */}
        <header className="h-20 px-4 md:px-8 flex items-center justify-between gap-3 z-10">
          <div className="flex items-center gap-3">
             {/* Mobile-only hamburger — opens the drawer sidebar. Hidden on
                 desktop where the sidebar is already always visible. */}
             <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2.5 rounded-full bg-white shadow-sm text-brand-navy shrink-0"
             >
                <Menu size={20} />
             </button>
             <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-full shadow-sm min-w-0">
                <Search size={18} className="text-brand-navy/40 shrink-0" />
                <input 
                   type="text" 
                   placeholder="جستجو..." 
                   className="bg-transparent border-none outline-none text-sm text-brand-navy placeholder-brand-navy/40 w-24 sm:w-48"
                />
             </div>
          </div>

          <div className="flex items-center gap-4">
             {/* Stats Capsule */}
             <div className="hidden md:flex items-center gap-4 bg-white px-5 py-2 rounded-full text-sm shadow-sm">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-brand-navy/80">سیستم آنلاین</span>
                </div>
                <div className="w-[1px] h-4 bg-black/10" />
                <span className="text-brand-navy/50">نسخه 2.5.1</span>
             </div>

             <button className="relative p-3 rounded-full hover:bg-black/5 transition-colors text-brand-navy">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500" />
             </button>
             
             <div className="relative">
                <input
                   type="file"
                   accept="image/*"
                   ref={profilePhotoInputRef}
                   onChange={handleProfilePhotoSelected}
                   className="hidden"
                />
                <button
                   onClick={() => setShowProfileMenu(!showProfileMenu)}
                   className="w-10 h-10 rounded-full bg-brand-navy shadow-sm cursor-pointer transform hover:scale-105 transition-transform flex items-center justify-center text-brand-light font-bold text-sm overflow-hidden"
                >
                   {profilePhotoFileId && getDisplayableImageUrl(profilePhotoFileId) ? (
                      <img src={getDisplayableImageUrl(profilePhotoFileId)!} alt="پروفایل" className="w-full h-full object-cover" />
                   ) : (
                      licenseInfo.maskedCode ? licenseInfo.maskedCode.slice(0, 1) : 'A'
                   )}
                </button>

                {showProfileMenu && (
                   <>
                     {/* click-outside overlay */}
                     <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                     <div className="absolute left-0 top-full mt-2 w-64 z-50 bg-white border border-black/5 rounded-2xl shadow-lg overflow-hidden animate-fade-in">
                        <div className="p-4 border-b border-black/5">
                           <p className="text-[11px] text-brand-navy/50 mb-1">لایسنس‌کد</p>
                           <p className="text-sm font-mono text-brand-navy dir-ltr text-left">
                              {licenseInfo.maskedCode || '—'}
                           </p>
                        </div>
                        <div className="p-4 border-b border-black/5">
                           <p className="text-[11px] text-brand-navy/50 mb-1">اعتبار اشتراک</p>
                           {licenseInfo.daysLeft === null ? (
                              <p className="text-sm text-brand-navy">نامشخص</p>
                           ) : licenseInfo.daysLeft < 0 ? (
                              <p className="text-sm font-bold text-red-500">منقضی شده</p>
                           ) : (
                              <p className={`text-sm font-bold ${licenseInfo.daysLeft <= 7 ? 'text-brand-orange' : 'text-brand-navy'}`}>
                                 {licenseInfo.daysLeft} روز مونده
                              </p>
                           )}
                        </div>
                        <button
                           onClick={() => { setShowProfileMenu(false); profilePhotoInputRef.current?.click(); }}
                           disabled={isUploadingProfilePhoto}
                           className="w-full text-right px-4 py-3 text-sm text-brand-navy/80 hover:bg-black/5 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                           <Camera size={16} /> {isUploadingProfilePhoto ? 'در حال آپلود...' : 'تغییر عکس پروفایل'}
                        </button>
                        <button
                           onClick={() => { setShowProfileMenu(false); onNavigate('settings'); }}
                           className="w-full text-right px-4 py-3 text-sm text-brand-navy/80 hover:bg-black/5 transition-colors flex items-center gap-2"
                        >
                           <Settings size={16} /> تنظیمات
                        </button>
                        <button
                           onClick={() => { setShowProfileMenu(false); setShowExitModal(true); }}
                           className="w-full text-right px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
                        >
                           <LogOut size={16} /> خروج از پنل
                        </button>
                     </div>
                   </>
                )}
             </div>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8 relative">
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
