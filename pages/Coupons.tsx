import React, { useState, useEffect } from 'react';
import { 
  Tag, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Copy, 
  Check, 
  Search, 
  Percent, 
  DollarSign, 
  Calendar, 
  Users, 
  ShoppingBag,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Coupon } from '../types';
import { syncNow } from '../services/cloudSync';
import { GlassCard } from '../components/GlassCard';

export const CouponsPage: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('coupons') || '[]');
    } catch {
      return [];
    }
  });

  const [usageStats, setUsageStats] = useState<Record<string, { uses: number; totalDiscount: number }>>({});
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  // Form States
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<'percent' | 'fixed'>('percent');
  const [formValue, setFormValue] = useState<string>('');
  const [formActive, setFormActive] = useState(true);
  const [formMaxUses, setFormMaxUses] = useState<string>('');
  const [formPerUserLimit, setFormPerUserLimit] = useState<string>('');
  const [formMinOrderAmount, setFormMinOrderAmount] = useState<string>('');
  const [formExpiresDate, setFormExpiresDate] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch usage stats from server
  const fetchUsageStats = async () => {
    setIsLoadingUsage(true);
    try {
      const licenseCacheStr = localStorage.getItem('license_cache') || '{}';
      const licenseCache = JSON.parse(licenseCacheStr);
      const code = licenseCache.code;
      if (code) {
        const res = await fetch('https://corepanel-api.tajikr450.workers.dev/api/coupons/usage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code })
        });
        const result = await res.json();
        if (result.ok && Array.isArray(result.usage)) {
          const statsMap: Record<string, { uses: number; totalDiscount: number }> = {};
          result.usage.forEach((item: { code: string; uses: number; totalDiscount: number }) => {
            statsMap[item.code] = {
              uses: item.uses || 0,
              totalDiscount: item.totalDiscount || 0
            };
          });
          setUsageStats(statsMap);
        }
      }
    } catch (e) {
      console.warn('Failed to load coupon usage stats:', e);
    } finally {
      setIsLoadingUsage(false);
    }
  };

  useEffect(() => {
    fetchUsageStats();
  }, []);

  const saveCoupons = (updatedCoupons: Coupon[]) => {
    setCoupons(updatedCoupons);
    localStorage.setItem('coupons', JSON.stringify(updatedCoupons));
    syncNow();
  };

  const handleOpenModal = (coupon?: Coupon) => {
    setFormError(null);
    if (coupon) {
      setEditingCoupon(coupon);
      setFormCode(coupon.code);
      setFormType(coupon.discountType);
      setFormValue(String(coupon.discountValue));
      setFormActive(coupon.active);
      setFormMaxUses(coupon.maxUses !== undefined ? String(coupon.maxUses) : '');
      setFormPerUserLimit(coupon.perUserLimit !== undefined ? String(coupon.perUserLimit) : '');
      setFormMinOrderAmount(coupon.minOrderAmount !== undefined ? String(coupon.minOrderAmount) : '');
      if (coupon.expiresAt) {
        const d = new Date(coupon.expiresAt);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setFormExpiresDate(`${yyyy}-${mm}-${dd}`);
      } else {
        setFormExpiresDate('');
      }
    } else {
      setEditingCoupon(null);
      setFormCode('');
      setFormType('percent');
      setFormValue('');
      setFormActive(true);
      setFormMaxUses('');
      setFormPerUserLimit('');
      setFormMinOrderAmount('');
      setFormExpiresDate('');
    }
    setIsModalOpen(true);
  };

  const handleSaveCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanCode = formCode.trim().toUpperCase();
    if (!cleanCode) {
      setFormError('لطفاً کد تخفیف را وارد کنید.');
      return;
    }

    // Check duplicate code
    const isDuplicate = coupons.some(
      c => c.code === cleanCode && (!editingCoupon || editingCoupon.code !== cleanCode)
    );
    if (isDuplicate) {
      setFormError('این کد تخفیف قبلاً تعریف شده است.');
      return;
    }

    const val = Number(formValue);
    if (isNaN(val) || val <= 0) {
      setFormError('مقدار تخفیف باید عددی بزرگتر از صفر باشد.');
      return;
    }

    if (formType === 'percent' && val > 100) {
      setFormError('درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد.');
      return;
    }

    const maxUses = formMaxUses.trim() !== '' ? Number(formMaxUses) : undefined;
    const perUserLimit = formPerUserLimit.trim() !== '' ? Number(formPerUserLimit) : undefined;
    const minOrderAmount = formMinOrderAmount.trim() !== '' ? Number(formMinOrderAmount) : undefined;

    let expiresAt: number | undefined = undefined;
    if (formExpiresDate) {
      const expDateObj = new Date(formExpiresDate + 'T23:59:59');
      if (!isNaN(expDateObj.getTime())) {
        expiresAt = expDateObj.getTime();
      }
    }

    const couponData: Coupon = {
      code: cleanCode,
      discountType: formType,
      discountValue: val,
      active: formActive,
      maxUses: maxUses !== undefined && !isNaN(maxUses) ? maxUses : undefined,
      perUserLimit: perUserLimit !== undefined && !isNaN(perUserLimit) ? perUserLimit : undefined,
      minOrderAmount: minOrderAmount !== undefined && !isNaN(minOrderAmount) ? minOrderAmount : undefined,
      expiresAt,
      createdAt: editingCoupon ? editingCoupon.createdAt : Date.now()
    };

    let updated: Coupon[];
    if (editingCoupon) {
      updated = coupons.map(c => c.code === editingCoupon.code ? couponData : c);
    } else {
      updated = [couponData, ...coupons];
    }

    saveCoupons(updated);
    setIsModalOpen(false);
  };

  const handleToggleActive = (code: string) => {
    const updated = coupons.map(c => c.code === code ? { ...c, active: !c.active } : c);
    saveCoupons(updated);
  };

  const handleDeleteCoupon = (code: string) => {
    if (window.confirm(`آیا از حذف کد تخفیف "${code}" اطمینان دارید؟`)) {
      const updated = coupons.filter(c => c.code !== code);
      saveCoupons(updated);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredCoupons = coupons.filter(c => 
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Compute aggregated stats
  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter(c => c.active).length;
  const totalUsesCount = (Object.values(usageStats) as { uses: number; totalDiscount: number }[]).reduce((sum, item) => sum + (item.uses || 0), 0);
  const totalDiscountGiven = (Object.values(usageStats) as { uses: number; totalDiscount: number }[]).reduce((sum, item) => sum + (item.totalDiscount || 0), 0);

  return (
    <div className="space-y-6 pb-12 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white text-slate-800 flex items-center gap-2">
            <Tag className="text-blue-500" size={28} />
            مدیریت کدهای تخفیف
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            ایجاد، ویرایش و تنظیم کدهای تخفیف درصدی و نقدی همراه با سقف استفاده و انقضا
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsageStats}
            disabled={isLoadingUsage}
            className="p-2.5 rounded-xl dark:bg-white/5 bg-black/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/10 flex items-center gap-2 cursor-pointer text-xs"
            title="به‌روزرسانی آمار استفاده"
          >
            <RefreshCw size={16} className={isLoadingUsage ? 'animate-spin text-blue-400' : ''} />
            <span className="hidden sm:inline">به‌روزرسانی آمار</span>
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus size={18} />
            <span>کد تخفیف جدید</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-1">کل کدهای تخفیف</span>
            <span className="text-2xl font-bold text-white font-mono">{totalCoupons}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Tag size={20} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-1">کدهای فعال</span>
            <span className="text-2xl font-bold text-emerald-400 font-mono">{activeCoupons}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 size={20} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-1">مجموع استفاده‌ها</span>
            <span className="text-2xl font-bold text-amber-400 font-mono">
              {isLoadingUsage ? '...' : totalUsesCount.toLocaleString('fa-IR')}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Users size={20} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-1">مجموع تخفیف داده‌شده</span>
            <span className="text-xl font-bold text-cyan-400 font-mono">
              {isLoadingUsage ? '...' : `${totalDiscountGiven.toLocaleString('fa-IR')} تومان`}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <TrendingUp size={20} />
          </div>
        </GlassCard>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجوی کد تخفیف..."
            className="w-full bg-slate-900/60 border border-white/10 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-400 outline-none focus:border-blue-500 transition-colors font-mono"
          />
        </div>
      </div>

      {/* Coupons List / Grid */}
      {filteredCoupons.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Tag size={32} />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">هیچ کد تخفیفی یافت نشد</h3>
          <p className="text-slate-400 text-xs mb-6 max-w-sm mx-auto">
            {searchTerm ? 'کد تخفیفی با این شناسه پیدا نشد.' : 'هنوز هیچ کد تخفیفی تعریف نکرده‌اید. با کلیک بر روی دکمه زیر نخستین کد را بسازید.'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => handleOpenModal()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              <span>افزودن کد تخفیف جدید</span>
            </button>
          )}
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCoupons.map((coupon) => {
            const stats = usageStats[coupon.code] || { uses: 0, totalDiscount: 0 };
            const isExpired = coupon.expiresAt ? Date.now() > coupon.expiresAt : false;

            return (
              <GlassCard
                key={coupon.code}
                className={`p-5 relative flex flex-col justify-between transition-all duration-200 border ${
                  !coupon.active || isExpired
                    ? 'opacity-60 border-white/5'
                    : 'border-white/10 hover:border-blue-500/40'
                }`}
              >
                <div>
                  {/* Top Bar: Code & Active Toggle */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-extrabold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-lg tracking-wider">
                        {coupon.code}
                      </span>
                      <button
                        onClick={() => handleCopyCode(coupon.code)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                        title="کپی کد"
                      >
                        {copiedCode === coupon.code ? (
                          <Check size={14} className="text-emerald-400" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>

                    <button
                      onClick={() => handleToggleActive(coupon.code)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        coupon.active && !isExpired
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-red-500/15 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {coupon.active && !isExpired ? (
                        <>
                          <CheckCircle2 size={12} />
                          <span>فعال</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={12} />
                          <span>{isExpired ? 'منقضی شده' : 'غیرفعال'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Discount Value Display */}
                  <div className="mb-4">
                    <div className="text-xl font-bold text-white flex items-center gap-1.5">
                      {coupon.discountType === 'percent' ? (
                        <>
                          <Percent size={20} className="text-purple-400" />
                          <span>{coupon.discountValue}٪ تخفیف</span>
                        </>
                      ) : (
                        <>
                          <DollarSign size={20} className="text-emerald-400" />
                          <span>{coupon.discountValue.toLocaleString('fa-IR')} تومان تخفیف</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Info badges */}
                  <div className="space-y-2 text-xs text-slate-300">
                    {/* Usage Stats */}
                    <div className="flex items-center justify-between bg-black/20 p-2.5 rounded-xl border border-white/5">
                      <span className="text-slate-400 text-[11px]">تعداد استفاده:</span>
                      <span className="font-mono font-bold text-white">
                        {stats.uses} {coupon.maxUses ? `/ ${coupon.maxUses}` : ''} بار
                      </span>
                    </div>

                    {/* Expiration Date */}
                    {coupon.expiresAt && (
                      <div className="flex items-center justify-between bg-black/20 p-2.5 rounded-xl border border-white/5">
                        <span className="text-slate-400 text-[11px] flex items-center gap-1">
                          <Calendar size={12} />
                          تاریخ انقضا:
                        </span>
                        <span className={`font-mono text-[11px] ${isExpired ? 'text-red-400 font-bold' : 'text-slate-200'}`}>
                          {new Date(coupon.expiresAt).toLocaleDateString('fa-IR')}
                        </span>
                      </div>
                    )}

                    {/* Minimum order requirement */}
                    {coupon.minOrderAmount && (
                      <div className="flex items-center justify-between bg-black/20 p-2.5 rounded-xl border border-white/5">
                        <span className="text-slate-400 text-[11px] flex items-center gap-1">
                          <ShoppingBag size={12} />
                          حداقل خرید:
                        </span>
                        <span className="font-mono text-[11px] text-amber-300">
                          {coupon.minOrderAmount.toLocaleString('fa-IR')} تومان
                        </span>
                      </div>
                    )}

                    {/* Per user limit */}
                    {coupon.perUserLimit && (
                      <div className="flex items-center justify-between bg-black/20 p-2.5 rounded-xl border border-white/5">
                        <span className="text-slate-400 text-[11px] flex items-center gap-1">
                          <Users size={12} />
                          سقف هر کاربر:
                        </span>
                        <span className="font-mono text-[11px] text-cyan-300">
                          {coupon.perUserLimit} بار
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-white/5">
                  <button
                    onClick={() => handleOpenModal(coupon)}
                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer"
                    title="ویرایش"
                  >
                    <Edit3 size={16} />
                  </button>

                  <button
                    onClick={() => handleDeleteCoupon(coupon.code)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                    title="حذف"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Add / Edit Coupon Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/20">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Tag size={18} className="text-blue-400" />
                <span>{editingCoupon ? 'ویرایش کد تخفیف' : 'تعریف کد تخفیف جدید'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveCoupon} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {formError && (
                <div className="bg-red-500/15 border border-red-500/30 p-3 rounded-xl text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Code Input */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  کد تخفیف <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="مثلاً: WELCOME50"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-blue-500 font-mono tracking-wider uppercase"
                />
              </div>

              {/* Discount Type */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  نوع تخفیف
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    onClick={() => setFormType('percent')}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                      formType === 'percent'
                        ? 'bg-purple-600/20 border-purple-500 text-white'
                        : 'bg-slate-900/60 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="radio"
                      name="discountType"
                      checked={formType === 'percent'}
                      onChange={() => setFormType('percent')}
                      className="text-purple-600"
                    />
                    <div>
                      <span className="block text-xs font-bold">درصدی (٪)</span>
                      <span className="block text-[10px] text-slate-400">مثلاً ۱۰٪ کسر از فاکتور</span>
                    </div>
                  </label>

                  <label
                    onClick={() => setFormType('fixed')}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                      formType === 'fixed'
                        ? 'bg-emerald-600/20 border-emerald-500 text-white'
                        : 'bg-slate-900/60 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="radio"
                      name="discountType"
                      checked={formType === 'fixed'}
                      onChange={() => setFormType('fixed')}
                      className="text-emerald-600"
                    />
                    <div>
                      <span className="block text-xs font-bold">مبلغ ثابت (تومان)</span>
                      <span className="block text-[10px] text-slate-400">مثلاً ۵۰,۰۰۰ تومان کسر</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Value Input */}
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1">
                  مقدار تخفیف {formType === 'percent' ? '(درصد)' : '(تومان)'} <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  placeholder={formType === 'percent' ? 'مثلاً: 20' : 'مثلاً: 50000'}
                  min="1"
                  max={formType === 'percent' ? '100' : undefined}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Minimum order amount */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  حداقل مبلغ سفارش به تومان (اختیاری)
                </label>
                <input
                  type="number"
                  value={formMinOrderAmount}
                  onChange={(e) => setFormMinOrderAmount(e.target.value)}
                  placeholder="خالی بگذارید یعنی بدون حد کف سفارش"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Usage limits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    سقف کل استفاده (اختیاری)
                  </label>
                  <input
                    type="number"
                    value={formMaxUses}
                    onChange={(e) => setFormMaxUses(e.target.value)}
                    placeholder="مثلاً: 100"
                    min="1"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    سقف هر کاربر (اختیاری)
                  </label>
                  <input
                    type="number"
                    value={formPerUserLimit}
                    onChange={(e) => setFormPerUserLimit(e.target.value)}
                    placeholder="مثلاً: 1 (فقط یکبار)"
                    min="1"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Expiration date */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  تاریخ انقضا (اختیاری)
                </label>
                <input
                  type="date"
                  value={formExpiresDate}
                  onChange={(e) => setFormExpiresDate(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Active Checkbox */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-white/20 focus:ring-0"
                  />
                  <span className="text-xs text-slate-200">این کد تخفیف فعال باشد</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/20"
                >
                  ذخیره کد تخفیف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
