import React from 'react';
import { Package, RefreshCw, Loader2, AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Order } from '../../types';

export interface OrdersTabProps {
  orders: Order[];
  ordersLoading: boolean;
  ordersError: string | null;
  fetchMyOrders: () => void;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({
  orders,
  ordersLoading,
  ordersError,
  fetchMyOrders
}) => {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Package size={18} className="text-blue-600" />
          <span>سوابق سفارش‌های من</span>
        </h2>
        <button 
          onClick={fetchMyOrders} 
          disabled={ordersLoading}
          className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 text-xs flex items-center gap-1 transition-colors"
        >
          <RefreshCw size={13} className={ordersLoading ? 'animate-spin' : ''} />
          <span>بروزرسانی</span>
        </button>
      </div>

      {ordersLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 space-y-3">
          <Loader2 size={32} className="text-blue-600 animate-spin" />
          <p className="text-xs text-slate-500">در حال دریافت سوابق سفارش‌ها...</p>
        </div>
      ) : ordersError ? (
        <div className="p-6 rounded-2xl bg-red-50 border border-red-100 text-center space-y-2">
          <AlertTriangle size={32} className="text-red-500 mx-auto" />
          <p className="text-xs text-red-600">{ordersError}</p>
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm text-center space-y-3 my-8">
          <Package size={44} className="text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">سفارشی ثبت نشده است</h3>
          <p className="text-xs text-slate-500">شما هنوز هیچ سفارشی در این ربات ثبت نکرده‌اید.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((ord) => (
            <div key={ord.id} className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 space-y-3">
              {/* Top Row: ID & Status Badge */}
              <div className="flex items-center justify-between border-b border-slate-50 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-blue-700">#{ord.id}</span>
                  <span className="text-[11px] text-slate-400">
                    {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('fa-IR') : ''}
                  </span>
                </div>

                {ord.status === 'confirmed' && (
                  <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    تایید شده
                  </span>
                )}
                {ord.status === 'pending' && (
                  <span className="bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Clock size={12} />
                    در انتظار بررسی
                  </span>
                )}
                {ord.status === 'rejected' && (
                  <span className="bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <XCircle size={12} />
                    رد شده
                  </span>
                )}
              </div>

              {/* Order Items List */}
              <div className="space-y-1.5 text-xs">
                {(ord.items || []).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-slate-600">
                    <span className="font-medium">{item.name} <span className="text-slate-400">×{item.qty}</span></span>
                    <span className="font-mono text-slate-500">{(item.price * item.qty).toLocaleString('fa-IR')} تومان</span>
                  </div>
                ))}
              </div>

              {/* Total Price Row */}
              <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-xs">
                <span className="text-slate-500">جمع کل سفارش:</span>
                <span className="font-black text-emerald-600 text-sm">
                  {ord.total.toLocaleString('fa-IR')} تومان
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
