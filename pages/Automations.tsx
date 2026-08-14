import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Zap, Plus, Trash2, Edit2, X, Check, ArrowRight, Layers, FileText, MessageSquare, Tag } from 'lucide-react';
import { AutomationRule, AutomationTrigger, MenuPage, FormConfig } from '../types';
import { syncNow } from '../services/cloudSync';

const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
 new_order: 'سفارش جدید ثبت شد',
 order_rejected: 'سفارش رد شد',
 new_user: 'کاربر جدید وارد ربات شد',
 ticket_created: 'تیکت پشتیبانی جدید ثبت شد'
};

export const Automations: React.FC = () => {
 const [rules, setRules] = useState<AutomationRule[]>(() => {
 try {
 return JSON.parse(localStorage.getItem('bot_automations') || '[]');
 } catch {
 return [];
 }
 });

 const [menus, setMenus] = useState<Record<string, MenuPage>>({});
 const [forms, setForms] = useState<Record<string, FormConfig>>({});

 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

 // Form State
 const [trigger, setTrigger] = useState<AutomationTrigger>('new_order');
 const [productCategory, setProductCategory] = useState('');
 const [menuId, setMenuId] = useState('');
 const [formId, setFormId] = useState('');
 const [messageText, setMessageText] = useState('');

 useEffect(() => {
 try {
 const loadedMenus = JSON.parse(localStorage.getItem('kb_menus') || '{}');
 const loadedForms = JSON.parse(localStorage.getItem('kb_forms') || '{}');
 setMenus(loadedMenus);
 setForms(loadedForms);
 } catch (e) {
 console.warn('Error loading menus or forms:', e);
 }
 }, []);

 const saveRules = (updatedRules: AutomationRule[]) => {
 setRules(updatedRules);
 localStorage.setItem('bot_automations', JSON.stringify(updatedRules));
 syncNow();
 };

 const handleToggle = (id: string) => {
 const updated = rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r);
 saveRules(updated);
 };

 const handleDelete = (id: string) => {
 if (confirm('آیا از حذف این قانون مطمئن هستید؟')) {
 const updated = rules.filter(r => r.id !== id);
 saveRules(updated);
 }
 };

 const handleOpenModal = (rule?: AutomationRule) => {
 if (rule) {
 setEditingRule(rule);
 setTrigger(rule.trigger);
 setProductCategory(rule.productCategory || '');
 setMenuId(rule.menuId || '');
 setFormId(rule.formId || '');
 setMessageText(rule.messageText || '');
 } else {
 setEditingRule(null);
 setTrigger('new_order');
 setProductCategory('');
 setMenuId('');
 setFormId('');
 setMessageText('');
 }
 setIsModalOpen(true);
 };

 const handleSaveRule = (e: React.FormEvent) => {
 e.preventDefault();

 const ruleData: AutomationRule = {
 id: editingRule ? editingRule.id : `rule_${Date.now()}`,
 trigger,
 enabled: editingRule ? editingRule.enabled : true,
 productCategory: (trigger === 'new_order' || trigger === 'order_rejected') ? productCategory.trim() || undefined : undefined,
 menuId: menuId || undefined,
 formId: formId || undefined,
 messageText: messageText.trim() || undefined
 };

 let updated: AutomationRule[];
 if (editingRule) {
 updated = rules.map(r => r.id === editingRule.id ? ruleData : r);
 } else {
 updated = [ruleData, ...rules];
 }

 saveRules(updated);
 setIsModalOpen(false);
 };

 return (
 <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto pb-24">
 {/* Header */}
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
 <div>
 <h1 className="text-xl md:text-2xl font-bold text-brand-navy flex items-center gap-2">
 <Zap className="text-brand-orange fill-amber-400/20" size={26} />
 قوانین خودکار (اتوماسیون)
 </h1>
 <p className="text-xs md:text-sm text-brand-navy/50 mt-1">
 تعریف واکنشش‌های خودکار ربات هنگام وقوع رویدادهای مختلف (سفارش، کاربر جدید، تیکت و...)
 </p>
 </div>
 <button
 onClick={() => handleOpenModal()}
 className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs md:text-sm flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20"
 >
 <Plus size={18} />
 قانون جدید
 </button>
 </div>

 {/* Rules List */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {rules.map((rule) => {
 const targetMenu = rule.menuId ? menus[rule.menuId] : null;
 const targetForm = rule.formId ? forms[rule.formId] : null;

 return (
 <GlassCard key={rule.id} className="p-5 flex flex-col justify-between space-y-4 border border-black/5 hover:border-amber-500/30 transition-all">
 <div className="space-y-3">
 {/* Card Header */}
 <div className="flex items-center justify-between gap-2 border-b border-black/5 pb-3">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-lg bg-brand-amber/10 text-brand-orange border border-brand-amber/30 flex items-center justify-center shrink-0">
 <Zap size={18} />
 </div>
 <div>
 <span className="text-xs text-brand-navy/50 block">رویداد محرک:</span>
 <h3 className="text-sm font-bold text-brand-navy">
 {TRIGGER_LABELS[rule.trigger] || rule.trigger}
 </h3>
 </div>
 </div>

 {/* Toggle Switch */}
 <label className="relative inline-flex items-center cursor-pointer">
 <input
 type="checkbox"
 checked={rule.enabled}
 onChange={() => handleToggle(rule.id)}
 className="sr-only peer"
 />
 <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
 </label>
 </div>

 {/* Conditions / Filters */}
 {rule.productCategory && (
 <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-brand-amber/10 border border-brand-amber/30 px-2.5 py-1 rounded-lg w-fit">
 <Tag size={13} />
 <span>دسته‌بندی محصول: <strong>{rule.productCategory}</strong></span>
 </div>
 )}

 {/* Actions Summary */}
 <div className="space-y-2 pt-1 text-xs">
 <p className="text-brand-navy/50 font-medium">اقدامات خودکار هنگام وقوع:</p>
 
 {targetMenu && (
 <div className="flex items-center gap-2 text-cyan-700 bg-brand-teal/10 px-3 py-1.5 rounded-lg border border-brand-teal/20">
 <Layers size={14} />
 <span>ارسال منو: <strong>{targetMenu?.title || rule.menuId}</strong></span>
 </div>
 )}

 {targetForm && (
 <div className="flex items-center gap-2 text-purple-700 bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-500/20">
 <FileText size={14} />
 <span>شروع فرم: <strong>{targetForm?.title || rule.formId}</strong></span>
 </div>
 )}

 {rule.messageText && (
 <div className="flex items-start gap-2 text-brand-navy/60 bg-black/[0.03] p-2.5 rounded-lg border border-black/5">
 <MessageSquare size={14} className="text-brand-orange mt-0.5 shrink-0" />
 <p className="line-clamp-2 leading-relaxed text-[11px]">{rule.messageText}</p>
 </div>
 )}

 {!targetMenu && !targetForm && !rule.messageText && (
 <p className="text-brand-navy/40 italic text-[11px]">هیچ اقدام مشخصی تنظیم نشده است.</p>
 )}
 </div>
 </div>

 {/* Card Footer */}
 <div className="flex items-center justify-between border-t border-black/5 pt-3">
 <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${rule.enabled ? 'text-green-600 bg-green-50' : 'text-brand-navy/40 bg-black/5'}`}>
 {rule.enabled ? '● فعال' : '○ غیرفعال'}
 </span>

 <div className="flex items-center gap-2">
 <button
 onClick={() => handleOpenModal(rule)}
 className="p-2 text-brand-navy/50 hover:text-brand-navy bg-black/[0.03] hover:bg-black/5 rounded-lg transition-colors"
 title="ویرایش قانون"
 >
 <Edit2 size={14} />
 </button>
 <button
 onClick={() => handleDelete(rule.id)}
 className="p-2 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
 title="حذف قانون"
 >
 <Trash2 size={14} />
 </button>
 </div>
 </div>
 </GlassCard>
 );
 })}

 {rules.length === 0 && (
 <div className="col-span-1 md:col-span-2 text-center py-16 bg-black/[0.03] border border-dashed border-black/5 rounded-2xl space-y-3">
 <Zap size={40} className="mx-auto text-brand-orange/50" />
 <h3 className="text-sm font-bold text-brand-navy">هیچ قانون خودکاری تعریف نشده است</h3>
 <p className="text-xs text-brand-navy/50 max-w-sm mx-auto leading-relaxed">
 با ایجاد قوانین اتوماسیون می‌توانید مشخص کنید هنگام ثبت سفارش جدید، ثبت تیکت، ورود کاربر یا رد سفارش چه منو، فرم یا پیامی خودکار ارسال شود.
 </p>
 <button
 onClick={() => handleOpenModal()}
 className="mt-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-1.5 transition-all"
 >
 <Plus size={16} />
 ایجاد اولین قانون
 </button>
 </div>
 )}
 </div>

 {/* Modal Form */}
 {isModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
 <div className="bg-white border border-black/5 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
 <div className="flex justify-between items-center p-4 border-b border-black/5 bg-white">
 <h3 className="text-sm font-bold text-brand-navy flex items-center gap-2">
 <Zap size={16} className="text-brand-orange" />
 {editingRule ? 'ویرایش قانون اتوماسیون' : 'افزودن قانون اتوماسیون جدید'}
 </h3>
 <button
 onClick={() => setIsModalOpen(false)}
 className="text-brand-navy/50 hover:text-brand-navy transition-colors"
 >
 <X size={18} />
 </button>
 </div>

 <form onSubmit={handleSaveRule} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
 {/* Trigger */}
 <div className="space-y-1.5">
 <label className="text-xs text-brand-navy/60 font-medium block">رویداد محرک (Trigger)</label>
 <select
 value={trigger}
 onChange={(e) => setTrigger(e.target.value as AutomationTrigger)}
 className="w-full bg-black/30 border border-black/5 rounded-xl p-2.5 text-xs text-brand-navy outline-none focus:border-amber-500"
 >
 <option value="new_order">🛒 سفارش جدید ثبت شد (new_order)</option>
 <option value="order_rejected">❌ سفارش رد شد (order_rejected)</option>
 <option value="new_user">👤 کاربر جدید وارد ربات شد (new_user)</option>
 <option value="ticket_created">🎫 تیکت پشتیبانی جدید ثبت شد (ticket_created)</option>
 </select>
 </div>

 {/* Product Category Filter */}
 {(trigger === 'new_order' || trigger === 'order_rejected') && (
 <div className="space-y-1.5 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
 <label className="text-xs text-amber-700 font-medium block">
 فقط برای دسته‌بندی محصول (اختیاری)
 </label>
 <input
 type="text"
 value={productCategory}
 onChange={(e) => setProductCategory(e.target.value)}
 placeholder="مثلاً: دیجیتال (خالی یعنی شامل همه محصولات)"
 className="w-full bg-black/30 border border-black/5 rounded-xl p-2.5 text-xs text-brand-navy outline-none focus:border-amber-500"
 />
 <p className="text-[10px] text-brand-navy/50">
 اگر پر شود، این قانون فقط هنگام ثبت یا رد سفارش محصولاتی اجرا می‌شود که این دسته‌بندی را دارند.
 </p>
 </div>
 )}

 {/* Menu Select */}
 <div className="space-y-1.5">
 <label className="text-xs text-brand-navy/60 font-medium block">ارسال منو (اختیاری)</label>
 <select
 value={menuId}
 onChange={(e) => setMenuId(e.target.value)}
 className="w-full bg-black/30 border border-black/5 rounded-xl p-2.5 text-xs text-brand-navy outline-none focus:border-amber-500"
 >
 <option value="">بدون ارسال منو</option>
 {Object.values(menus || {}).map((m: any) => m && (
 <option key={m.id} value={m.id}>
 {m.title || m.id} ({m.id})
 </option>
 ))}
 </select>
 </div>

 {/* Form Select */}
 <div className="space-y-1.5">
 <label className="text-xs text-brand-navy/60 font-medium block">شروع فرم (اختیاری)</label>
 <select
 value={formId}
 onChange={(e) => setFormId(e.target.value)}
 className="w-full bg-black/30 border border-black/5 rounded-xl p-2.5 text-xs text-brand-navy outline-none focus:border-amber-500"
 >
 <option value="">بدون شروع فرم</option>
 {Object.values(forms || {}).map((f: any) => f && (
 <option key={f.id} value={f.id}>
 {f.title || f.id} ({f.id})
 </option>
 ))}
 </select>
 </div>

 {/* Message Text */}
 <div className="space-y-1.5">
 <label className="text-xs text-brand-navy/60 font-medium block">متن ثابت پیام (اختیاری)</label>
 <textarea
 value={messageText}
 onChange={(e) => setMessageText(e.target.value)}
 rows={3}
 placeholder="متنی که همراه یا قبل از منو/فرم ارسال می‌شود..."
 className="w-full bg-black/30 border border-black/5 rounded-xl p-2.5 text-xs text-brand-navy outline-none focus:border-amber-500"
 />
 </div>

 {/* Submit Buttons */}
 <div className="flex justify-end gap-2 pt-3 border-t border-black/5">
 <button
 type="button"
 onClick={() => setIsModalOpen(false)}
 className="px-4 py-2 bg-black/[0.03] hover:bg-black/5 text-brand-navy/60 rounded-xl text-xs font-medium transition-colors"
 >
 انصراف
 </button>
 <button
 type="submit"
 className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-500/20"
 >
 ذخیره قانون
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
};
