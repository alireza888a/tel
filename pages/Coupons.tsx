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
import { syncNow, getStoredCredential } from '../services/cloudSync';
import { GlassCard } from '../components/GlassCard';
import { PersianDatePicker } from '../components/broadcast/PersianDatePicker';
import { formatNumberString, parseNumberString } from '../utils/numberInput';

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
  const [showExpiryDatePicker, setShowExpiryDatePicker] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch usage stats from server
  const fetchUsageStats = async () => {
    setIsLoadingUsage(true);
    try {
      const credential = getStoredCredential();
      if (credential) {
        const res = await fetch('https://corepanel-api.tajikr450.workers.dev/api/coupons/usage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credential)
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
          <h1 className="text-2xl font-bold text-brand-navy flex items-center gap-2">
            <Tag className="text-brand-teal" size={28} />
            مدیریت کدهای تخفیف
          </h1>
          <p className="text-brand-navy/50 text-sm mt-1">
            ایجاد، ویرایش و تنظیم کدهای تخفیف درصدی و نقدی همراه با سقف استفاده و انقضا
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsageStats}
            disabled={isLoadingUsage}
            className="p-2.5 rounded-xl bg-black/[0.03] hover:bg-black/5 text-brand-navy/50 hover:text-brand-navy transition-all border border-black/5 flex items-center gap-2 cursor-pointer text-xs"
            title="به‌روزرسانی آمار استفاده"
          >
            <RefreshCw size={16} className={isLoadingUsage ? 'animate-spin text-blue-600' : ''} />
            <span className="hidden sm:inline">به‌روزرسانی آمار</span>
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2.5 bg-brand-teal hover:bg-brand-teal/90 text-brand-navy font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
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
            <span className="text-xs text-brand-navy/50 block mb-1">کل کدهای تخفیف</span>
            <span className="text-2xl font-bold text-brand-navy font-mono">{totalCoupons}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-teal/10 border border-brand-teal/20 flex items-center justify-center text-brand-teal">
            <Tag size={20} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-brand-navy/50 block mb-1">کدهای فعال</span>
            <span className="text-2xl font-bold text-green-600 font-mono">{activeCoupons}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center text-green-600">
            <CheckCircle2 size={20} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-brand-navy/50 block mb-1">مجموع استفاده‌ها</span>
            <span className="text-2xl font-bold text-brand-orange font-mono">
              {isLoadingUsage ? '...' : totalUsesCount.toLocaleString('fa-IR')}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-amber/10 border border-brand-amber/30 flex items-center justify-center text-brand-orange">
            <Users size={20} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-brand-navy/50 block mb-1">مجموع تخفیف داده‌شده</span>
            <span className="text-xl font-bold text-sky-600 font-mono">
              {isLoadingUsage ? '...' : `${totalDiscountGiven.toLocaleString('fa-IR')} تومان`}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
            <TrendingUp size={20} />
          </div>
        </GlassCard>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-navy/50" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجوی کد تخفیف..."
            className="w-full bg-black/[0.03] border border-black/10 rounded-xl pr-10 pl-4 py-2.5 text-xs text-brand-navy placeholder-brand-navy/40 outline-none focus:border-brand-teal transition-colors font-mono"
          />
        </div>
      </div>

      {/* Coupons List / Grid */}
      {filteredCoupons.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-black/[0.03] border border-black/10 flex items-center justify-center mx-auto mb-4 text-brand-navy/40">
            <Tag size={32} />
          </div>
          <h3 className="text-lg font-bold text-brand-navy mb-1">هیچ کد تخفیفی یافت نشد</h3>
          <p className="text-brand-navy/50 text-xs mb-6 max-w-sm mx-auto">
            {searchTerm ? 'کد تخفیفی با این شناسه پیدا نشد.' : 'هنوز هیچ کد تخفیفی تعریف نکرده‌اید. با کلیک بر روی دکمه زیر نخستین کد را بسازید.'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => handleOpenModal()}
              className="px-5 py-2.5 bg-brand-teal hover:bg-brand-teal/90 text-brand-navy font-bold text-xs rounded-xl shadow-sm transition-all inline-flex items-center gap-2 cursor-pointer"
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
                    ? 'opacity-60 border-black/5'
                    : 'border-black/5 hover:border-brand-teal/40'
                }`}
              >
                <div>
                  {/* Top Bar: Code & Active Toggle */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-extrabold text-blue-600 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-lg tracking-wider">
                        {coupon.code}
                      </span>
                      <button
                        onClick={() => handleCopyCode(coupon.code)}
                        className="p-1.5 text-brand-navy/50 hover:text-brand-navy rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                        title="کپی کد"
                      >
                        {copiedCode === coupon.code ? (
                          <Check size={14} className="text-green-600" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>

                    <button
                      onClick={() => handleToggleActive(coupon.code)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        coupon.active && !isExpired
                          ? 'bg-emerald-500/15 text-green-600 border border-emerald-500/30'
                          : 'bg-red-500/15 text-red-600 border border-red-500/30'
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
                    <div className="text-xl font-bold text-brand-navy flex items-center gap-1.5">
                      {coupon.discountType === 'percent' ? (
                        <>
                          <Percent size={20} className="text-purple-600" />
                          <span>{coupon.discountValue}٪ تخفیف</span>
                        </>
                      ) : (
                        <>
                          <DollarSign size={20} className="text-green-600" />
                          <span>{coupon.discountValue.toLocaleString('fa-IR')} تومان تخفیف</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Info badges */}
                  <div className="space-y-2 text-xs text-brand-navy/70">
                    {/* Usage Stats */}
                    <div className="flex items-center justify-between bg-black/20 p-2.5 rounded-xl border border-black/5">
                      <span className="text-brand-navy/50 text-[11px]">تعداد استفاده:</span>
                      <span className="font-mono font-bold text-brand-navy">
                        {stats.uses} {coupon.maxUses ? `/ ${coupon.maxUses}` : ''} بار
                      </span>
                    </div>

                    {/* Expiration Date */}
                    {coupon.expiresAt && (
                      <div className="flex items-center justify-between bg-black/20 p-2.5 rounded-xl border border-black/5">
                        <span className="text-brand-navy/50 text-[11px] flex items-center gap-1">
                          <Calendar size={12} />
                          تاریخ انقضا:
                        </span>
                        <span className={`font-mono text-[11px] ${isExpired ? 'text-red-500 font-bold' : 'text-brand-navy'}`}>
                          {new Date(coupon.expiresAt).toLocaleDateString('fa-IR')}
                        </span>
                      </div>
                    )}

                    {/* Minimum order requirement */}
                    {coupon.minOrderAmount && (
                      <div className="flex items-center justify-between bg-black/20 p-2.5 rounded-xl border border-black/5">
                        <span className="text-brand-navy/50 text-[11px] flex items-center gap-1">
                          <ShoppingBag size={12} />
                          حداقل خرید:
                        </span>
                        <span className="font-mono text-[11px] text-amber-700">
                          {coupon.minOrderAmount.toLocaleString('fa-IR')} تومان
                        </span>
                      </div>
                    )}

                    {/* Per user limit */}
                    {coupon.perUserLimit && (
                      <div className="flex items-center justify-between bg-black/20 p-2.5 rounded-xl border border-black/5">
                        <span className="text-brand-navy/50 text-[11px] flex items-center gap-1">
                          <Users size={12} />
                          سقف هر کاربر:
                        </span>
                        <span className="font-mono text-[11px] text-sky-700">
                          {coupon.perUserLimit} بار
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-black/5">
                  <button
                    onClick={() => handleOpenModal(coupon)}
                    className="p-2 text-brand-navy/50 hover:text-blue-600 hover:bg-brand-teal/10 rounded-lg transition-colors cursor-pointer"
                    title="ویرایش"
                  >
                    <Edit3 size={16} />
                  </button>

                  <button
                    onClick={() => handleDeleteCoupon(coupon.code)}
                    className="p-2 text-brand-navy/50 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
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
          <div className="bg-white border border-black/5 rounded-2xl shadow-lg w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-black/5 flex items-center justify-between bg-black/[0.02]">
              <h3 className="text-base font-bold text-brand-navy flex items-center gap-2">
                <Tag size={18} className="text-brand-teal" />
                <span>{editingCoupon ? 'ویرایش کد تخفیف' : 'تعریف کد تخفیف جدید'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-brand-navy/50 hover:text-brand-navy p-1 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveCoupon} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {formError && (
                <div className="bg-red-500/15 border border-red-500/30 p-3 rounded-xl text-red-600 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Code Input */}
              <div>
                <label className="block text-xs font-bold text-brand-navy/70 mb-1">
                  کد تخفیف <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="مثلاً: WELCOME50"
                  className="w-full bg-black/[0.03] border border-black/10 rounded-xl px-3.5 py-2.5 text-xs text-brand-navy outline-none focus:border-brand-teal font-mono tracking-wider uppercase"
                />
              </div>

              {/* Discount Type */}
              <div>
                <label className="block text-xs font-bold text-brand-navy/70 mb-1.5">
                  نوع تخفیف
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    onClick={() => setFormType('percent')}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                      formType === 'percent'
                        ? 'bg-purple-50 border-purple-400 text-purple-800'
                        : 'bg-black/[0.02] border-black/10 text-brand-navy/50 hover:border-black/20'
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
                      <span className="block text-[10px] text-brand-navy/50">مثلاً ۱۰٪ کسر از فاکتور</span>
                    </div>
                  </label>

                  <label
                    onClick={() => setFormType('fixed')}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                      formType === 'fixed'
                        ? 'bg-green-50 border-green-400 text-green-800'
                        : 'bg-black/[0.02] border-black/10 text-brand-navy/50 hover:border-black/20'
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
                      <span className="block text-[10px] text-brand-navy/50">مثلاً ۵۰,۰۰۰ تومان کسر</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Value Input */}
              <div>
                <label className="block text-xs font-bold text-brand-navy/70 mb-1">
                  مقدار تخفیف {formType === 'percent' ? '(درصد)' : '(تومان)'} <span className="text-red-600">*</span>
                </label>
                {/* Percent stays a plain number box (a discount is
                    1-100, commas would be meaningless); the Toman amount
                    gets live thousands separators so "50,000" can't be
                    mistyped as "500,000". */}
                <input
                  type="text"
                  inputMode="numeric"
                  value={formType === 'percent' ? formValue : formatNumberString(formValue)}
                  onChange={(e) => setFormValue(parseNumberString(e.target.value))}
                  placeholder={formType === 'percent' ? 'مثلاً: 20' : 'مثلاً: 50,000'}
                  className="w-full bg-black/[0.03] border border-black/10 rounded-xl px-3.5 py-2.5 text-xs text-brand-navy outline-none focus:border-brand-teal font-mono text-right"
                  dir="ltr"
                />
              </div>

              {/* Minimum order amount */}
              <div>
                <label className="block text-xs font-medium text-brand-navy/60 mb-1">
                  حداقل مبلغ سفارش به تومان (اختیاری)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatNumberString(formMinOrderAmount)}
                  onChange={(e) => setFormMinOrderAmount(parseNumberString(e.target.value))}
                  placeholder="خالی بگذارید یعنی بدون حد کف سفارش"
                  className="w-full bg-black/[0.03] border border-black/10 rounded-xl px-3.5 py-2.5 text-xs text-brand-navy outline-none focus:border-brand-teal font-mono text-right"
                  dir="ltr"
                />
              </div>

              {/* Usage limits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-brand-navy/60 mb-1">
                    سقف کل استفاده (اختیاری)
                  </label>
                  <input
                    type="number"
                    value={formMaxUses}
                    onChange={(e) => setFormMaxUses(e.target.value)}
                    placeholder="مثلاً: 100"
                    min="1"
                    className="w-full bg-black/[0.03] border border-black/10 rounded-xl px-3.5 py-2.5 text-xs text-brand-navy outline-none focus:border-brand-teal font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-navy/60 mb-1">
                    سقف هر کاربر (اختیاری)
                  </label>
                  <input
                    type="number"
                    value={formPerUserLimit}
                    onChange={(e) => setFormPerUserLimit(e.target.value)}
                    placeholder="مثلاً: 1 (فقط یکبار)"
                    min="1"
                    className="w-full bg-black/[0.03] border border-black/10 rounded-xl px-3.5 py-2.5 text-xs text-brand-navy outline-none focus:border-brand-teal font-mono"
                  />
                </div>
              </div>

              {/* Expiration date */}
              <div>
                <label className="block text-xs font-medium text-brand-navy/60 mb-1">
                  تاریخ انقضا (اختیاری)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowExpiryDatePicker(true)}
                    className="flex-1 bg-black/[0.03] border border-black/10 rounded-xl px-3.5 py-2.5 text-xs text-brand-navy outline-none focus:border-brand-teal text-right hover:border-brand-teal/50 transition-colors"
                  >
                    {formExpiresDate
                      ? new Date(formExpiresDate + 'T00:00:00').toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })
                      : <span className="text-brand-navy/40">بدون انقضا (کلیک برای انتخاب)</span>}
                  </button>
                  {formExpiresDate && (
                    <button
                      type="button"
                      onClick={() => setFormExpiresDate('')}
                      className="px-3 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/20 text-xs font-medium transition-colors cursor-pointer"
                      title="حذف تاریخ انقضا"
                    >
                      حذف
                    </button>
                  )}
                </div>
              </div>

              {/* Active Checkbox */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-teal bg-black/[0.03] border-black/20 focus:ring-0"
                  />
                  <span className="text-xs text-brand-navy/70">این کد تخفیف فعال باشد</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-black/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-black/5 hover:bg-black/10 text-brand-navy/70 text-xs font-medium transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brand-teal hover:bg-brand-teal/90 text-white text-xs font-bold transition-all shadow-sm"
                >
                  ذخیره کد تخفیف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Persian Date Picker for Coupon Expiry */}
      <PersianDatePicker
        isOpen={showExpiryDatePicker}
        onClose={() => setShowExpiryDatePicker(false)}
        initialDate={formExpiresDate ? new Date(formExpiresDate + 'T00:00:00') : new Date()}
        onSelect={(d) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          setFormExpiresDate(`${y}-${m}-${day}`);
          setShowExpiryDatePicker(false);
        }}
      />
    </div>
  );
};
