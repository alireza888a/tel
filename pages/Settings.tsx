import React, { useState, useEffect } from 'react';
import { Server, CheckCircle, AlertTriangle, Database, CreditCard, Users, ListChecks, Smartphone, Image, MessageSquare, UserCog } from 'lucide-react';
import { telegramService } from '../services/telegramService';
import { syncNow } from '../services/cloudSync';
import { MiniAppModule, GalleryImage } from '../types';

import { DatabaseChannelCard } from '../components/settings/DatabaseChannelCard';
import { BackupRestoreCard } from '../components/settings/BackupRestoreCard';
import { PaymentSettingsCard } from '../components/settings/PaymentSettingsCard';
import { ShippingMethodsCard, ShippingMethod } from '../components/settings/ShippingMethodsCard';
import { PaymentSmsAutoConfirmCard } from '../components/settings/PaymentSmsAutoConfirmCard';
import { AdminSupportCard } from '../components/settings/AdminSupportCard';
import { TeamAccessCard } from '../components/settings/TeamAccessCard';
import { PostConfirmMenuCard } from '../components/settings/PostConfirmMenuCard';
import { MiniAppModulesCard } from '../components/settings/MiniAppModulesCard';
import { GalleryManagementCard } from '../components/settings/GalleryManagementCard';
import { AutoMessagesCard, CustomTexts } from '../AutoMessagesCard';
import { FactoryResetModal } from '../components/settings/FactoryResetModal';
import { RestoreBackupModal } from '../components/settings/RestoreBackupModal';
import { AssistantAccessCard } from '../components/settings/AssistantAccessCard';

export const Settings: React.FC = () => {
    // An assistant session (logged in via a shop's assistant link) has its
    // own storage key instead of license_cache — same signal cloudSync.ts
    // and LicenseGate already use to tell the two roles apart. Owner-only
    // tabs (payment, admins, assistant-access itself) are hidden entirely
    // for this role — not just blanked — because the server already
    // redacts those fields in the load response, so there's nothing real
    // to show there anyway; hiding the tabs just avoids a confusing
    // dead-end UI for a field that will always look empty.
    // A fresh owner login (license_cache present) always wins, even if a
    // stale assistant_session_cache is still sitting in this browser's
    // storage from an earlier test — a device should never be treated as
    // "assistant" just because it once was, if it's now actively logged in
    // as the owner.
    const isAssistantSession = !localStorage.getItem('license_cache') && !!localStorage.getItem('assistant_session_cache');

    const [token, setToken] = useState(localStorage.getItem('bot_token') || '');
    // Initialize directly from localStorage
    const [dbChannel, setDbChannel] = useState(localStorage.getItem('bot_db_channel') || '');
    const [activeSettingsTab, setActiveSettingsTab] = useState<
        'database' | 'payment' | 'admins' | 'assistantAccess' | 'postConfirm' | 'miniapp' | 'gallery' | 'autoMessages'
    >(isAssistantSession ? 'postConfirm' : 'database');

    // Custom automated-message texts (booking/order confirm/reject, etc.)
    const [customTexts, setCustomTexts] = useState<CustomTexts>(() => {
        try { return JSON.parse(localStorage.getItem('custom_texts') || '{}'); } catch { return {}; }
    });

    // Payment Card Settings States
    const [cardNumber, setCardNumber] = useState(localStorage.getItem('payment_card_number') || '');
    const [cardOwner, setCardOwner] = useState(localStorage.getItem('payment_card_owner') || '');
    const [maxPerOrder, setMaxPerOrder] = useState(localStorage.getItem('max_per_order') || '');
    const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>(() => {
        try { return JSON.parse(localStorage.getItem('shipping_methods') || '[]'); } catch { return []; }
    });

    // Admin Chat ID State
    const [adminChatId, setAdminChatId] = useState(localStorage.getItem('admin_chat_id') || '');

    // Support Chat ID State
    const [supportChatId, setSupportChatId] = useState(localStorage.getItem('support_chat_id') || '');

    // Staff Admins (Team Access) State
    const [admins, setAdmins] = useState<{ chatId: string; name: string; role: 'staff' }[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('bot_admins') || '[]');
        } catch {
            return [];
        }
    });

    const handleAddAdmin = (chatId: string, name: string) => {
        const trimmedId = chatId.trim();
        if (!trimmedId) return;
        if (admins.some(a => a.chatId === trimmedId)) {
            alert('این آیدی قبلاً اضافه شده.');
            return;
        }
        const updated = [...admins, { chatId: trimmedId, name: name.trim() || trimmedId, role: 'staff' as const }];
        setAdmins(updated);
        localStorage.setItem('bot_admins', JSON.stringify(updated));
        syncNow();
    };

    const handleRemoveAdmin = (chatId: string) => {
        const updated = admins.filter(a => a.chatId !== chatId);
        setAdmins(updated);
        localStorage.setItem('bot_admins', JSON.stringify(updated));
        syncNow();
    };

    // Auto Backup State
    const [autoBackupEnabled, setAutoBackupEnabled] = useState(() => localStorage.getItem('auto_backup_enabled') === 'true');
    const [autoBackupFrequency, setAutoBackupFrequency] = useState<'daily' | 'weekly'>(() => (localStorage.getItem('auto_backup_frequency') as 'daily' | 'weekly') || 'daily');

    const handleToggleAutoBackup = () => {
        const newVal = !autoBackupEnabled;
        setAutoBackupEnabled(newVal);
        localStorage.setItem('auto_backup_enabled', String(newVal));
        syncNow();
    };

    const handleChangeAutoBackupFrequency = (freq: 'daily' | 'weekly') => {
        setAutoBackupFrequency(freq);
        localStorage.setItem('auto_backup_frequency', freq);
        syncNow();
    };

    // Post Confirm Menu State
    const [postConfirmMenuId, setPostConfirmMenuId] = useState(localStorage.getItem('post_confirm_menu_id') || '');
    const [postOrderFormId, setPostOrderFormId] = useState(localStorage.getItem('post_order_form_id') || '');

    // Mini App Modules State
    const [miniappModules, setMiniappModules] = useState<MiniAppModule[]>(() => {
        try {
            const saved = localStorage.getItem('miniapp_modules');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch {}
        return ['shop'];
    });

    // Gallery Images State
    const [galleryImages, setGalleryImages] = useState<GalleryImage[]>(() => {
        try {
            const saved = localStorage.getItem('gallery_images');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch {}
        return [];
    });
    const [isUploadingGallery, setIsUploadingGallery] = useState(false);

    const [isCheckingDb, setIsCheckingDb] = useState(false);
    const [dbStatus, setDbStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [statusMsg, setStatusMsg] = useState('');
    
    const [showResetModal, setShowResetModal] = useState(false);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);
    const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

    // NEW — plan gating (backup/restore are disabled during a trial plan, so
    // a customer can't build everything, export a JSON backup, then restore
    // it into an endless string of fresh trial licenses).
    const [customerPlan, setCustomerPlan] = useState<string | null>(null);
    useEffect(() => {
        const getLicenseCode = () => {
            const cacheStr = localStorage.getItem('license_cache') || '{}';
            try { return JSON.parse(cacheStr).code || ''; } catch { return cacheStr; }
        };
        const code = getLicenseCode();
        if (!code) return;
        fetch('https://corepanel-api.tajikr450.workers.dev/api/bot/health', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
        })
            .then((res) => res.json())
            .then((data) => { if (data.ok) setCustomerPlan(data.plan || null); })
            .catch(() => {});
    }, []);
    const isTrialPlan = customerPlan === 'trial';
    
    // Toast auto-clear
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // --- AUTO SAVE EFFECT & STATUS RESTORE ---
    useEffect(() => {
        localStorage.setItem('bot_db_channel', dbChannel);
        syncNow();
    }, [dbChannel]);

    useEffect(() => {
        localStorage.setItem('payment_card_number', cardNumber);
        syncNow();
    }, [cardNumber]);

    useEffect(() => {
        localStorage.setItem('payment_card_owner', cardOwner);
        syncNow();
    }, [cardOwner]);

    useEffect(() => {
        localStorage.setItem('max_per_order', maxPerOrder);
        syncNow();
    }, [maxPerOrder]);

    useEffect(() => {
        localStorage.setItem('shipping_methods', JSON.stringify(shippingMethods));
        syncNow();
    }, [shippingMethods]);

    useEffect(() => {
        localStorage.setItem('custom_texts', JSON.stringify(customTexts));
        syncNow();
    }, [customTexts]);

    useEffect(() => {
        localStorage.setItem('admin_chat_id', adminChatId);
        syncNow();
    }, [adminChatId]);

    useEffect(() => {
        localStorage.setItem('support_chat_id', supportChatId);
        syncNow();
    }, [supportChatId]);

    useEffect(() => {
        localStorage.setItem('post_confirm_menu_id', postConfirmMenuId);
        syncNow();
    }, [postConfirmMenuId]);

    useEffect(() => {
        localStorage.setItem('post_order_form_id', postOrderFormId);
        syncNow();
    }, [postOrderFormId]);

    useEffect(() => {
        localStorage.setItem('miniapp_modules', JSON.stringify(miniappModules));
        syncNow();
    }, [miniappModules]);

    useEffect(() => {
        localStorage.setItem('gallery_images', JSON.stringify(galleryImages));
        syncNow();
    }, [galleryImages]);

    const toggleMiniAppModule = (mod: MiniAppModule) => {
        setMiniappModules(prev => {
            if (prev.includes(mod)) {
                const next = prev.filter(m => m !== mod);
                return next.length > 0 ? next : ['shop'];
            } else {
                return [...prev, mod];
            }
        });
    };

    const handleAddGalleryImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingGallery(true);
        try {
            let imageUrl = '';
            if (token && dbChannel) {
                const uploadedFileId = await telegramService.uploadToDb(token, dbChannel, file, 'image');
                if (uploadedFileId) {
                    imageUrl = uploadedFileId;
                }
            }
            if (!imageUrl) {
                // Read as base64 data URL for local storage persistence if no DB channel
                const reader = new FileReader();
                imageUrl = await new Promise<string>((resolve) => {
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
            }
            const newImg: GalleryImage = {
                id: Date.now().toString(),
                imageUrl,
                caption: ''
            };
            setGalleryImages(prev => [newImg, ...prev]);
            setToast({ message: 'عکس جدید با موفقیت به گالری اضافه شد', type: 'success' });
        } catch (err) {
            console.error('Gallery image upload failed:', err);
            setToast({ message: 'خطا در آپلود عکس گالری', type: 'error' });
        } finally {
            setIsUploadingGallery(false);
            e.target.value = '';
        }
    };

    const handleUpdateGalleryCaption = (id: string, caption: string) => {
        setGalleryImages(prev => prev.map(img => img.id === id ? { ...img, caption } : img));
    };

    const handleDeleteGalleryImage = (id: string) => {
        setGalleryImages(prev => prev.filter(img => img.id !== id));
        setToast({ message: 'عکس از گالری حذف شد', type: 'success' });
    };

    const getKbMenus = (): Record<string, { id?: string; title?: string; content?: string }> => {
        try {
            return JSON.parse(localStorage.getItem('kb_menus') || '{}');
        } catch {
            return {};
        }
    };

    const getKbForms = (): Record<string, { id?: string; title?: string }> => {
        try {
            return JSON.parse(localStorage.getItem('kb_forms') || '{}');
        } catch {
            return {};
        }
    };

    // Restore visual status on mount if channel exists
    useEffect(() => {
        if (dbChannel) {
            setDbStatus('success');
        }
    }, []);

    // --- DB CHANNEL LOGIC ---
    const handleSaveDb = async () => {
        if (!dbChannel) return;
        if (!token) {
            setDbStatus('error');
            setStatusMsg('❌ ابتدا توکن ربات را در بخش "اتصال ربات" وارد کنید.');
            return;
        }

        setIsCheckingDb(true);
        setDbStatus('idle');
        setStatusMsg('⏳ در حال بررسی دسترسی ربات...');

        // 1. Smart ID Cleaning
        let cleanId = dbChannel.trim();
        // Remove standard URL prefixes
        cleanId = cleanId.replace(/^https?:\/\/(www\.)?t\.me\//i, '')
                         .replace(/^https?:\/\/(www\.)?telegram\.me\//i, '')
                         .replace(/\/$/, '');

        // 2. DETECT PRIVATE INVITE LINKS (Error handling)
        if (cleanId.startsWith('+') || cleanId.includes('joinchat')) {
            setDbStatus('error');
            setStatusMsg('⛔️ لینک دعوت (Invite Link) قابل قبول نیست! برای کانال خصوصی، باید "آیدی عددی" (که با -100 شروع می‌شود) را وارد کنید.');
            setIsCheckingDb(false);
            return;
        }

        // 3. Auto-format ID
        const isNumeric = /^-?\d+$/.test(cleanId);
        if (!isNumeric) {
            // Assume it's a public username
            if (!cleanId.startsWith('@')) {
                cleanId = '@' + cleanId;
            }
        } else {
            // It is numeric. Check if it needs -100 prefix (common mistake)
            // If user enters '123456789' (from web url), convert to '-100123456789'
            if (!cleanId.startsWith('-100') && !cleanId.startsWith('-')) {
                 cleanId = '-100' + cleanId;
            }
        }

        try {
            // 4. Check if chat exists
            const res = await telegramService.getChat(token, cleanId);
            if (!res.ok) {
                if (res.description?.includes('chat not found')) {
                    throw new Error('کانال یافت نشد. اگر خصوصی است، آیدی عددی (-100...) اشتباه است یا ربات عضو نیست.');
                }
                throw new Error(res.description || 'کانال یافت نشد.');
            }

            const realId = res.result?.id;
            const title = res.result?.title;
            
            // 5. Check Admin rights
            const me = await telegramService.getMe(token);
            if (!me.ok || !me.result) throw new Error('عدم ارتباط با تلگرام.');

            const memberRes = await telegramService.getChatMember(token, String(realId), me.result.id);
            
            if (memberRes.ok && (memberRes.result?.status === 'administrator' || memberRes.result?.status === 'creator')) {
                // Success
                const finalId = String(realId);
                setDbChannel(finalId); 
                localStorage.setItem('bot_db_channel', finalId);
                
                setDbStatus('success');
                setStatusMsg(`✅ متصل شد: ${title} (Admin)`);
            } else {
                throw new Error('ربات در این کانال "ادمین" نیست.');
            }

        } catch (e: any) {
            setDbStatus('error');
            setStatusMsg('❌ خطا: ' + (e.message || 'مشکل در اتصال'));
        }
        setIsCheckingDb(false);
    };

    // --- BACKUP LOGIC ---
    const handleBackup = () => {
        const backupData = {
            meta: {
                version: "2.5.3",
                exported_at: new Date().toISOString(),
                type: "full_backup"
            },
            config: {
                token: localStorage.getItem('bot_token'),
                db_channel: localStorage.getItem('bot_db_channel'),
                webhook_url: localStorage.getItem('bot_webhook_url'),
                theme: localStorage.getItem('theme'),
                force_join: localStorage.getItem('force_join_enabled'),
                payment_card_number: localStorage.getItem('payment_card_number'),
                payment_card_owner: localStorage.getItem('payment_card_owner'),
                admin_chat_id: localStorage.getItem('admin_chat_id'),
                support_chat_id: localStorage.getItem('support_chat_id'),
                post_confirm_menu_id: localStorage.getItem('post_confirm_menu_id'),
                post_order_form_id: localStorage.getItem('post_order_form_id'),
                custom_texts: JSON.parse(localStorage.getItem('custom_texts') || '{}')
            },
            data: {
                menus: JSON.parse(localStorage.getItem('kb_menus') || '{}'),
                forms: JSON.parse(localStorage.getItem('kb_forms') || '{}'),
                commands: JSON.parse(localStorage.getItem('bot_commands') || '[]'),
                channels: JSON.parse(localStorage.getItem('saved_channels') || '[]'),
                templates: JSON.parse(localStorage.getItem('broadcast_templates') || '[]')
            }
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `BotBackup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    // --- RESTORE LOGIC ---
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPendingRestoreFile(file);
        setShowRestoreModal(true);
        // Reset input so the same file could be selected again if needed
        e.target.value = '';
    };

    const confirmRestore = () => {
        if (!pendingRestoreFile) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                
                // Validate Basic Structure
                if (!json.data || !json.config) throw new Error('فرمت فایل نامعتبر است');

                // Restore Config
                if (json.config.token) localStorage.setItem('bot_token', json.config.token);
                if (json.config.db_channel) localStorage.setItem('bot_db_channel', json.config.db_channel);
                if (json.config.webhook_url) localStorage.setItem('bot_webhook_url', json.config.webhook_url);
                if (json.config.force_join) localStorage.setItem('force_join_enabled', json.config.force_join);
                if (json.config.payment_card_number) localStorage.setItem('payment_card_number', json.config.payment_card_number);
                if (json.config.payment_card_owner) localStorage.setItem('payment_card_owner', json.config.payment_card_owner);
                if (json.config.admin_chat_id) localStorage.setItem('admin_chat_id', json.config.admin_chat_id);
                if (json.config.support_chat_id) localStorage.setItem('support_chat_id', json.config.support_chat_id);
                if (json.config.post_confirm_menu_id) localStorage.setItem('post_confirm_menu_id', json.config.post_confirm_menu_id);
                if (json.config.post_order_form_id) localStorage.setItem('post_order_form_id', json.config.post_order_form_id);
                if (json.config.custom_texts) localStorage.setItem('custom_texts', JSON.stringify(json.config.custom_texts));

                // Restore Data
                localStorage.setItem('kb_menus', JSON.stringify(json.data.menus || {}));
                localStorage.setItem('kb_forms', JSON.stringify(json.data.forms || {}));
                localStorage.setItem('bot_commands', JSON.stringify(json.data.commands || []));
                localStorage.setItem('saved_channels', JSON.stringify(json.data.channels || []));
                localStorage.setItem('broadcast_templates', JSON.stringify(json.data.templates || []));

                setToast({ message: 'اطلاعات با موفقیت بازگردانی شد. در حال رفرش...', type: 'success' });
                setTimeout(() => window.location.reload(), 1500);

            } catch (err) {
                setToast({ message: 'خطا در خواندن فایل پشتیبان.', type: 'error' });
                console.error(err);
            }
        };
        reader.readAsText(pendingRestoreFile);
        setShowRestoreModal(false);
        setPendingRestoreFile(null);
    };

    const cancelRestore = () => {
        setShowRestoreModal(false);
        setPendingRestoreFile(null);
    };

    // --- FACTORY RESET ---
    const handleFactoryReset = () => {
        setShowResetModal(true);
    };
    
    const confirmFactoryReset = () => {
        localStorage.clear();
        setToast({ message: 'اطلاعات با موفقیت پاک شد. در حال رفرش...', type: 'success' });
        setTimeout(() => window.location.reload(), 1000);
    };

    const addSupportButtonToRootMenu = () => {
        try {
            const saved = localStorage.getItem('kb_menus');
            let menus = saved ? JSON.parse(saved) : {};

            if (!menus['root']) {
                setToast({ message: 'هنوز منوی اصلی (root) ساخته نشده است.', type: 'error' });
                alert('هنوز منوی اصلی (root) رو نساختی — اول برو دکمه‌ساز و منوی اصلی رو بساز.');
                return;
            }

            const alreadyExists = menus['root'].rows?.some((r: any) =>
                r.buttons?.some((b: any) => b.type === 'callback' && b.value === 'support')
            );

            if (alreadyExists) {
                setToast({ message: 'این دکمه از قبل توی منوی اصلی هست.', type: 'error' });
                alert('این دکمه از قبل توی منوی اصلی هست.');
                return;
            }

            const newButton = {
                id: 'btn_' + Date.now(),
                text: '💬 پشتیبانی',
                type: 'callback',
                value: 'support'
            };

            menus['root'].rows = [...(menus['root'].rows || []), { id: 'row_' + Date.now(), buttons: [newButton] }];
            localStorage.setItem('kb_menus', JSON.stringify(menus));
            syncNow();
            setToast({ message: 'دکمه‌ی پشتیبانی به منوی اصلی اضافه شد.', type: 'success' });
            alert('✅ دکمه‌ی «پشتیبانی» به منوی اصلی اضافه شد.');
        } catch (e) {
            console.error(e);
            alert('خطا در تغییر منوهای کیبورد.');
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-20">
            {toast && (
                <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-xl shadow-black/20 flex items-center gap-2 border ${toast.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'} animate-slide-up`}>
                    {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                    <span>{toast.message}</span>
                </div>
            )}
            
            {/* Modal for Factory Reset */}
            <FactoryResetModal
                showResetModal={showResetModal}
                confirmFactoryReset={confirmFactoryReset}
                setShowResetModal={setShowResetModal}
            />

            {/* Modal for Restore Backup */}
            <RestoreBackupModal
                showRestoreModal={showRestoreModal}
                confirmRestore={confirmRestore}
                cancelRestore={cancelRestore}
            />

            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-600/20 rounded-xl text-blue-400">
                    <Server size={32}/>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">تنظیمات سیستم و دیتابیس</h2>
                    <p className="text-sm text-slate-500">مدیریت فضای ابری، پشتیبان‌گیری و تنظیمات کلی پنل</p>
                </div>
            </div>

            {/* Tab Navigation
                FIX: was a dark bg-black/30 strip where every inactive tab
                was just gray text — no color, no framing, nothing to tell
                the tabs apart until you clicked one. Each tab now keeps a
                light tint + border in its own color at all times (matching
                the accent color of the card it opens), and turns solid on
                selection — so the whole row reads clearly even before you
                pick anything. */}
            <div className="flex items-center gap-2 bg-black/[0.03] p-2 rounded-2xl border border-black/5 flex-wrap mb-6">
                {!isAssistantSession && (
                <button
                    onClick={() => setActiveSettingsTab('database')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                        activeSettingsTab === 'database'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
                            : 'bg-purple-500/10 text-purple-700 border-purple-500/20 hover:bg-purple-500/20'
                    }`}
                >
                    <Database size={16} />
                    <span>دیتابیس و بکاپ</span>
                </button>
                )}
                {!isAssistantSession && (
                <button
                    onClick={() => setActiveSettingsTab('payment')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                        activeSettingsTab === 'payment'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20'
                            : 'bg-amber-500/10 text-amber-700 border-amber-500/20 hover:bg-amber-500/20'
                    }`}
                >
                    <CreditCard size={16} />
                    <span>پرداخت</span>
                </button>
                )}
                {!isAssistantSession && (
                <button
                    onClick={() => setActiveSettingsTab('admins')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                        activeSettingsTab === 'admins'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                            : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/20'
                    }`}
                >
                    <Users size={16} />
                    <span>ادمین‌ها و دسترسی</span>
                </button>
                )}
                {!isAssistantSession && (
                <button
                    onClick={() => setActiveSettingsTab('assistantAccess')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                        activeSettingsTab === 'assistantAccess'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                            : 'bg-rose-500/10 text-rose-700 border-rose-500/20 hover:bg-rose-500/20'
                    }`}
                >
                    <UserCog size={16} />
                    <span>دسترسی دستیار</span>
                </button>
                )}
                <button
                    onClick={() => setActiveSettingsTab('postConfirm')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                        activeSettingsTab === 'postConfirm'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                            : 'bg-blue-500/10 text-blue-700 border-blue-500/20 hover:bg-blue-500/20'
                    }`}
                >
                    <ListChecks size={16} />
                    <span>منوی بعد از خرید</span>
                </button>
                <button
                    onClick={() => setActiveSettingsTab('miniapp')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                        activeSettingsTab === 'miniapp'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                            : 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20 hover:bg-indigo-500/20'
                    }`}
                >
                    <Smartphone size={16} />
                    <span>Mini App</span>
                </button>
                <button
                    onClick={() => setActiveSettingsTab('gallery')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                        activeSettingsTab === 'gallery'
                            ? 'bg-fuchsia-600 text-white border-fuchsia-600 shadow-md shadow-fuchsia-600/20'
                            : 'bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-500/20 hover:bg-fuchsia-500/20'
                    }`}
                >
                    <Image size={16} />
                    <span>گالری</span>
                </button>
                <button
                    onClick={() => setActiveSettingsTab('autoMessages')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                        activeSettingsTab === 'autoMessages'
                            ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-600/20'
                            : 'bg-orange-500/10 text-orange-700 border-orange-500/20 hover:bg-orange-500/20'
                    }`}
                >
                    <MessageSquare size={16} />
                    <span>پیام‌های خودکار</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {activeSettingsTab === 'database' && (
                    <>
                        {/* 1. DATABASE CHANNEL CONFIG */}
                        <DatabaseChannelCard
                            dbChannel={dbChannel}
                            setDbChannel={setDbChannel}
                            handleSaveDb={handleSaveDb}
                            isCheckingDb={isCheckingDb}
                            dbStatus={dbStatus}
                            statusMsg={statusMsg}
                        />

                        {/* 2. BACKUP & RESTORE */}
                        <BackupRestoreCard
                            handleBackup={handleBackup}
                            handleFileSelect={handleFileSelect}
                            handleFactoryReset={handleFactoryReset}
                            autoBackupEnabled={autoBackupEnabled}
                            onToggleAutoBackup={handleToggleAutoBackup}
                            autoBackupFrequency={autoBackupFrequency}
                            onChangeAutoBackupFrequency={handleChangeAutoBackupFrequency}
                            isTrialPlan={isTrialPlan}
                        />
                    </>
                )}

                {activeSettingsTab === 'payment' && (
                    /* 3. CARD PAYMENT SETTINGS */
                    <>
                    <PaymentSettingsCard
                        cardNumber={cardNumber}
                        setCardNumber={setCardNumber}
                        cardOwner={cardOwner}
                        setCardOwner={setCardOwner}
                        maxPerOrder={maxPerOrder}
                        setMaxPerOrder={setMaxPerOrder}
                    />
                    <ShippingMethodsCard
                        methods={shippingMethods}
                        setMethods={setShippingMethods}
                    />
                    <PaymentSmsAutoConfirmCard />
                    </>
                )}

                {activeSettingsTab === 'admins' && (
                    <>
                        {/* 4. ADMIN & SUPPORT CHAT ID SETTINGS */}
                        <AdminSupportCard
                            adminChatId={adminChatId}
                            setAdminChatId={setAdminChatId}
                            supportChatId={supportChatId}
                            setSupportChatId={setSupportChatId}
                            addSupportButtonToRootMenu={addSupportButtonToRootMenu}
                        />

                        {/* 4.5. TEAM ACCESS (STAFF) SETTINGS */}
                        <TeamAccessCard
                            admins={admins}
                            onAddAdmin={handleAddAdmin}
                            onRemoveAdmin={handleRemoveAdmin}
                        />
                    </>
                )}

                {activeSettingsTab === 'assistantAccess' && (
                    /* 4.6. PANEL ASSISTANT ACCESS (separate from the bot's own
                       Telegram admins above — this is a second panel-login
                       credential for someone to help manage the panel itself) */
                    <AssistantAccessCard />
                )}

                {activeSettingsTab === 'postConfirm' && (
                    /* 5. POST CONFIRM MENU SETTINGS */
                    <PostConfirmMenuCard
                        postConfirmMenuId={postConfirmMenuId}
                        setPostConfirmMenuId={setPostConfirmMenuId}
                        getKbMenus={getKbMenus}
                        postOrderFormId={postOrderFormId}
                        setPostOrderFormId={setPostOrderFormId}
                        getKbForms={getKbForms}
                    />
                )}

                {activeSettingsTab === 'miniapp' && (
                    /* 6. MINI APP MODULES SETTINGS */
                    <MiniAppModulesCard
                        miniappModules={miniappModules}
                        toggleMiniAppModule={toggleMiniAppModule}
                    />
                )}

                {activeSettingsTab === 'gallery' && (
                    /* 7. GALLERY MANAGEMENT */
                    <GalleryManagementCard
                        galleryImages={galleryImages}
                        isUploadingGallery={isUploadingGallery}
                        handleAddGalleryImage={handleAddGalleryImage}
                        handleUpdateGalleryCaption={handleUpdateGalleryCaption}
                        handleDeleteGalleryImage={handleDeleteGalleryImage}
                    />
                )}

                {activeSettingsTab === 'autoMessages' && (
                    /* 8. AUTOMATED MESSAGES */
                    <AutoMessagesCard
                        customTexts={customTexts}
                        setCustomTexts={setCustomTexts}
                    />
                )}
            </div>
        </div>
    );
};
