import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Store, Package, MessageSquare, FileText, 
  Image as ImageIcon, Bell, Calendar
} from 'lucide-react';
import { Product, MiniAppModule, Order, GalleryImage, BookableService } from '../types';
import { ShopTab } from '../components/miniapp/ShopTab';
import { OrdersTab } from '../components/miniapp/OrdersTab';
import { SupportTab } from '../components/miniapp/SupportTab';
import { FormsTab, MiniAppForm } from '../components/miniapp/FormsTab';
import { GalleryTab } from '../components/miniapp/GalleryTab';
import { AnnouncementsTab, Announcement } from '../components/miniapp/AnnouncementsTab';
import { BookingTab } from '../components/miniapp/BookingTab';
import { BottomNavigation } from '../components/miniapp/BottomNavigation';
import { CheckoutBar } from '../components/miniapp/CheckoutBar';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        sendData: (data: string) => void;
        initDataUnsafe?: any;
        initData?: string;
        themeParams?: any;
        // 'ios' | 'android' | 'macos' | 'tdesktop' | 'web' | 'weba' | 'unknown' ...
        platform?: string;
        // Fullscreen (Bot API 8.0+)
        requestFullscreen?: () => void;
        exitFullscreen?: () => void;
        isFullscreen?: boolean;
        // Safe area insets, in CSS px, respecting device notches/status bars (Bot API 8.0+)
        safeAreaInset?: { top: number; bottom: number; left: number; right: number };
        contentSafeAreaInset?: { top: number; bottom: number; left: number; right: number };
        // Native chrome colors
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        setBottomBarColor?: (color: string) => void;
        // Event subscription for the events above
        onEvent?: (eventType: string, callback: () => void) => void;
        offEvent?: (eventType: string, callback: () => void) => void;
        // Native bottom action button, used for checkout instead of a custom in-page button
        MainButton?: {
          text: string;
          isVisible: boolean;
          isActive: boolean;
          setText: (text: string) => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          setParams: (params: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }) => void;
        };
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        // Opens any t.me link (used for the "share to chat" picker below) without closing the Mini App.
        openTelegramLink?: (url: string) => void;
        // Posts a photo directly to the user's Telegram story, with an optional link sticker
        // back to the Mini App. Only works with a public https image URL (Bot API 7.8+).
        shareToStory?: (mediaUrl: string, params?: { text?: string; widget_link?: { url: string; name?: string } }) => void;
      };
    };
  }
}

export const MiniShop: React.FC = () => {
  // Base height (px) of BottomNavigation before the device's safe area is added — matches
  // its own icon+label+padding sizing plus its floating bottom-3 margin, used to position
  // CheckoutBar right above it.
  const NAV_BASE_HEIGHT = 76;

  const [enabledModules, setEnabledModules] = useState<MiniAppModule[]>(() => {
    try {
      const saved = localStorage.getItem('miniapp_modules');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return ['shop'];
  });

  const [activeTab, setActiveTab] = useState<MiniAppModule>(() => enabledModules[0] || 'shop');

  // Shop state
  const [products, setProducts] = useState<Product[]>([]);
  const [shopEnabled, setShopEnabled] = useState<boolean>(true);
  // NEW — merchant-configurable store name (Settings → shop name), shown
  // in the header instead of a generic label. Falls back to that generic
  // label until the fetch resolves (or if the merchant never set one).
  const [shopName, setShopName] = useState<string>('فروشگاه آنلاین تلگرام');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cartState, setCartState] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('همه');
  // Live stock counts from D1 (productId -> remaining qty), only meaningful for products with trackStock=true
  const [stockLevels, setStockLevels] = useState<Record<string, number>>({});

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  // Support state
  const [supportText, setSupportText] = useState<string>('');
  const [supportSending, setSupportSending] = useState<boolean>(false);
  const [supportSuccess, setSupportSuccess] = useState<boolean>(false);

  // Gallery state
  const [galleryList, setGalleryList] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState<boolean>(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null);

  // Announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState<boolean>(false);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);

  // Forms state
  const [formsList, setFormsList] = useState<MiniAppForm[]>([]);
  const [formsLoading, setFormsLoading] = useState<boolean>(false);
  const [formsError, setFormsError] = useState<string | null>(null);
  const [selectedForm, setSelectedForm] = useState<MiniAppForm | null>(null);
  const [formValues, setFormValues] = useState<Record<number, any>>({});
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);

  // Booking state
  const [bookingServices, setBookingServices] = useState<BookableService[]>([]);
  const [bookingLoading, setBookingLoading] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<BookableService | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState<boolean>(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookingName, setBookingName] = useState<string>('');
  const [bookingPhone, setBookingPhone] = useState<string>('');
  const [bookingSubmitting, setBookingSubmitting] = useState<boolean>(false);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);

  // Extract license code from query string
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code') || '';

  // Live safe-area insets (px) so fixed header/nav/bars don't sit under the notch, status bar,
  // the device's home-indicator area, or — in fullscreen Mini Apps — Telegram's own native
  // top-right chevron/menu controls (see the `right` use in the header below).
  const [safeArea, setSafeArea] = useState({ top: 0, bottom: 0, left: 0, right: 0 });

  // Initialize Telegram WebApp SDK on Mount: expand, go full-screen, match native chrome colors
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return;

    webApp.ready();
    webApp.expand();

    // Full-screen mode (Bot API 8.0+). Guarded with try/catch since older Telegram clients
    // won't have this method at all — expand() above is still a safe baseline for them.
    try {
      webApp.requestFullscreen?.();
    } catch {
      // Older client without full-screen support — expand() already applied above.
    }

    // Match Telegram's native chrome (status bar / bottom bar) to our light
    // brand colors instead of the client's default, so the app feels like
    // one seamless surface.
    try {
      webApp.setHeaderColor?.('#ffffff');
      webApp.setBackgroundColor?.('#f8fafc');
      webApp.setBottomBarColor?.('#f8fafc');
    } catch {
      // Older client — colors simply stay default, no functional impact.
    }

    const readSafeArea = () => {
      const s = webApp.safeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 };
      const c = webApp.contentSafeAreaInset || { top: 0, bottom: 0, left: 0, right: 0 };
      setSafeArea({
        top: Math.max(s.top, c.top),
        bottom: Math.max(s.bottom, c.bottom),
        left: Math.max(s.left, c.left),
        right: Math.max(s.right, c.right)
      });
    };
    readSafeArea();
    webApp.onEvent?.('safeAreaChanged', readSafeArea);
    webApp.onEvent?.('contentSafeAreaChanged', readSafeArea);
    webApp.onEvent?.('fullscreenChanged', readSafeArea);

    return () => {
      webApp.offEvent?.('safeAreaChanged', readSafeArea);
      webApp.offEvent?.('contentSafeAreaChanged', readSafeArea);
      webApp.offEvent?.('fullscreenChanged', readSafeArea);
    };
  }, []);

  // Fetch shop products & enabled modules from server. Hoisted (not just a
  // useEffect-local const) so returning to the shop tab can re-run it too —
  // that's what keeps stock numbers fresh if someone lingers on another tab
  // for a while (see the tab-switch effect further down).
  const fetchShopData = async () => {
    if (!code) {
      setError('کد لایسنس یا شناسه فروشگاه در آدرس یافت نشد.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://corepanel-api.tajikr450.workers.dev/api/shop/${encodeURIComponent(code)}/products`);
      const data = await res.json();

      if (data.ok === false) {
        setError(data.message || 'خطا در بارگیری اطلاعات فروشگاه.');
      } else {
        setShopEnabled(data.shop_enabled !== false);
        if (data.shop_name && String(data.shop_name).trim()) setShopName(String(data.shop_name).trim());
        setProducts(data.products || []);
        // FIX: this used to call a separate endpoint
        // (/api/products/stock/list) with the Mini App's `code` param —
        // but that endpoint is owner-only and expects the private license
        // code, while the Mini App only ever holds the public, buyer-safe
        // access_token (deliberately — the license code must never reach a
        // buyer's browser). Every call there failed with "invalid" and
        // stockLevels stayed permanently empty, which getStockInfo in
        // ShopTab reads as 0 remaining for every trackStock product — so
        // every tracked product showed as out of stock regardless of the
        // real count. The actual fix: this /api/shop/:code/products
        // response (which DOES accept the public token) already returns
        // each product's live `stock` field — no second request needed.
        const stocks: Record<string, number> = {};
        for (const p of (data.products || [])) {
          if (p.trackStock && typeof p.stock === 'number') stocks[p.id] = p.stock;
          // NEW — variant stock, keyed the same "<productId>::<variantId>"
          // way the server itself resolves it (see resolveStockKey in
          // worker.js), so ShopTab's cart/stock math can treat a variant
          // exactly like a product with a longer id — no special-casing.
          if (p.trackStock && Array.isArray(p.variants)) {
            for (const v of p.variants) {
              if (typeof v.stock === 'number') stocks[p.id + '::' + v.id] = v.stock;
            }
          }
        }
        setStockLevels(stocks);
        if (Array.isArray(data.enabled_modules) && data.enabled_modules.length > 0) {
          setEnabledModules(data.enabled_modules);
          if (!data.enabled_modules.includes(activeTab)) {
            setActiveTab(data.enabled_modules[0]);
          }
        }
      }
    } catch (err) {
      console.error('MiniShop API error:', err);
      // Fallback to local storage
      try {
        const localProds = JSON.parse(localStorage.getItem('bot_products') || '[]');
        setProducts(localProds);
        setShopEnabled(true);
      } catch {
        setError('خطا در ارتباط با سرور. لطفاً مجدداً تلاش کنید.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShopData();
  }, [code]);

  // Fetch customer orders when "orders" tab becomes active
  const fetchMyOrders = async () => {
    if (!code) return;
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch('https://corepanel-api.tajikr450.workers.dev/api/shop/my-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, initData })
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        // Fallback to local storage if available
        const localOrders = JSON.parse(localStorage.getItem('bot_orders') || '[]');
        setOrders(localOrders);
      }
    } catch (err) {
      console.error('Fetch my-orders error:', err);
      // Fallback to local orders
      try {
        const localOrders = JSON.parse(localStorage.getItem('bot_orders') || '[]');
        setOrders(localOrders);
      } catch {
        setOrdersError('خطا در دریافت سوابق سفارش‌ها.');
      }
    } finally {
      setOrdersLoading(false);
    }
  };

  // Fetch gallery images
  const fetchGallery = async () => {
    if (!code) return;
    setGalleryLoading(true);
    setGalleryError(null);
    try {
      const res = await fetch(`https://corepanel-api.tajikr450.workers.dev/api/shop/${encodeURIComponent(code)}/gallery`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.gallery)) {
        setGalleryList(data.gallery);
      } else {
        const localGallery = JSON.parse(localStorage.getItem('gallery_images') || '[]');
        setGalleryList(localGallery);
      }
    } catch (err) {
      console.error('Fetch gallery error:', err);
      try {
        const localGallery = JSON.parse(localStorage.getItem('gallery_images') || '[]');
        setGalleryList(localGallery);
      } catch {
        setGalleryError('خطا در دریافت تصاویر گالری.');
      }
    } finally {
      setGalleryLoading(false);
    }
  };

  // Fetch announcements
  const fetchAnnouncements = async () => {
    if (!code) return;
    setAnnouncementsLoading(true);
    setAnnouncementsError(null);
    try {
      const res = await fetch(`https://corepanel-api.tajikr450.workers.dev/api/shop/${encodeURIComponent(code)}/announcements`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.announcements)) {
        setAnnouncements(data.announcements);
      } else {
        const localQueue = JSON.parse(localStorage.getItem('channel_queue') || '[]');
        const mapped = localQueue.map((item: any) => ({
          id: item.id,
          content: item.content || '',
          mediaFiles: item.mediaFiles || (item.hasMedia ? [{ type: item.mediaType || 'image', url: '' }] : []),
          createdAt: item.createdAt || Date.now()
        }));
        setAnnouncements(mapped);
      }
    } catch (err) {
      console.error('Fetch announcements error:', err);
      try {
        const localQueue = JSON.parse(localStorage.getItem('channel_queue') || '[]');
        const mapped = localQueue.map((item: any) => ({
          id: item.id,
          content: item.content || '',
          mediaFiles: item.mediaFiles || [],
          createdAt: item.createdAt || Date.now()
        }));
        setAnnouncements(mapped);
      } catch {
        setAnnouncementsError('خطا در دریافت اعلانات.');
      }
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  // Fetch forms
  const fetchForms = async () => {
    if (!code) return;
    setFormsLoading(true);
    setFormsError(null);
    try {
      const res = await fetch(`https://corepanel-api.tajikr450.workers.dev/api/shop/${encodeURIComponent(code)}/forms`);
      const data = await res.json();
      if (data.ok !== false && Array.isArray(data.forms)) {
        setFormsList(data.forms);
      } else {
        const localFormsObj = JSON.parse(localStorage.getItem('bot_forms') || '{}');
        const list: MiniAppForm[] = Object.values(localFormsObj);
        setFormsList(list);
      }
    } catch (err) {
      console.error('Fetch forms error:', err);
      try {
        const localFormsObj = JSON.parse(localStorage.getItem('bot_forms') || '{}');
        const list: MiniAppForm[] = Object.values(localFormsObj);
        setFormsList(list);
      } catch {
        setFormsError('خطا در دریافت لیست فرم‌ها.');
      }
    } finally {
      setFormsLoading(false);
    }
  };

  // Submit form answers
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForm) return;

    setFormSubmitting(true);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const answers = selectedForm.questions.map((q, i) => {
        const val = formValues[i];
        let answerStr = '';
        if (Array.isArray(val)) {
          answerStr = val.join(', ');
        } else if (val !== undefined && val !== null) {
          answerStr = String(val);
        }
        return { q: q.text, a: answerStr };
      });

      const res = await fetch('https://corepanel-api.tajikr450.workers.dev/api/shop/submit-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, initData, formId: selectedForm.id, answers })
      });

      const data = await res.json();
      if (data.ok !== false) {
        setFormSuccessMessage('✅ فرم شما با موفقیت ارسال شد');
      } else {
        alert(data.message || 'خطا در ارسال فرم.');
      }
    } catch (err) {
      console.error('Submit form error:', err);
      alert('خطا در ارتباط با سرور.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Fetch booking services
  const fetchBookingServices = async () => {
    if (!code) return;
    setBookingLoading(true);
    setBookingError(null);
    try {
      const res = await fetch(`https://corepanel-api.tajikr450.workers.dev/api/shop/${encodeURIComponent(code)}/services`);
      const data = await res.json();
      if (data.ok !== false && Array.isArray(data.services)) {
        setBookingServices(data.services.filter((s: BookableService) => s.active !== false));
      } else {
        const localSvcs: BookableService[] = JSON.parse(localStorage.getItem('booking_services') || '[]');
        setBookingServices(localSvcs.filter(s => s.active !== false));
      }
    } catch (err) {
      console.error('Fetch services error:', err);
      try {
        const localSvcs: BookableService[] = JSON.parse(localStorage.getItem('booking_services') || '[]');
        setBookingServices(localSvcs.filter(s => s.active !== false));
      } catch {
        setBookingError('خطا در دریافت لیست خدمات.');
      }
    } finally {
      setBookingLoading(false);
    }
  };

  // Fetch availability slots
  const fetchAvailability = async (serviceId: string, dateIso: string) => {
    if (!code) return;
    setSlotsLoading(true);
    setAvailableSlots([]);
    setSelectedTime(null);
    try {
      const res = await fetch('https://corepanel-api.tajikr450.workers.dev/api/shop/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, serviceId, date: dateIso })
      });
      const data = await res.json();
      if (data.ok !== false && Array.isArray(data.slots)) {
        setAvailableSlots(data.slots);
      } else {
        setAvailableSlots(['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']);
      }
    } catch (err) {
      console.error('Fetch availability error:', err);
      setAvailableSlots(['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']);
    } finally {
      setSlotsLoading(false);
    }
  };

  // Submit booking
  const handleBookingSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedTime) return;
    if (!bookingName.trim() || !bookingPhone.trim()) {
      alert('لطفاً نام و شماره تماس خود را وارد کنید.');
      return;
    }
    setBookingSubmitting(true);
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch('https://corepanel-api.tajikr450.workers.dev/api/shop/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          initData,
          serviceId: selectedService.id,
          date: selectedDate,
          time: selectedTime,
          contactInfo: `${bookingName.trim()} - ${bookingPhone.trim()}`
        })
      });
      const data = await res.json();
      if (data.ok !== false) {
        setBookingSuccessMsg('✅ نوبت شما ثبت شد، منتظر تایید ادمین باشید');
      } else {
        alert(data.message || 'خطا در ثبت نوبت.');
      }
    } catch (err) {
      console.error('Booking submit error:', err);
      alert('خطا در ارتباط با سرور.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Generate 7 upcoming days
  const getNext7Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('fa-IR', { weekday: 'long' });
      const dateStr = d.toLocaleDateString('fa-IR', { month: 'numeric', day: 'numeric' });
      days.push({ iso, dayName, dateStr, isToday: i === 0 });
    }
    return days;
  };

  useEffect(() => {
    if (activeTab === 'orders') fetchMyOrders();
    if (activeTab === 'forms') fetchForms();
    if (activeTab === 'booking') fetchBookingServices();
    if (activeTab === 'gallery') fetchGallery();
    if (activeTab === 'announcements') fetchAnnouncements();
    if (activeTab === 'shop') fetchShopData();
  }, [activeTab, code]);

  // Quantity controls — respects live stock cap for products with trackStock
  // enabled. `productId` here is the CART KEY: a plain productId for a
  // variant-less product, or "productId::variantId" for a specific
  // variant — the same composite convention stockLevels and the server
  // both use, so a variant behaves exactly like a product with a longer id
  // everywhere in this function.
  const updateQty = (cartKey: string, delta: number) => {
    const productId = cartKey.split('::')[0];
    setCartState(prev => {
      const current = prev[cartKey] || 0;
      const product = products.find(p => p.id === productId);
      const cap = product?.trackStock ? Math.max(0, stockLevels[cartKey] ?? 0) : Infinity;
      const next = Math.min(cap, Math.max(0, current + delta));
      if (next === 0) {
        const copy = { ...prev };
        delete copy[cartKey];
        return copy;
      }
      return { ...prev, [cartKey]: next };
    });
  };

  // If stock drops below what's already in the cart (e.g. refreshed after another buyer purchased),
  // clamp the cart down to the new available amount instead of letting the user overbuy.
  useEffect(() => {
    setCartState(prev => {
      let changed = false;
      const next = { ...prev };
      for (const cartKey of Object.keys(next)) {
        const productId = cartKey.split('::')[0];
        const product = products.find(p => p.id === productId);
        if (product?.trackStock) {
          const available = Math.max(0, stockLevels[cartKey] ?? 0);
          if (next[cartKey] > available) {
            changed = true;
            if (available <= 0) delete next[cartKey];
            else next[cartKey] = available;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [stockLevels, products]);

  // Cart summary calculations
  const totalItems = (Object.values(cartState) as number[]).reduce((sum: number, qty: number) => sum + qty, 0);
  const totalPrice = (Object.entries(cartState) as [string, number][]).reduce((sum: number, [cartKey, qty]: [string, number]) => {
    const productId = cartKey.split('::')[0];
    const prod = products.find(p => p.id === productId);
    return sum + (prod ? prod.price * qty : 0);
  }, 0);

  // Whether to show the explicit "order sent" confirmation screen instead of relying on
  // WebApp.close() alone — needed because close() reliably dismisses the panel on mobile
  // clients, but on Telegram Desktop it often just leaves a blank/black frame that the
  // person has to close manually with no explanation of what happened.
  const [checkoutDone, setCheckoutDone] = useState(false);

  // Send checkout data back to Telegram bot
  const handleCheckout = () => {
    const cart = (Object.entries(cartState) as [string, number][])
      .filter(([_, qty]) => qty > 0)
      .map(([cartKey, qty]) => {
        const [productId, variantId] = cartKey.split('::');
        return variantId ? { productId, variantId, qty } : { productId, qty };
      });

    if (cart.length === 0) return;

    const webApp = window.Telegram?.WebApp;
    if (webApp?.sendData) {
      webApp.sendData(JSON.stringify({ cart }));
      webApp.HapticFeedback?.notificationOccurred?.('success');
      setCartState({});

      // Mobile/native clients close cleanly on their own — keep that fast, familiar flow.
      // Desktop/web clients get an explicit confirmation screen with a manual close button
      // instead of an unexplained blank frame.
      const platform = webApp.platform || '';
      const isNativeMobile = platform === 'ios' || platform === 'android';
      if (isNativeMobile) {
        webApp.close();
      } else {
        setCheckoutDone(true);
      }
    } else {
      alert('سبد خرید شما آماده ارسال است: \n' + JSON.stringify({ cart }, null, 2));
    }
  };

  // Support form submission
  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportText.trim()) return;

    setSupportSending(true);
    setSupportSuccess(false);

    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      const res = await fetch('https://corepanel-api.tajikr450.workers.dev/api/shop/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, initData, message: supportText.trim() })
      });
      const data = await res.json();
      if (data.ok !== false) {
        setSupportSuccess(true);
        setSupportText('');
      } else {
        alert(data.message || 'خطا در ثبت تیکت پشتیبانی.');
      }
    } catch (err) {
      console.error('Support submit error:', err);
      // Client fallback acknowledgment
      setSupportSuccess(true);
      setSupportText('');
    } finally {
      setSupportSending(false);
    }
  };

  // Helper for relative Iranian date format
  const formatRelativeTime = (timestamp: number | string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return String(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'همین الان';
    if (diffMinutes < 60) return `${diffMinutes.toLocaleString('fa-IR')} دقیقه پیش`;
    if (diffHours < 24) return `${diffHours.toLocaleString('fa-IR')} ساعت پیش`;
    if (diffDays < 7) return `${diffDays.toLocaleString('fa-IR')} روز پیش`;
    return date.toLocaleDateString('fa-IR');
  };

  // Categories list
  const categories = ['همه', ...Array.from(new Set(products.map(p => (p.category || '').trim() || 'عمومی')))];

  // Measures the real rendered header height (it changes with the safe-area top inset) so the
  // category chip bar in ShopTab can stick right under it instead of a guessed pixel value.
  const headerRef = React.useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(56);
  useEffect(() => {
    if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight);
  }, [safeArea.top, activeTab]);

  const filteredProducts = selectedCategory === 'همه'
    ? products
    : products.filter(p => ((p.category || '').trim() || 'عمومی') === selectedCategory);

  return (
    <div
      dir="rtl"
      // FIX: full light-theme redesign — was a hardcoded dark shop
      // (bg-[#0e131f], text-white throughout). Modeled after a storefront
      // reference the merchant liked (rounded white product cards,
      // circular category thumbnails, wishlist hearts). The
      // `telegram-simulator` class that used to be here (to dodge the
      // admin panel's dark-mode-preserving CSS override — see
      // index.html) is no longer needed: this page now uses ordinary
      // light-theme classes throughout (bg-white, text-slate-800, etc.),
      // which that override doesn't touch in any harmful way.
      className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans relative"
      style={{ paddingBottom: `calc(7rem + ${safeArea.bottom}px)` }}
    >
      {/* Background Glow — soft accent tint behind the header, not a full backdrop */}
      <div className="fixed top-0 right-0 w-72 h-72 bg-blue-200/30 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-72 h-72 bg-emerald-200/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header
        ref={headerRef}
        className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-3.5 shadow-sm"
        style={{
          paddingTop: `calc(0.875rem + ${safeArea.top}px)`,
          // FIX: Telegram reserves physical top-right space for its own
          // native chevron/menu controls in fullscreen Mini Apps
          // (safeAreaInset.right) — our own RTL, right-aligned title was
          // rendering straight underneath them, getting visually cut off.
          // FIX: safeAreaInset.right alone wasn't enough — it reports 0 in
          // Telegram's normal (non-fullscreen) Mini App view, where the
          // native chevron+menu controls still float over the top-right
          // corner regardless. Guaranteeing a fixed minimum buffer here
          // (on top of whatever the API does report) clears them
          // reliably across display modes instead of trusting a value
          // that isn't always populated.
          paddingRight: `calc(4.5rem + ${safeArea.right}px)`
        }}
      >
        {/* FIX: this content used to span the full viewport edge-to-edge
            (no max-width), while the page body below was capped much
            narrower — on a wide desktop screen the title sat pinned to
            the far right and the cart badge to the far left, visibly out
            of step with the narrower content beneath. Same max-width as
            <main> now, so header/content/nav all line up together
            whatever the screen size — this is also what actually lets
            the shop use the extra desktop width at all (see <main>
            below): on mobile max-w-7xl never binds, so nothing changes
            there. */}
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shrink-0">
            <Store size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900 truncate">{shopName}</h1>
            <p className="text-[11px] text-slate-400 truncate">
              {activeTab === 'shop' && 'انتخاب محصولات و سفارش مستقیم'}
              {activeTab === 'orders' && 'سوابق و پیگیری سفارش‌های قبلی'}
              {activeTab === 'support' && 'ارتباط و ارسال تیکت پشتیبانی'}
              {activeTab === 'forms' && 'فرم‌های آنلاین'}
              {activeTab === 'gallery' && 'گالری تصاویر و نمونه‌کارها'}
              {activeTab === 'announcements' && 'اطلاعیه‌ها و اخبار جدید'}
            </p>
          </div>
        </div>
        {activeTab === 'shop' && totalItems > 0 && (
          <div className="bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full text-xs text-blue-700 font-medium flex items-center gap-1 animate-fade-in shrink-0">
            <ShoppingBag size={13} />
            <span>{totalItems} کالا</span>
          </div>
        )}
        </div>
      </header>

      {/* Main Content Area based on Active Tab */}
      <main className="flex-1 px-4 pt-4 max-w-7xl mx-auto w-full z-10">
        {activeTab === 'shop' && (
          <ShopTab
            loading={loading}
            error={error}
            shopEnabled={shopEnabled}
            products={products}
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            cartState={cartState}
            updateQty={updateQty}
            stockLevels={stockLevels}
            stickyTop={headerHeight}
            code={code}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersTab
            orders={orders}
            ordersLoading={ordersLoading}
            ordersError={ordersError}
            fetchMyOrders={fetchMyOrders}
          />
        )}

        {activeTab === 'support' && (
          <SupportTab
            supportText={supportText}
            setSupportText={setSupportText}
            supportSending={supportSending}
            supportSuccess={supportSuccess}
            handleSupportSubmit={handleSupportSubmit}
          />
        )}

        {activeTab === 'forms' && (
          <FormsTab
            selectedForm={selectedForm}
            setSelectedForm={setSelectedForm}
            formValues={formValues}
            setFormValues={setFormValues}
            formSubmitting={formSubmitting}
            formSuccessMessage={formSuccessMessage}
            setFormSuccessMessage={setFormSuccessMessage}
            handleFormSubmit={handleFormSubmit}
            formsList={formsList}
            formsLoading={formsLoading}
            formsError={formsError}
            fetchForms={fetchForms}
          />
        )}

        {activeTab === 'gallery' && (
          <GalleryTab
            galleryList={galleryList}
            galleryLoading={galleryLoading}
            galleryError={galleryError}
            fetchGallery={fetchGallery}
            lightboxImage={lightboxImage}
            setLightboxImage={setLightboxImage}
          />
        )}

        {activeTab === 'announcements' && (
          <AnnouncementsTab
            announcements={announcements}
            announcementsLoading={announcementsLoading}
            announcementsError={announcementsError}
            fetchAnnouncements={fetchAnnouncements}
            formatRelativeTime={formatRelativeTime}
          />
        )}

        {activeTab === 'booking' && (
          <BookingTab
            bookingSuccessMsg={bookingSuccessMsg}
            setBookingSuccessMsg={setBookingSuccessMsg}
            bookingLoading={bookingLoading}
            bookingError={bookingError}
            bookingServices={bookingServices}
            fetchBookingServices={fetchBookingServices}
            selectedService={selectedService}
            setSelectedService={setSelectedService}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            selectedTime={selectedTime}
            setSelectedTime={setSelectedTime}
            availableSlots={availableSlots}
            slotsLoading={slotsLoading}
            bookingName={bookingName}
            setBookingName={setBookingName}
            bookingPhone={bookingPhone}
            setBookingPhone={setBookingPhone}
            bookingSubmitting={bookingSubmitting}
            handleBookingSubmit={handleBookingSubmit}
            fetchAvailability={fetchAvailability}
            getNext7Days={getNext7Days}
          />
        )}
      </main>

      {/* Sticky Bottom Bar for Shop Checkout (Only when shop tab is active & items > 0) —
          positioned dynamically just above BottomNavigation, whose own height grows
          with the device's safe area (home indicator) in full-screen mode. */}
      {activeTab === 'shop' && (
        <CheckoutBar
          totalItems={totalItems}
          totalPrice={totalPrice}
          handleCheckout={handleCheckout}
          bottom={NAV_BASE_HEIGHT + safeArea.bottom}
        />
      )}

      {/* Bottom Navigation Bar */}
      <BottomNavigation
        enabledModules={enabledModules}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        safeAreaBottom={safeArea.bottom}
      />

      {/* Order-sent confirmation — shown instead of an unexplained blank frame on
          Telegram Desktop/web, where WebApp.close() often doesn't dismiss the panel cleanly. */}
      {checkoutDone && (
        <div className="fixed inset-0 z-50 bg-white/98 backdrop-blur-md flex flex-col items-center justify-center text-center px-8 gap-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-3xl">
            ✅
          </div>
          <h2 className="text-lg font-bold text-slate-900">سفارش شما با موفقیت ثبت شد</h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
            جزئیات و پیگیری سفارش از طریق چت ربات براتون ارسال می‌شه. می‌تونید این پنجره رو ببندید.
          </p>
          <button
            onClick={() => window.Telegram?.WebApp?.close()}
            className="mt-2 py-2.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all active:scale-95"
          >
            بستن پنجره
          </button>
        </div>
      )}
    </div>
  );
};
