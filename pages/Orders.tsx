import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { ShoppingCart, Check, X, Clock, User, DollarSign, Calendar, Info, AlertCircle, RefreshCw } from 'lucide-react';
import { Order, Product } from '../types';
import { getDisplayableImageUrl } from '../utils/image';
import { getStoredCredential } from '../services/cloudSync';
import { PersianDatePicker } from '../components/broadcast/PersianDatePicker';
import { gregorianToJalali, MONTH_NAMES } from '../utils/jalaliCalendar';
import { Search, CalendarDays } from 'lucide-react';

type DateRange = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'rejected'>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  // A specific Jalali day picked by the merchant ("چه روزی چقدر فروختم؟").
  // Held as a plain Date at local midnight; the request turns it into a
  // start/end pair so only that one calendar day comes back.
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  // Buyer/order search. Debounced below so typing a name doesn't fire a
  // request per keystroke.
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  // Bulk confirm/reject — only pending orders are selectable, since that's
  // the only status this action makes sense on.
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const [products] = useState<Product[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('bot_products') || '[]');
    } catch {
      return [];
    }
  });

  const getProductImage = (productId: string): string | null => {
    const product = products.find(p => p.id === productId);
    if (!product) return null;
    return getDisplayableImageUrl(product.imageUrl);
  };

  // Returns the {after, before} window for a range. `before` is only set
  // for the day-bounded ranges (yesterday / a specific date), where an
  // upper bound is what makes it a single day rather than "since then".
  const getDateWindow = (range: DateRange): { after?: number; before?: number } => {
    if (range === 'all') return {};
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    if (range === 'today') return { after: startOfToday };
    if (range === 'yesterday') return { after: startOfToday - dayMs, before: startOfToday };
    if (range === 'week') return { after: now.getTime() - 7 * dayMs };
    if (range === 'month') return { after: now.getTime() - 30 * dayMs };
    if (range === 'custom' && customDate) {
      const start = new Date(customDate.getFullYear(), customDate.getMonth(), customDate.getDate()).getTime();
      return { after: start, before: start + dayMs };
    }
    return {};
  };

  const formatJalaliDay = (d: Date): string => {
    const { jy, jm, jd } = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return `${jd.toLocaleString('fa-IR')} ${MONTH_NAMES[jm - 1]} ${jy.toLocaleString('fa-IR')}`;
  };

  const fetchOrdersApi = async (
    statusFilter: 'all' | 'pending' | 'confirmed' | 'rejected',
    range: DateRange,
    beforeCursor?: number | null
  ) => {
    const credential = getStoredCredential();
    if (!credential) return { ok: false, reason: 'missing_fields' };
    const payload: any = {
      ...credential,
      limit: 30
    };

    if (statusFilter !== 'all') {
      payload.status = statusFilter;
    }

    const window = getDateWindow(range);
    if (window.after) payload.after = window.after;
    // A pagination cursor always wins over the range's own upper bound —
    // it's necessarily inside that window already (it's the createdAt of
    // the oldest row on the previous page), so it narrows correctly
    // instead of re-fetching from the top of the day.
    if (beforeCursor) {
      payload.before = beforeCursor;
    } else if (window.before) {
      payload.before = window.before;
    }

    if (searchQuery.trim()) {
      payload.search = searchQuery.trim();
    }

    const res = await fetch('https://corepanel-api.tajikr450.workers.dev/api/orders/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return await res.json();
  };

  const refreshOrders = async () => {
    setIsRefreshing(true);
    try {
      const result = await fetchOrdersApi(filter, dateRange);
      if (result.ok) {
        setOrders(result.orders || []);
        setHasMore(!!result.hasMore);
        setNextBefore(result.nextBefore ?? null);
      } else {
        alert('خطا در دریافت سفارش‌ها: ' + (result.reason || 'نامشخص'));
      }
    } catch (e) {
      console.error('Error fetching orders:', e);
      alert('خطا در ارتباط با سرور هنگام دریافت سفارش‌ها.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextBefore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const result = await fetchOrdersApi(filter, dateRange, nextBefore);
      if (result.ok) {
        setOrders(prev => [...prev, ...(result.orders || [])]);
        setHasMore(!!result.hasMore);
        setNextBefore(result.nextBefore ?? null);
      } else {
        alert('خطا در دریافت ادامه سفارش‌ها: ' + (result.reason || 'نامشخص'));
      }
    } catch (e) {
      console.error('Error loading more orders:', e);
      alert('خطا در دریافت ادامه سفارش‌ها.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    refreshOrders();
  }, [filter, dateRange, customDate, searchQuery]);

  // Debounce the search box so each keystroke doesn't hit the API.
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 450);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleConfirmOrder = async (orderId: string) => {
    const credential = getStoredCredential();
    if (!credential) return;

    try {
      const res = await fetch('https://corepanel-api.tajikr450.workers.dev/api/order/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credential, orderId })
      });
      const result = await res.json();

      if (result.ok) {
        alert('سفارش با موفقیت تایید شد و پیام اطلاع‌رسانی به خریدار ارسال گردید.');
      } else {
        alert('خطا در تایید سفارش: ' + (result.reason || 'نامشخص'));
      }
    } catch (e) {
      console.error(e);
      alert('خطا در ارتباط با سرور هنگام تایید سفارش.');
    }

    await refreshOrders();
  };

  const handleRejectOrder = async (orderId: string) => {
    const credential = getStoredCredential();
    if (!credential) return;

    try {
      const res = await fetch('https://corepanel-api.tajikr450.workers.dev/api/order/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credential, orderId })
      });
      const result = await res.json();

      if (result.ok) {
        alert('سفارش رد شد و پیام اطلاع‌رسانی به خریدار ارسال گردید.');
      } else {
        alert('خطا در رد سفارش: ' + (result.reason || 'نامشخص'));
      }
    } catch (e) {
      console.error(e);
      alert('خطا در ارتباط با سرور هنگام رد سفارش.');
    }

    await refreshOrders();
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId); else next.add(orderId);
      return next;
    });
  };

  const pendingOrderIds = orders.filter(o => o.status === 'pending').map(o => o.id);
  const allPendingSelected = pendingOrderIds.length > 0 && pendingOrderIds.every(id => selectedOrderIds.has(id));

  const toggleSelectAllPending = () => {
    setSelectedOrderIds(allPendingSelected ? new Set() : new Set(pendingOrderIds));
  };

  // Confirms/rejects every selected order one call at a time (not
  // Promise.all) — these endpoints share the same public rate limiter as
  // the buyer-facing checkout routes, and firing a dozen+ requests at once
  // from one IP risks tripping it partway through a batch. A small delay
  // between calls keeps a large selection reliable at the cost of being a
  // bit slower than instantaneous.
  const handleBulkAction = async (action: 'confirm' | 'reject') => {
    const ids = [...selectedOrderIds];
    if (ids.length === 0) return;

    const verb = action === 'confirm' ? 'تایید' : 'رد';
    if (!window.confirm(`آیا از ${verb} گروهی ${ids.length.toLocaleString('fa-IR')} سفارش مطمئن هستید؟`)) return;

    const credential = getStoredCredential();
    if (!credential) return;

    setBulkProcessing(true);
    let succeeded = 0;
    let failed = 0;

    for (const orderId of ids) {
      try {
        const res = await fetch(`https://corepanel-api.tajikr450.workers.dev/api/order/${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...credential, orderId })
        });
        const result = await res.json();
        if (result.ok) succeeded++; else failed++;
      } catch (e) {
        failed++;
      }
      // Small stagger between requests — see note above.
      await new Promise(r => setTimeout(r, 200));
    }

    setBulkProcessing(false);
    setSelectedOrderIds(new Set());
    alert(
      failed === 0
        ? `${succeeded.toLocaleString('fa-IR')} سفارش با موفقیت ${verb} شد.`
        : `${succeeded.toLocaleString('fa-IR')} سفارش ${verb} شد، ${failed.toLocaleString('fa-IR')} مورد با خطا مواجه شد.`
    );
    await refreshOrders();
  };

  // Helper to format date in Persian friendly format
  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-10">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="text-[#3b82f6]" />
            مدیریت سفارش‌ها و فیش‌های دریافتی
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            سفارش‌های ثبت شده توسط مشتریان ربات را بررسی و وضعیت پرداخت آن‌ها را تعیین کنید.
          </p>
        </div>
        <button
          onClick={refreshOrders}
          disabled={isRefreshing}
          className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 border border-blue-500/20 px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          <span>بروزرسانی سفارش‌ها</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'pending', 'confirmed', 'rejected'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all whitespace-nowrap cursor-pointer ${
                filter === tab
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/10'
                  : 'bg-white/5 text-slate-600 border-black/5 hover:bg-white/10'
              }`}
            >
              {tab === 'all' && 'همه سفارش‌ها'}
              {tab === 'pending' && 'در انتظار بررسی ⏳'}
              {tab === 'confirmed' && 'تایید شده ✅'}
              {tab === 'rejected' && 'رد شده ❌'}
            </button>
          ))}
        </div>

        {/* Date Range Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 items-center">
          {(['all', 'today', 'yesterday', 'week', 'month'] as const).map(range => (
            <button
              key={range}
              onClick={() => { setDateRange(range); setCustomDate(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all whitespace-nowrap cursor-pointer ${
                dateRange === range
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/10'
                  : 'bg-white/5 text-slate-600 border-black/5 hover:bg-white/10'
              }`}
            >
              {range === 'all' && 'همه‌ی بازه‌ها'}
              {range === 'today' && 'امروز'}
              {range === 'yesterday' && 'دیروز'}
              {range === 'week' && 'هفته‌ی اخیر'}
              {range === 'month' && 'ماه اخیر'}
            </button>
          ))}

          {/* Specific-day lookup — "چه روزی چقدر فروختم؟" */}
          <button
            onClick={() => setShowDatePicker(true)}
            className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              dateRange === 'custom'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/10'
                : 'bg-white/5 text-slate-600 border-black/5 hover:bg-white/10'
            }`}
          >
            <CalendarDays size={14} />
            {dateRange === 'custom' && customDate ? formatJalaliDay(customDate) : 'یک روز خاص'}
          </button>
        </div>

        {/* Buyer / order search */}
        <div className="relative">
          <Search size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-slate-400 pointer-events-none" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="جستجوی خریدار (نام یا آیدی عددی) یا شماره سفارش..."
            className="w-full bg-white border border-black/10 rounded-xl pr-10 pl-3 py-2.5 text-xs text-brand-navy outline-none focus:border-blue-500 transition-colors"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 hover:text-slate-700 transition-colors"
              title="پاک کردن جستجو"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      <PersianDatePicker
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        initialDate={customDate || new Date()}
        dateOnly
        onSelect={(d) => { setCustomDate(d); setDateRange('custom'); }}
      />

      {/* Summary of whatever is currently filtered — this is the actual
          question behind picking a day or searching a customer ("چقدر
          فروختم؟"), so answer it inline instead of making them add the
          cards up by eye. Revenue counts confirmed orders only, matching
          how the dashboard and the bot's own /admin stats define it. */}
      {orders && orders.length > 0 && (dateRange !== 'all' || searchQuery.trim()) && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-xs">
          <span className="text-brand-navy/60">
            نمایش <b className="text-brand-navy">{orders.length.toLocaleString('fa-IR')}</b> سفارش
            {hasMore && <span className="text-brand-navy/40"> (بارگذاری بیشتر برای دیدن بقیه)</span>}
          </span>
          <span className="text-brand-navy/60">
            تایید شده: <b className="text-emerald-700">{orders.filter(o => o.status === 'confirmed').length.toLocaleString('fa-IR')}</b>
          </span>
          <span className="text-brand-navy/60">
            جمع فروش تایید شده:{' '}
            <b className="text-emerald-700">
              {orders.filter(o => o.status === 'confirmed').reduce((s, o) => s + (o.total || 0), 0).toLocaleString('fa-IR')} تومان
            </b>
          </span>
        </div>
      )}

      {/* Bulk confirm/reject bar — only appears once at least one pending
          order is selected, so it never crowds the screen for someone who
          just wants to browse. */}
      {pendingOrderIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2.5 px-4 py-2.5 bg-blue-500/5 border border-blue-500/20 rounded-xl">
          <button
            onClick={toggleSelectAllPending}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors"
          >
            {allPendingSelected ? '✕ لغو انتخاب همه' : `☑ انتخاب همه‌ی در انتظار (${pendingOrderIds.length.toLocaleString('fa-IR')})`}
          </button>
          {selectedOrderIds.size > 0 && (
            <>
              <span className="text-xs text-brand-navy/50">{selectedOrderIds.size.toLocaleString('fa-IR')} سفارش انتخاب شده</span>
              <div className="flex items-center gap-2 mr-auto">
                <button
                  onClick={() => handleBulkAction('confirm')}
                  disabled={bulkProcessing}
                  className="px-3.5 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {bulkProcessing ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>تایید گروهی</span>
                </button>
                <button
                  onClick={() => handleBulkAction('reject')}
                  disabled={bulkProcessing}
                  className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/20 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <X size={13} />
                  <span>رد گروهی</span>
                </button>
                <button
                  onClick={() => setSelectedOrderIds(new Set())}
                  disabled={bulkProcessing}
                  className="px-2 py-1.5 text-brand-navy/40 hover:text-brand-navy text-xs transition-colors"
                >
                  انصراف
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {!orders || orders.length === 0 ? (
        <div className="bg-white/5 border-2 border-dashed border-white/10 rounded-2xl p-12 text-center flex flex-col items-center gap-4">
          <ShoppingCart size={64} className="text-slate-400 opacity-40 animate-pulse" />
          <h3 className="text-lg font-bold text-slate-700">هیچ سفارشی یافت نشد</h3>
          <p className="text-slate-400 max-w-md text-sm">
            لیست سفارش‌های مربوط به این وضعیت خالی است.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            {orders.map(order => (
              <GlassCard key={order.id} className={`relative overflow-hidden flex flex-col justify-between p-4 ${selectedOrderIds.has(order.id) ? 'ring-2 ring-blue-400' : ''}`}>
                <div>
                  {/* Order Header */}
                  <div className="flex justify-between items-start pb-3 border-b border-black/5 mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {order.status === 'pending' && (
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.has(order.id)}
                            onChange={() => toggleOrderSelection(order.id)}
                            className="w-4 h-4 rounded accent-blue-600 cursor-pointer shrink-0"
                            title="انتخاب برای عملیات گروهی"
                          />
                        )}
                        <span className="font-bold text-sm text-slate-800">سفارش #{order.id.slice(-6)}</span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            order.status === 'confirmed'
                              ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                              : order.status === 'rejected'
                              ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                              : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                          }`}
                        >
                          {order.status === 'confirmed' && 'تایید شده'}
                          {order.status === 'rejected' && 'رد شده'}
                          {order.status === 'pending' && 'در انتظار تایید فیش'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <Calendar size={12} />
                        <span>{formatDateTime(order.createdAt)}</span>
                      </div>
                    </div>

                    <div className="text-left">
                      <div className="flex items-center gap-1.5 text-blue-500 font-bold text-base" dir="ltr">
                        <span>{order.total.toLocaleString('fa-IR')}</span>
                        <span className="text-[10px]">تومان</span>
                      </div>
                    </div>
                  </div>

                  {/* User details */}
                  <div className="bg-white/5 rounded-xl p-2.5 mb-3 space-y-1.5 border border-white/5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-1"><User size={14} /> خریدار:</span>
                      <span className="text-slate-800 font-medium">{order.userFirstName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">شناسه عددی تلگرام:</span>
                      <span className="font-mono text-[11px] text-slate-700">{order.userId}</span>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-400 mb-1.5">لیست اقلام سفارش:</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(order.items || []).map((item, idx) => {
                        const imgUrl = getProductImage(item.productId);
                        return (
                          <div
                            key={idx}
                            className="bg-black/10 rounded-xl overflow-hidden border border-black/5"
                          >
                            <div className="h-20 bg-slate-900/40 flex items-center justify-center overflow-hidden">
                              {imgUrl ? (
                                <img src={imgUrl} alt={item.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xl text-slate-600">📦</span>
                              )}
                            </div>
                            <div className="p-2 text-center">
                              <div className="text-[11px] text-slate-800 font-medium truncate">
                                {item.name}{item.variantName ? ' (' + item.variantName + ')' : ''}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                ×{item.qty} — {(item.price * item.qty).toLocaleString('fa-IR')} تومان
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fulfillment / Extra Info */}
                  {order.fulfillment && (
                    (() => {
                      let items: { q: string; a: string }[] = [];
                      if (Array.isArray(order.fulfillment)) {
                        items = order.fulfillment
                          .map(item => ({
                            q: item.q || item.question || '',
                            a: item.a || item.answer || ''
                          }))
                          .filter(item => item.q || item.a);
                      } else if (typeof order.fulfillment === 'object') {
                        items = Object.entries(order.fulfillment).map(([key, val]) => ({
                          q: key,
                          a: String(val)
                        }));
                      }

                      if (items.length === 0) return null;

                      return (
                        <div className="mt-3 bg-blue-500/5 border border-blue-500/10 rounded-xl p-2.5 space-y-1.5 text-xs">
                          <h4 className="font-bold text-blue-400 flex items-center gap-1.5">
                            <span>📋 اطلاعات تکمیلی</span>
                          </h4>
                          <div className="space-y-1.5">
                            {items.map((item, idx) => (
                              <div key={idx} className="flex flex-col sm:flex-row justify-between bg-black/10 p-2 rounded-lg gap-1">
                                <span className="text-slate-400 font-medium">{item.q}:</span>
                                <span className="text-slate-800 font-semibold">{item.a}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>

                {/* Order Actions */}
                {order.status === 'pending' && (
                  <div className="mt-4 pt-3 border-t border-black/5 flex gap-2.5">
                    <button
                      onClick={() => handleConfirmOrder(order.id)}
                      className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-green-600/10 transition-all cursor-pointer"
                    >
                      <Check size={16} />
                      تایید پرداخت و فعال‌سازی
                    </button>
                    <button
                      onClick={() => handleRejectOrder(order.id)}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <X size={16} />
                      رد پرداخت
                    </button>
                  </div>
                )}
              </GlassCard>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isLoadingMore && <RefreshCw size={14} className="animate-spin" />}
                <span>نمایش سفارش‌های قدیمی‌تر</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

