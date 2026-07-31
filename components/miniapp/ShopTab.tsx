import React, { useState } from 'react';
import { ShoppingBag, Plus, Minus, AlertTriangle, Loader2, Share2, Search, X } from 'lucide-react';
import { Product } from '../../types';
import { ProductImageSlider } from './ProductImageSlider';
import { getDisplayableImageUrl } from '../../utils/image';

export interface ShopTabProps {
  loading: boolean;
  error: string | null;
  shopEnabled: boolean;
  products: Product[];
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  cartState: Record<string, number>;
  updateQty: (productId: string, delta: number) => void;
  /** Live stock counts from D1, keyed by productId. Only meaningful for products with trackStock=true. */
  stockLevels?: Record<string, number>;
  /** Real rendered height (px) of the page header, so the category bar sticks right under it. */
  stickyTop?: number;
  /** Shop's license code — needed only to lazily resolve the bot's username for product deep links when sharing. */
  code: string;
}

export const ShopTab: React.FC<ShopTabProps> = ({
  loading,
  error,
  shopEnabled,
  products,
  categories,
  selectedCategory,
  setSelectedCategory,
  cartState,
  updateQty,
  stockLevels = {},
  stickyTop = 0,
  code
}) => {
  // Local search — filters within the currently selected category (combined, not a replacement
  // for it) across name, description and category. Purely client-side: no new server request,
  // no D1 query, zero added Cloudflare usage — the catalog is already loaded in the browser.
  const [searchQuery, setSearchQuery] = useState('');
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredProducts = products.filter(p => {
    const inCategory = selectedCategory === 'همه' || ((p.category || '').trim() || 'عمومی') === selectedCategory;
    if (!inCategory) return false;
    if (!normalizedQuery) return true;
    const haystack = `${p.name} ${p.description || ''} ${p.category || ''}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  // Wraps updateQty with Telegram's native haptic feedback for a more "app-like" tap feel.
  const tapQty = (productId: string, delta: number) => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(delta > 0 ? 'light' : 'soft');
    updateQty(productId, delta);
  };

  // Bot username cache — resolved lazily (only the first time someone actually
  // taps "share", not on every shop load) so product deep links don't add
  // latency to opening the store. Falls back to sharing the plain shop URL
  // if it can't be resolved for any reason.
  const [botUsername, setBotUsername] = React.useState<string | null>(null);
  const usernameFetchStarted = React.useRef(false);

  const resolveBotUsername = async (): Promise<string | null> => {
    if (botUsername) return botUsername;
    if (usernameFetchStarted.current) return null;
    usernameFetchStarted.current = true;
    try {
      const res = await fetch(`https://corepanel-api.tajikr450.workers.dev/api/shop/${encodeURIComponent(code)}/bot-username`);
      const result = await res.json();
      if (result.ok && result.username) {
        setBotUsername(result.username);
        return result.username;
      }
    } catch (e) {
      console.warn('bot-username fetch error:', e);
    }
    return null;
  };

  // Shares a product to a chat the user picks, via Telegram's native share sheet.
  // Links directly to the product (t.me/<bot>?start=product_<id>) when the bot's
  // username is available, so opening the link jumps straight to that product
  // instead of the shop's front page. Falls back to the current shop URL
  // (still fully functional) if the username couldn't be resolved.
  const shareProductToChat = async (p: Product) => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');
    const username = await resolveBotUsername();
    const targetUrl = username
      ? `https://t.me/${username}?start=product_${p.id}`
      : window.location.href;
    const caption = `🛍️ ${p.name}\n💰 ${p.price.toLocaleString('fa-IR')} تومان\n\nمشاهده و خرید:`;
    const shareLink = `https://t.me/share/url?url=${encodeURIComponent(targetUrl)}&text=${encodeURIComponent(caption)}`;

    const webApp = window.Telegram?.WebApp;
    if (webApp?.openTelegramLink) {
      webApp.openTelegramLink(shareLink);
    } else if (navigator.share) {
      // Fallback for testing outside Telegram (regular mobile browser)
      navigator.share({ title: p.name, text: caption, url: targetUrl }).catch(() => {});
    } else {
      window.open(shareLink, '_blank');
    }
  };

  // Shares the product photo directly to the user's Telegram story, with a link sticker
  // back to the shop. Requires a public https image (not a local/base64 image) and a
  // Telegram client recent enough to support shareToStory — both are feature-detected below.
  const shareProductToStory = async (p: Product) => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp?.shareToStory) return;
    const firstImage = p.imageUrls?.find(u => u && u.trim()) || p.imageUrl;
    const displayUrl = getDisplayableImageUrl(firstImage);
    if (!displayUrl || displayUrl.startsWith('data:')) return;

    webApp.HapticFeedback?.impactOccurred?.('light');
    const username = await resolveBotUsername();
    const targetUrl = username ? `https://t.me/${username}?start=product_${p.id}` : window.location.href;
    webApp.shareToStory(displayUrl, {
      text: `${p.name} — ${p.price.toLocaleString('fa-IR')} تومان`,
      widget_link: { url: targetUrl, name: 'مشاهده در فروشگاه' }
    });
  };

  // A product is eligible for story-sharing only when we have a real public image URL
  // and the current Telegram client actually exposes shareToStory.
  const canShareToStory = (p: Product) => {
    if (!window.Telegram?.WebApp?.shareToStory) return false;
    const firstImage = p.imageUrls?.find(u => u && u.trim()) || p.imageUrl;
    const displayUrl = getDisplayableImageUrl(firstImage);
    return !!displayUrl && !displayUrl.startsWith('data:');
  };

  // Shared stock math, used by both the main grid and the "newest arrivals" strip below.
  const getStockInfo = (p: Product) => {
    const isTracked = !!p.trackStock;
    const available = isTracked ? Math.max(0, stockLevels[p.id] ?? 0) : Infinity;
    return {
      outOfStock: isTracked && available <= 0,
      atMax: isTracked && (cartState[p.id] || 0) >= available,
      lowStock: isTracked && available > 0 && available <= 5,
      available
    };
  };

  // How many products live in each category, so the person can tell what's inside before tapping
  // (e.g. "میز عسلی (۶)") instead of a blind list of category names.
  const categoryCounts: Record<string, number> = { 'همه': products.length };
  for (const p of products) {
    const cat = (p.category || '').trim() || 'عمومی';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  // "Newest arrivals" teaser — the last few products in catalog order, shown up top so a
  // first-time visitor immediately sees something curated instead of a wall to scroll through.
  // Uses existing data only (no new admin field required): assumes products are appended in
  // creation order, so the tail of the array is the most recently added.
  const newestProducts = products.length > 4 ? [...products].slice(-6).reverse() : [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-3">
        <Loader2 size={36} className="text-blue-500 animate-spin" />
        <p className="text-sm text-slate-400">در حال دریافت کاتالوگ محصولات...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-10 p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-center space-y-3">
        <AlertTriangle size={36} className="text-red-400 mx-auto" />
        <h3 className="text-base font-bold text-red-300">خطا در بارگیری</h3>
        <p className="text-xs text-slate-300 leading-relaxed">{error}</p>
      </div>
    );
  }

  if (!shopEnabled) {
    return (
      <div className="my-12 p-8 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-2xl">
          🛑
        </div>
        <h2 className="text-lg font-bold text-amber-300">فروشگاه غیرفعال است</h2>
        <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
          فروشگاه در حال حاضر غیرفعال است. جهت اطلاع از وضعیت با مدیریت ربات تماس بگیرید.
        </p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="my-12 p-8 rounded-3xl bg-white/5 border border-white/10 text-center space-y-3">
        <ShoppingBag size={40} className="text-slate-500 mx-auto" />
        <h3 className="text-sm font-bold text-slate-300">محصولی یافت نشد</h3>
        <p className="text-xs text-slate-400">هیچ محصولی در کاتالوگ فروشگاه قرار ندارد.</p>
      </div>
    );
  }

  return (
    <>
      {/* Search — filters the grid below in real time, no server round-trip */}
      <div className="relative mb-3">
        <Search size={15} className="absolute top-1/2 -translate-y-1/2 right-3 text-slate-500 pointer-events-none" />
        <input
          type="text"
          inputMode="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="جستجو در محصولات..."
          className="w-full bg-[#151c2c]/80 border border-white/10 rounded-xl py-2.5 pr-9 pl-9 text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500/50 transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-500 hover:text-white transition-colors"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Newest arrivals — quick horizontal teaser shown once, above the sticky category bar.
          Hidden while actively searching, since it's just noise once the person is filtering. */}
      {newestProducts.length > 0 && selectedCategory === 'همه' && !normalizedQuery && (
        <div className="mb-4">
          <h2 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
            ✨ <span>جدیدترین محصولات</span>
          </h2>
          <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
            {newestProducts.map((p) => {
              const { outOfStock } = getStockInfo(p);
              const img = getDisplayableImageUrl(p.imageUrls?.find(u => u && u.trim()) || p.imageUrl);
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedCategory((p.category || '').trim() || 'عمومی')}
                  className="w-28 shrink-0 text-right bg-[#151c2c]/80 border border-white/10 rounded-xl overflow-hidden active:scale-95 transition-all"
                >
                  <div className={`w-full aspect-square bg-black/40 flex items-center justify-center ${outOfStock ? 'grayscale opacity-50' : ''}`}>
                    {img ? (
                      <img src={img} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBag size={20} className="text-blue-400/50" />
                    )}
                  </div>
                  <div className="p-1.5">
                    <div className="text-[10px] text-white line-clamp-1 font-medium">{p.name}</div>
                    <div className="text-[10px] text-emerald-400 font-bold mt-0.5">
                      {p.price.toLocaleString('fa-IR')} <span className="text-slate-500 font-normal">تومان</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Categories filter tabs — sticky right under the header, with a per-category product
          count, so store structure (e.g. ناهارخوری / میز عسلی / سرویس خواب) stays visible
          and tappable no matter how far the person has scrolled into the grid. */}
      {categories.length > 2 && (
        <div
          className="sticky z-20 -mx-4 px-4 bg-[#0e131f]/95 backdrop-blur-md flex items-center gap-2 overflow-x-auto py-2.5 mb-2 no-scrollbar border-b border-white/5"
          style={{ top: `${stickyTop}px` }}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border shrink-0 flex items-center gap-1 ${
                selectedCategory === cat
                  ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{cat}</span>
              <span className={selectedCategory === cat ? 'text-blue-100/80' : 'text-slate-500'}>
                ({(categoryCounts[cat] || 0).toLocaleString('fa-IR')})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="my-10 p-6 rounded-2xl bg-white/5 border border-white/10 text-center space-y-2">
          <Search size={28} className="text-slate-500 mx-auto" />
          <p className="text-xs text-slate-400">
            {normalizedQuery ? `چیزی برای «${searchQuery}» پیدا نشد.` : 'محصولی تو این دسته پیدا نشد.'}
          </p>
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {filteredProducts.map((p) => {
          const qty = cartState[p.id] || 0;
          const { available, outOfStock, atMax, lowStock } = getStockInfo(p);

          return (
            <div
              key={p.id}
              className={`bg-[#151c2c]/80 border rounded-2xl p-3.5 flex flex-col justify-between transition-all backdrop-blur-sm ${
                outOfStock
                  ? 'border-white/5 opacity-60'
                  : qty > 0
                  ? 'border-blue-500/50 ring-1 ring-blue-500/30 shadow-lg shadow-blue-600/10'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div>
                {/* Product Image Slider */}
                <ProductImageSlider product={p} outOfStock={outOfStock} />

                {/* Title & Price */}
                <div className="flex items-start justify-between gap-1.5 mb-1">
                  <h3 className="text-sm font-bold text-white line-clamp-1 flex-1">{p.name}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    {canShareToStory(p) && (
                      <button
                        type="button"
                        onClick={() => shareProductToStory(p)}
                        title="اشتراک‌گذاری در استوری"
                        className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors active:scale-90"
                      >
                        <div className="w-2.5 h-2.5 rounded-full border-2 border-current" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => shareProductToChat(p)}
                      title="اشتراک‌گذاری در چت"
                      className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors active:scale-90"
                    >
                      <Share2 size={12} />
                    </button>
                  </div>
                </div>
                {p.description && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                    {p.description}
                  </p>
                )}
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-black text-emerald-400 dir-rtl">
                    {p.price.toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-slate-400">تومان</span>
                  </div>
                  {lowStock && (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      فقط {available.toLocaleString('fa-IR')} عدد باقی مانده
                    </span>
                  )}
                </div>
              </div>

              {/* Quantity Control Buttons */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                {outOfStock ? (
                  <button
                    disabled
                    className="w-full py-2 bg-white/5 border border-white/10 text-slate-500 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-not-allowed"
                  >
                    <span>ناموجود</span>
                  </button>
                ) : qty === 0 ? (
                  <button
                    onClick={() => tapQty(p.id, 1)}
                    className="w-full py-2 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 hover:border-blue-500 text-blue-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                  >
                    <Plus size={14} />
                    <span>افزودن به سبد</span>
                  </button>
                ) : (
                  <div className="w-full flex items-center justify-between bg-blue-600/10 border border-blue-500/30 rounded-xl p-1">
                    <button
                      onClick={() => tapQty(p.id, -1)}
                      className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white flex items-center justify-center transition-colors active:scale-95"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-black text-white px-2 font-mono">{qty}</span>
                    <button
                      onClick={() => tapQty(p.id, 1)}
                      disabled={atMax}
                      className="w-8 h-8 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white flex items-center justify-center transition-colors active:scale-95 disabled:opacity-30 disabled:hover:bg-emerald-500/20 disabled:cursor-not-allowed"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </>
  );
};
