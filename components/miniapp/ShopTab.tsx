import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Minus, AlertTriangle, Loader2, Share2, Search, X, Heart, Grid3x3 } from 'lucide-react';
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
  /** Keyed by cart key: a plain productId, or "productId::variantId" for a
   *  specific variant. */
  cartState: Record<string, number>;
  /** cartKey is a plain productId, or "productId::variantId" for a variant. */
  updateQty: (cartKey: string, delta: number) => void;
  /** Live stock counts from D1. Keyed the same way as cartState — plain
   *  productId for a variant-less trackStock product, "productId::variantId"
   *  for one variant's own stock. */
  stockLevels?: Record<string, number>;
  /** Real rendered height (px) of the page header, so the category bar sticks right under it. */
  stickyTop?: number;
  /** Shop's license code — needed only to lazily resolve the bot's username for product deep links when sharing, and to namespace the wishlist in localStorage per shop. */
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

  // Wishlist ("علاقه‌مندی‌ها") — a lightweight, client-only favorites list. Kept
  // entirely local to this tab (not lifted into MiniShop's own state, not
  // synced to the server) since it's purely a per-device browsing aid, the
  // same way a phone's own "saved items" would work — nothing here needs
  // to survive a device change or show up in the admin panel. Namespaced
  // by `code` so switching between shops (rare, but possible in testing)
  // never mixes favorites across two different stores.
  const wishlistKey = `miniapp_wishlist_${code}`;
  const [wishlist, setWishlist] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(wishlistKey);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);
  // Which product's variant picker (رنگ/سایز) is currently expanded inline
  // in its card — at most one at a time, closed by default.
  const [expandedVariantProduct, setExpandedVariantProduct] = useState<string | null>(null);

  useEffect(() => {
    try { localStorage.setItem(wishlistKey, JSON.stringify([...wishlist])); } catch {}
  }, [wishlist, wishlistKey]);

  const toggleWishlist = (productId: string) => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light');
    setWishlist(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId); else next.add(productId);
      return next;
    });
  };

  const filteredProducts = products.filter(p => {
    if (showWishlistOnly) return wishlist.has(p.id);
    const inCategory = selectedCategory === 'همه' || ((p.category || '').trim() || 'عمومی') === selectedCategory;
    if (!inCategory) return false;
    if (!normalizedQuery) return true;
    const haystack = `${p.name} ${p.description || ''} ${p.category || ''}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  // Wraps updateQty with Telegram's native haptic feedback for a more
  // "app-like" tap feel. `cartKey` is the plain productId for a variant-less
  // product, or "productId::variantId" for a specific variant.
  const tapQty = (cartKey: string, delta: number) => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(delta > 0 ? 'light' : 'soft');
    updateQty(cartKey, delta);
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

  // Shared stock math, used by the main grid, category thumbnails, and the
  // variant picker below. Pass `variantId` to get a specific variant's own
  // stock/cart-quantity instead of the product's own (unused once a
  // product has variants).
  const getStockInfo = (p: Product, variantId?: string) => {
    const cartKey = variantId ? (p.id + '::' + variantId) : p.id;
    const stockKey = cartKey;
    const isTracked = !!p.trackStock;
    const available = isTracked ? Math.max(0, stockLevels[stockKey] ?? 0) : Infinity;
    const inCart = cartState[cartKey] || 0;
    // Per-order cap resolved server-side (product override → shop default →
    // null for unlimited) and sent along with each product. Treated as a
    // second ceiling alongside stock: the + button stops at whichever
    // limit is reached first. Without this the Mini App would happily let
    // someone add 10 and only discover the cap at checkout, where the
    // server silently clamps it.
    const cap = typeof p.maxPerOrder === 'number' && p.maxPerOrder > 0 ? p.maxPerOrder : Infinity;
    return {
      outOfStock: isTracked && available <= 0,
      atMax: (isTracked && inCart >= available) || inCart >= cap,
      lowStock: isTracked && available > 0 && available <= 5,
      available,
      inCart,
      cartKey
    };
  };

  // How many products live in each category, so the person can tell what's inside before tapping.
  const categoryCounts: Record<string, number> = { 'همه': products.length };
  // First product image per category, used as the circular thumbnail —
  // approximates a real per-category image without needing a new admin
  // field: whichever product in that category happens to have a photo.
  const categoryThumb: Record<string, string | null> = {};
  for (const p of products) {
    const cat = (p.category || '').trim() || 'عمومی';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    if (!categoryThumb[cat]) {
      const img = getDisplayableImageUrl(p.imageUrls?.find(u => u && u.trim()) || p.imageUrl);
      if (img) categoryThumb[cat] = img;
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-3">
        <Loader2 size={36} className="text-blue-600 animate-spin" />
        <p className="text-sm text-slate-500">در حال دریافت کاتالوگ محصولات...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-10 p-6 rounded-2xl bg-red-50 border border-red-100 text-center space-y-3">
        <AlertTriangle size={36} className="text-red-500 mx-auto" />
        <h3 className="text-base font-bold text-red-700">خطا در بارگیری</h3>
        <p className="text-xs text-red-600/80 leading-relaxed">{error}</p>
      </div>
    );
  }

  if (!shopEnabled) {
    return (
      <div className="my-12 p-8 rounded-3xl bg-amber-50 border border-amber-100 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-2xl">
          🛑
        </div>
        <h2 className="text-lg font-bold text-amber-700">فروشگاه غیرفعال است</h2>
        <p className="text-xs text-amber-700/70 leading-relaxed max-w-sm mx-auto">
          فروشگاه در حال حاضر غیرفعال است. جهت اطلاع از وضعیت با مدیریت ربات تماس بگیرید.
        </p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="my-12 p-8 rounded-3xl bg-slate-100 border border-slate-200 text-center space-y-3">
        <ShoppingBag size={40} className="text-slate-400 mx-auto" />
        <h3 className="text-sm font-bold text-slate-600">محصولی یافت نشد</h3>
        <p className="text-xs text-slate-500">هیچ محصولی در کاتالوگ فروشگاه قرار ندارد.</p>
      </div>
    );
  }

  return (
    <>
      {/* Search — filters the grid below in real time, no server round-trip */}
      <div className="relative mb-3.5">
        <Search size={15} className="absolute top-1/2 -translate-y-1/2 right-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          inputMode="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="جستجو در محصولات..."
          className="w-full bg-white border border-slate-200 rounded-2xl py-3 pr-10 pl-9 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400 shadow-sm transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute top-1/2 -translate-y-1/2 left-3.5 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Category thumbnails — circular, Aradbot-style: a small photo per
          category (from one of its own products) instead of a text pill,
          so the store's structure reads at a glance before scrolling. */}
      {!showWishlistOnly && categories.length > 2 && (
        <div className="flex items-start gap-3.5 overflow-x-auto pb-1 mb-4 no-scrollbar">
          {categories.map((cat) => {
            const isAll = cat === 'همه';
            const thumb = isAll ? null : categoryThumb[cat];
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="flex flex-col items-center gap-1.5 shrink-0 w-16"
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center overflow-hidden transition-all ${
                  isActive ? 'ring-2 ring-blue-500 ring-offset-2' : 'ring-1 ring-slate-200'
                } ${thumb ? 'bg-slate-100' : 'bg-blue-50'}`}>
                  {thumb ? (
                    <img src={thumb} alt={cat} className="w-full h-full object-cover" />
                  ) : (
                    <Grid3x3 size={20} className="text-blue-400" />
                  )}
                </div>
                <span className={`text-[10px] line-clamp-1 w-full text-center ${isActive ? 'text-blue-700 font-bold' : 'text-slate-500'}`}>
                  {cat}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Wishlist filter chip — only shown once something's actually been
          favorited, so an empty heart row never clutters a first visit. */}
      {wishlist.size > 0 && (
        <button
          onClick={() => setShowWishlistOnly(v => !v)}
          className={`mb-3.5 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-bold border transition-all ${
            showWishlistOnly
              ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-600/20'
              : 'bg-rose-50 border-rose-100 text-rose-600'
          }`}
        >
          <Heart size={14} fill={showWishlistOnly ? 'currentColor' : 'none'} />
          <span>{showWishlistOnly ? 'بازگشت به همه‌ی محصولات' : `علاقه‌مندی‌های من (${wishlist.size.toLocaleString('fa-IR')})`}</span>
        </button>
      )}

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="my-10 p-6 rounded-2xl bg-white border border-slate-100 shadow-sm text-center space-y-2">
          <Search size={28} className="text-slate-300 mx-auto" />
          <p className="text-xs text-slate-500">
            {showWishlistOnly
              ? 'هنوز محصولی رو به علاقه‌مندی‌ها اضافه نکردید.'
              : normalizedQuery ? `چیزی برای «${searchQuery}» پیدا نشد.` : 'محصولی تو این دسته پیدا نشد.'}
          </p>
        </div>
      ) : (
      // FIX: was a fixed 2-column grid regardless of screen width — fine
      // on a phone, but left most of a desktop screen empty since it
      // never used the wider container from MiniShop's own layout fix.
      // Same responsive-by-breakpoint approach as the admin panel's own
      // product grid: mobile keeps exactly the 2-column layout it always
      // had (these classes only ever ADD columns at wider breakpoints),
      // desktop fills the row properly.
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {filteredProducts.map((p) => {
          const hasVariants = !!p.variants && p.variants.length > 0;
          // For a variant product, "qty in cart" for the card's own
          // highlight border is the sum across all its variant lines —
          // there's no single quantity once more than one variant can be
          // in the cart at once.
          const qty = hasVariants
            ? (p.variants || []).reduce((sum, v) => sum + (cartState[p.id + '::' + v.id] || 0), 0)
            : (cartState[p.id] || 0);
          const { available, outOfStock, atMax, lowStock } = getStockInfo(p);
          const isFavorite = wishlist.has(p.id);
          const isExpanded = expandedVariantProduct === p.id;

          return (
            <div
              key={p.id}
              className={`bg-white rounded-2xl p-2.5 flex flex-col justify-between shadow-sm border transition-all ${
                outOfStock
                  ? 'border-slate-100 opacity-60'
                  : qty > 0
                  ? 'border-blue-300 ring-1 ring-blue-200'
                  : 'border-slate-100'
              }`}
            >
              <div>
                {/* Product Image + overlay actions (heart / out-of-stock / category) */}
                <div className="relative">
                  <ProductImageSlider product={p} outOfStock={outOfStock} />
                  <button
                    type="button"
                    onClick={() => toggleWishlist(p.id)}
                    title="افزودن به علاقه‌مندی‌ها"
                    className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <Heart size={14} className={isFavorite ? 'text-rose-600' : 'text-slate-400'} fill={isFavorite ? 'currentColor' : 'none'} />
                  </button>
                </div>

                {/* Title & share actions */}
                <div className="flex items-start justify-between gap-1.5 mb-0.5 mt-1">
                  <h3 className="text-xs font-bold text-slate-800 line-clamp-1 flex-1">{p.name}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    {canShareToStory(p) && (
                      <button
                        type="button"
                        onClick={() => shareProductToStory(p)}
                        title="اشتراک‌گذاری در استوری"
                        className="w-5.5 h-5.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors active:scale-90"
                      >
                        <div className="w-2 h-2 rounded-full border-[1.5px] border-current" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => shareProductToChat(p)}
                      title="اشتراک‌گذاری در چت"
                      className="w-5.5 h-5.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors active:scale-90"
                    >
                      <Share2 size={11} />
                    </button>
                  </div>
                </div>
                {p.description && (
                  <p className="text-[10px] text-slate-400 line-clamp-1 mb-1.5 leading-relaxed">
                    {p.description}
                  </p>
                )}
                <div className="flex items-center justify-between mb-2 gap-1 flex-wrap">
                  <div className="text-[13px] font-black text-emerald-600 dir-rtl">
                    {p.price.toLocaleString('fa-IR')} <span className="text-[9px] font-normal text-slate-400">تومان</span>
                  </div>
                  {!hasVariants && lowStock && (
                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full">
                      {available.toLocaleString('fa-IR')} عدد مونده
                    </span>
                  )}
                </div>
              </div>

              {/* Quantity Control Buttons */}
              <div className="pt-1.5 border-t border-slate-50">
                {hasVariants ? (
                  isExpanded ? (
                    <div className="space-y-1.5">
                      {(p.variants || []).map((v) => {
                        const vInfo = getStockInfo(p, v.id);
                        return (
                          <div key={v.id} className="flex items-center justify-between gap-1.5">
                            <span className={`text-[10px] flex-1 line-clamp-1 ${vInfo.outOfStock ? 'text-slate-300' : 'text-slate-700'}`}>
                              {v.name}
                            </span>
                            {vInfo.outOfStock ? (
                              <span className="text-[9px] text-slate-400 shrink-0">ناموجود</span>
                            ) : (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => tapQty(vInfo.cartKey, -1)}
                                  disabled={vInfo.inCart === 0}
                                  className="w-6 h-6 rounded-md bg-slate-50 text-red-500 flex items-center justify-center active:scale-95 disabled:opacity-30"
                                >
                                  <Minus size={11} />
                                </button>
                                <span className="text-[11px] font-bold text-slate-800 w-4 text-center font-mono">{vInfo.inCart}</span>
                                <button
                                  onClick={() => tapQty(vInfo.cartKey, 1)}
                                  disabled={vInfo.atMax}
                                  className="w-6 h-6 rounded-md bg-slate-50 text-emerald-600 flex items-center justify-center active:scale-95 disabled:opacity-30"
                                >
                                  <Plus size={11} />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <button
                        onClick={() => setExpandedVariantProduct(null)}
                        className="w-full pt-1 text-[10px] text-slate-400 text-center"
                      >
                        بستن
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setExpandedVariantProduct(p.id)}
                      className="w-full py-2 bg-purple-50 hover:bg-purple-100 border border-purple-100 text-purple-700 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <span>🎨 انتخاب نوع{qty > 0 ? ' (' + qty.toLocaleString('fa-IR') + ')' : ''}</span>
                    </button>
                  )
                ) : outOfStock ? (
                  <button
                    disabled
                    className="w-full py-2 bg-slate-50 border border-slate-100 text-slate-400 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-not-allowed"
                  >
                    <span>ناموجود</span>
                  </button>
                ) : qty === 0 ? (
                  <button
                    onClick={() => tapQty(p.id, 1)}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all shadow-sm shadow-blue-600/20 active:scale-95"
                  >
                    <Plus size={13} />
                    <span>افزودن</span>
                  </button>
                ) : (
                  <div className="w-full flex items-center justify-between bg-blue-50 rounded-xl p-1">
                    <button
                      onClick={() => tapQty(p.id, -1)}
                      className="w-7 h-7 rounded-lg bg-white text-red-500 shadow-sm flex items-center justify-center transition-colors active:scale-95"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="text-sm font-black text-slate-800 px-1 font-mono">{qty}</span>
                    <button
                      onClick={() => tapQty(p.id, 1)}
                      disabled={atMax}
                      className="w-7 h-7 rounded-lg bg-white text-emerald-600 shadow-sm flex items-center justify-center transition-colors active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus size={13} />
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
