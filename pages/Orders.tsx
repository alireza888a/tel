import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { ShoppingCart, Check, X, Clock, User, DollarSign, Calendar, Info, AlertCircle, RefreshCw } from 'lucide-react';
import { Order, Product } from '../types';
import { getDisplayableImageUrl } from '../utils/image';
import { getStoredCredential } from '../services/cloudSync';

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'rejected'>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<number | null>(null);

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

  const getDateRangeCutoff = (range: 'all' | 'today' | 'week' | 'month'): number | undefined => {
    if (range === 'all') return undefined;
    const now = new Date();
    if (range === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return start.getTime();
    }
    if (range === 'week') {
      return now.getTime() - 7 * 24 * 60 * 60 * 1000;
    }
    // month
    return now.getTime() - 30 * 24 * 60 * 60 * 1000;
  };

  const fetchOrdersApi = async (
    statusFilter: 'all' | 'pending' | 'confirmed' | 'rejected',
    range: 'all' | 'today' | 'week' | 'month',
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

    if (beforeCursor) {
      payload.before = beforeCursor;
    }

    const afterCutoff = getDateRangeCutoff(range);
    if (afterCutoff) {
      payload.after = afterCutoff;
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
  }, [filter, dateRange]);

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
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'today', 'week', 'month'] as const).map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all whitespace-nowrap cursor-pointer ${
                dateRange === range
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/10'
                  : 'bg-white/5 text-slate-600 border-black/5 hover:bg-white/10'
              }`}
            >
              {range === 'all' && 'همه‌ی بازه‌ها'}
              {range === 'today' && 'امروز'}
              {range === 'week' && 'هفته‌ی اخیر'}
              {range === 'month' && 'ماه اخیر'}
            </button>
          ))}
        </div>
      </div>

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
              <GlassCard key={order.id} className="relative overflow-hidden flex flex-col justify-between p-4">
                <div>
                  {/* Order Header */}
                  <div className="flex justify-between items-start pb-3 border-b border-black/5 mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
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
                              <div className="text-[11px] text-slate-800 font-medium truncate">{item.name}</div>
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

