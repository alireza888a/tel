import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Plus, Trash2, Edit, ShoppingBag, CheckCircle, X, DollarSign, Image as ImageIcon, ToggleLeft, ToggleRight, Check, Zap } from 'lucide-react';
import { Product } from '../types';
import { telegramService } from '../services/telegramService';
import { getStoredCredential } from '../services/cloudSync';
import { syncNow } from '../services/cloudSync';
import { getDisplayableImageUrl } from '../utils/image';
import { formatNumberInput, parseFormattedNumber } from '../utils/numberInput';
import { FormsManagerCard } from '../components/products/FormsManagerCard';

export const Products: React.FC = () => {
 const [products, setProducts] = useState<Product[]>(() => {
 try {
 return JSON.parse(localStorage.getItem('bot_products') || '[]');
 } catch {
 return [];
 }
 });

 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingProduct, setEditingProduct] = useState<Product | null>(null);

 // Form states
 const [name, setName] = useState('');
 const [price, setPrice] = useState<number | ''>('');
 const [description, setDescription] = useState('');
 const [imageUrl, setImageUrl] = useState('');
 const [imageUrls, setImageUrls] = useState<string[]>([]);
 const [active, setActive] = useState(true);
 const [category, setCategory] = useState('');
 const [postConfirmMenuId, setPostConfirmMenuId] = useState('');
 const [postOrderFormId, setPostOrderFormId] = useState('');
 const [trackStock, setTrackStock] = useState(false);
 const [maxPerOrder, setMaxPerOrder] = useState<number | ''>('');
 const [stockValue, setStockValue] = useState<number | ''>('');
 const [categoryFilter, setCategoryFilter] = useState<string>('همه');

 // Stock levels from D1 server
 const [stockLevels, setStockLevels] = useState<Record<string, number>>({});

 const fetchStockLevels = async () => {
 try {
 const credential = getStoredCredential();
 if (!credential) return;
 const res = await fetch('https://corepanel-api.tajikr450.workers.dev/api/products/stock/list', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(credential)
 });
 const result = await res.json();
 if (result.ok) setStockLevels(result.stock || {});
 } catch (e) {
 console.warn('Failed to load stock levels:', e);
 }
 };

 useEffect(() => {
 fetchStockLevels();
 }, []);

 const saveStockToServer = async (productId: string, stock: number) => {
 try {
 const credential = getStoredCredential();
 if (!credential) return;
 await fetch('https://corepanel-api.tajikr450.workers.dev/api/products/stock/set', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ ...credential, productId, stock })
 });
 setStockLevels(prev => ({ ...prev, [productId]: stock }));
 } catch (e) {
 console.warn('Failed to save stock:', e);
 }
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

 const [isUploading, setIsUploading] = useState(false);
 const [manualUrlInput, setManualUrlInput] = useState('');
 const fileInputRef = useRef<HTMLInputElement>(null);

 const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 if (e.target.files && e.target.files.length > 0) {
 const files: File[] = Array.from(e.target.files);
 const token = localStorage.getItem('bot_token') || '';
 const dbChannel = localStorage.getItem('bot_db_channel') || '';

 if (!token || !dbChannel) {
 alert('هشدار: کانال دیتابیس یا توکن ربات تنظیم نشده است. ابتدا از بخش تنظیمات ربات، توکن و کانال دیتابیس را ست کنید.');
 return;
 }

 if (imageUrls.length >= 10) {
 alert('حداکثر ۱۰ عکس برای هر محصول می‌توانید آپلود کنید.');
 return;
 }

 setIsUploading(true);
 const uploadedList: string[] = [];
 try {
 for (const file of files) {
 if (imageUrls.length + uploadedList.length >= 10) break;
 const uploadedId = await telegramService.uploadToDb(token, dbChannel, file, 'image');
 if (uploadedId) {
 uploadedList.push(uploadedId);
 }
 }
 if (uploadedList.length > 0) {
 setImageUrls(prev => {
 const next = [...prev, ...uploadedList].slice(0, 10);
 setImageUrl(next[0] || '');
 return next;
 });
 console.log(`Product images uploaded to DB:`, uploadedList);
 } else {
 alert('هشدار: آپلود در کانال دیتابیس ناموفق بود. لطفا بررسی کنید که ربات در کانال دیتابیس "ادمین" باشد.');
 }
 } catch (err) {
 console.error('Failed to upload product images to DB channel', err);
 alert('خطا در ارتباط با تلگرام برای آپلود فایل.');
 } finally {
 setIsUploading(false);
 e.target.value = '';
 }
 }
 };

 const handleAddManualUrl = () => {
 const trimmed = manualUrlInput.trim();
 if (!trimmed) return;
 if (imageUrls.length >= 10) {
 alert('حداکثر ۱۰ عکس برای هر محصول می‌توانید آپلود کنید.');
 return;
 }
 const next = [...imageUrls, trimmed].slice(0, 10);
 setImageUrls(next);
 setImageUrl(next[0] || '');
 setManualUrlInput('');
 };

 const handleRemoveImage = (index: number) => {
 const next = imageUrls.filter((_, i) => i !== index);
 setImageUrls(next);
 setImageUrl(next[0] || '');
 };

 useEffect(() => {
 localStorage.setItem('bot_products', JSON.stringify(products));
 syncNow();
 }, [products]);

 const openAddModal = () => {
 setEditingProduct(null);
 setName('');
 setPrice('');
 setDescription('');
 setImageUrl('');
 setImageUrls([]);
 setManualUrlInput('');
 setActive(true);
 setCategory('');
 setPostConfirmMenuId('');
 setPostOrderFormId('');
 setTrackStock(false);
 setMaxPerOrder('');
 setStockValue('');
 setIsModalOpen(true);
 };

 const openEditModal = (product: Product) => {
 setEditingProduct(product);
 setName(product.name);
 setPrice(product.price);
 setDescription(product.description);
 const existingImgs = product.imageUrls && product.imageUrls.length > 0
 ? product.imageUrls
 : (product.imageUrl ? [product.imageUrl] : []);
 setImageUrls(existingImgs);
 setImageUrl(existingImgs[0] || '');
 setManualUrlInput('');
 setActive(product.active);
 setCategory(product.category || '');
 setPostConfirmMenuId(product.post_confirm_menu_id || '');
 setPostOrderFormId(product.post_order_form_id || '');
 setTrackStock(!!product.trackStock);
 setMaxPerOrder(product.maxPerOrder ?? '');
 setStockValue(product.trackStock ? (stockLevels[product.id] ?? 0) : '');
 setIsModalOpen(true);
 };

 const handleSave = (e: React.FormEvent) => {
 e.preventDefault();
 if (!name || price === '') {
 alert('لطفاً نام و قیمت محصول را وارد کنید.');
 return;
 }

 const finalImageUrls = imageUrls.length > 0 ? imageUrls : (imageUrl ? [imageUrl] : []);
 const primaryImageUrl = finalImageUrls[0] || undefined;

 if (editingProduct) {
 // Edit existing
 const productId = editingProduct.id;
 setProducts(products.map(p => p.id === productId ? {
 ...p,
 name,
 price: Number(price),
 description,
 imageUrl: primaryImageUrl,
 imageUrls: finalImageUrls.length > 0 ? finalImageUrls : undefined,
 active,
 category: category.trim() || 'عمومی',
 post_confirm_menu_id: postConfirmMenuId || undefined,
 post_order_form_id: postOrderFormId || undefined,
 trackStock,
 maxPerOrder: maxPerOrder === '' ? undefined : Number(maxPerOrder)
 } : p));

 if (trackStock) {
 saveStockToServer(productId, Number(stockValue) || 0);
 }
 } else {
 // Create new
 const newId = 'prod_' + Math.random().toString(36).substr(2, 9);
 const newProduct: Product = {
 id: newId,
 name,
 price: Number(price),
 description,
 imageUrl: primaryImageUrl,
 imageUrls: finalImageUrls.length > 0 ? finalImageUrls : undefined,
 active,
 category: category.trim() || 'عمومی',
 post_confirm_menu_id: postConfirmMenuId || undefined,
 post_order_form_id: postOrderFormId || undefined,
 trackStock,
 maxPerOrder: maxPerOrder === '' ? undefined : Number(maxPerOrder)
 };
 setProducts([...products, newProduct]);

 if (trackStock) {
 saveStockToServer(newId, Number(stockValue) || 0);
 }
 }
 setIsModalOpen(false);
 };

 const handleDelete = (id: string) => {
 if (window.confirm('آیا از حذف این محصول اطمینان دارید؟')) {
 setProducts(products.filter(p => p.id !== id));
 }
 };

 const toggleActiveStatus = (product: Product) => {
 setProducts(products.map(p => p.id === product.id ? { ...p, active: !p.active } : p));
 };

 const addShopButtonToRootMenu = () => {
 try {
 const saved = localStorage.getItem('kb_menus');
 let menus = saved ? JSON.parse(saved) : {};

 if (!menus['root']) {
 alert('هنوز منوی اصلی (root) رو نساختی — اول برو دکمه‌ساز و منوی اصلی رو بساز.');
 return;
 }

 const alreadyExists = menus['root'].rows?.some((r: any) =>
 r.buttons?.some((b: any) => b.type === 'callback' && b.value === 'cart_shop')
 );

 if (alreadyExists) {
 alert('این دکمه از قبل توی منوی اصلی هست.');
 return;
 }

 const newButton = {
 id: 'btn_' + Date.now(),
 text: '🛍️ فروشگاه',
 type: 'callback',
 value: 'cart_shop'
 };

 menus['root'].rows = [...(menus['root'].rows || []), { id: 'row_' + Date.now(), buttons: [newButton] }];
 localStorage.setItem('kb_menus', JSON.stringify(menus));
 syncNow();
 alert('✅ دکمه‌ی «فروشگاه» به منوی اصلی اضافه شد.');
 } catch (e) {
 console.error(e);
 alert('خطا در تغییر منوهای کیبورد.');
 }
 };

 const allCategories = ['همه', ...Array.from(new Set(products.map(p => p.category || 'عمومی')))];
 const filteredProducts = categoryFilter === 'همه'
 ? products
 : products.filter(p => (p.category || 'عمومی') === categoryFilter);

 return (
 <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-10">
 <div className="flex justify-between items-center">
 <div>
 <h2 className="text-2xl font-bold text-brand-navy flex items-center gap-2">
 <ShoppingBag className="text-brand-teal" />
 مدیریت محصولات فروشگاه
 </h2>
 <p className="text-xs text-brand-navy/50 mt-1">
 محصولات فروشگاه تلگرامی خود را از این قسمت مدیریت، ویرایش و اضافه کنید.
 </p>
 <p className="text-xs text-brand-teal/90 font-medium mt-1">
 💡 محصولات رو می‌تونی مستقیم داخل دکمه‌ساز هم اضافه یا انتخاب کنی.
 </p>
 </div>

 <button
 onClick={openAddModal}
 className="bg-brand-teal hover:bg-brand-teal/90 text-brand-navy px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition-all font-medium text-sm"
 >
 <Plus size={18} />
 افزودن محصول جدید
 </button>
 </div>

 {/* Bot Connection Card (🔌 اتصال به ربات) */}
 <div className="bg-gradient-to-r from-blue-900/40 via-cyan-900/30 to-slate-900/60 border border-cyan-500/30 p-5 rounded-2xl shadow-xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-sky-600 shrink-0">
 <Zap size={20} />
 </div>
 <div>
 <h2 className="text-sm font-bold text-brand-navy flex items-center gap-2">
 <span>🔌 اتصال به ربات</span>
 </h2>
 <p className="text-xs text-brand-navy/60 mt-0.5">
 با افزودن دکمه‌ی «فروشگاه» به منوی اصلی ربات، کاربران می‌توانند مستقیم از محصولات دیدن کنند.
 </p>
 </div>
 </div>

 <button
 onClick={addShopButtonToRootMenu}
 className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-95 text-brand-navy font-bold text-xs rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 shrink-0"
 >
 <Plus size={16} />
 <span>افزودن دکمه‌ی فروشگاه به منوی اصلی</span>
 </button>
 </div>

 <FormsManagerCard />

 {products.length === 0 ? (
 <div className="bg-black/[0.03] border-2 border-dashed border-black/5 rounded-2xl p-12 text-center flex flex-col items-center gap-4">
 <ShoppingBag size={64} className="text-brand-navy/50 opacity-40 animate-pulse" />
 <h3 className="text-lg font-bold text-brand-navy">هیچ محصولی ثبت نشده است</h3>
 <p className="text-brand-navy/50 max-w-md text-sm">
 شما هنوز محصولی به کاتالوگ فروشگاه خود اضافه نکرده‌اید. با کلیک بر روی دکمه بالا، اولین محصول خود را ثبت کنید.
 </p>
 <button
 onClick={openAddModal}
 className="mt-2 bg-brand-teal/10 hover:bg-brand-teal/20 text-brand-teal border border-brand-teal/30 px-4 py-2 rounded-xl text-sm transition-all"
 >
 افزودن اولین محصول
 </button>
 </div>
 ) : (
 <>
 {/* Category Filter Bar */}
 <div className="flex flex-wrap gap-2 mb-4">
 {allCategories.map(cat => (
 <button
 key={cat}
 onClick={() => setCategoryFilter(cat)}
 className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
 categoryFilter === cat
 ? 'bg-brand-teal text-brand-navy'
 : 'bg-black/[0.03] text-brand-navy/50 hover:bg-black/5'
 }`}
 >
 {cat}
 </button>
 ))}
 </div>

 <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
 {filteredProducts.map(product => (
 <GlassCard key={product.id} className="relative flex flex-col justify-between overflow-hidden group">
 <div>
 {/* Product Image */}
 <div className="relative h-36 -mx-6 -mt-6 mb-3 bg-black/[0.03]/40 border-b border-black/5 flex items-center justify-center p-3 overflow-hidden text-center">
 {(() => {
 const displayUrl = getDisplayableImageUrl(product.imageUrl);
 if (displayUrl) {
 return (
 <img
 src={displayUrl}
 alt={product.name}
 referrerPolicy="no-referrer"
 className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
 />
 );
 }
 if (product.imageUrl && product.imageUrl.trim() !== '') {
 return (
 <div className="flex flex-col items-center gap-1 text-brand-teal p-2">
 <ImageIcon size={26} className="animate-pulse" />
 <span className="text-[10px] font-medium leading-relaxed">📷 عکس آپلودشده (کد لایسنس برای دریافت عکس یافت نشد)</span>
 <span className="text-[9px] text-brand-navy/40 font-mono break-all line-clamp-1">{product.imageUrl}</span>
 </div>
 );
 }
 return (
 <div className="flex flex-col items-center gap-1.5 text-brand-navy/40">
 <ImageIcon size={30} className="opacity-60" />
 <span className="text-[10px] opacity-80">بدون تصویر</span>
 </div>
 );
 })()}
 {/* Status Badge */}
 <span
 className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[9px] font-bold ${
 product.active
 ? 'bg-green-500/10 text-green-500 border border-green-500/20'
 : 'bg-red-50 text-red-500 border border-red-200'
 }`}
 >
 {product.active ? 'فعال' : 'غیرفعال'}
 </span>
 {/* Category Badge */}
 <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-brand-teal/10 text-brand-teal border border-brand-teal/20">
 {product.category || 'عمومی'}
 </span>
 {/* Image count badge if > 1 */}
 {product.imageUrls && product.imageUrls.length > 1 && (
 <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-lg text-[9px] font-medium bg-black/60 text-brand-navy border border-black/5 backdrop-blur-sm flex items-center gap-1">
 <ImageIcon size={11} />
 {product.imageUrls.length} عکس
 </span>
 )}
 </div>

 {/* Product Metadata */}
 <div className="space-y-1.5">
 <h3 className="text-base font-bold text-brand-navy line-clamp-1">{product.name}</h3>
 <div className="flex items-center justify-between gap-2">
 <div className="flex items-center gap-1 text-brand-teal font-bold text-xs">
 <DollarSign size={14} />
 <span>{product.price.toLocaleString('fa-IR')} تومان</span>
 </div>
 {product.trackStock && (
 <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${
 (stockLevels[product.id] ?? 0) > 0
 ? 'bg-green-50 text-green-600 border-green-200'
 : 'bg-red-50 text-red-600 border-red-200'
 }`}>
 {(stockLevels[product.id] ?? 0) > 0
 ? `📦 موجودی: ${stockLevels[product.id]}`
 : '❌ ناموجود'}
 </span>
 )}
 </div>
 <p className="text-xs text-brand-navy/50 line-clamp-2 min-h-[36px]">
 {product.description || 'بدون توضیحات.'}
 </p>
 </div>
 </div>

 {/* Actions */}
 <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between">
 <button
 onClick={() => toggleActiveStatus(product)}
 className={`flex items-center gap-1.5 text-xs transition-colors py-1.5 px-2.5 rounded-lg border ${
 product.active
 ? 'text-green-500 bg-green-500/5 hover:bg-green-500/10 border-green-500/20'
 : 'text-brand-navy/50 bg-black/[0.03] hover:bg-black/5 border-black/5'
 }`}
 >
 {product.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
 <span>{product.active ? 'فعال' : 'غیرفعال'}</span>
 </button>

 <div className="flex gap-2">
 <button
 onClick={() => openEditModal(product)}
 className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500/20 transition-colors"
 title="ویرایش محصول"
 >
 <Edit size={16} />
 </button>
 <button
 onClick={() => handleDelete(product.id)}
 className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-500/20 border border-red-200 transition-colors"
 title="حذف محصول"
 >
 <Trash2 size={16} />
 </button>
 </div>
 </div>
 </GlassCard>
 ))}
 </div>
 </>
 )}

 {/* Add / Edit Modal */}
 {isModalOpen && (
 <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
 <div className="bg-white border border-black/5 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
 <div className="flex justify-between items-center p-5 border-b border-black/5 bg-white">
 <h3 className="text-lg font-bold text-brand-navy flex items-center gap-2">
 <ShoppingBag className="text-brand-teal" size={20} />
 {editingProduct ? 'ویرایش محصول' : 'افزودن محصول جدید'}
 </h3>
 <button
 onClick={() => setIsModalOpen(false)}
 className="text-brand-navy/50 hover:text-brand-navy transition-colors"
 >
 <X size={20} />
 </button>
 </div>

 <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
 <div>
 <label className="block text-xs text-brand-navy/50 mb-1.5">نام محصول <span className="text-red-500">*</span></label>
 <input
 type="text"
 value={name}
 onChange={e => setName(e.target.value)}
 placeholder="مثال: اشتراک یک‌ماهه طلایی"
 required
 className="w-full bg-black/[0.03] border border-black/10 text-brand-navy rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-teal transition-colors"
 />
 </div>

 <div>
 <label className="block text-xs text-brand-navy/50 mb-1.5">قیمت (به تومان) <span className="text-red-500">*</span></label>
 <input
 type="text"
 inputMode="numeric"
 value={formatNumberInput(price)}
 onChange={e => setPrice(parseFormattedNumber(e.target.value))}
 placeholder="مثال: 500,000"
 required
 className="w-full bg-black/[0.03] border border-black/10 text-brand-navy rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-teal transition-colors text-right"
 dir="ltr"
 />
 </div>

 <div>
 <label className="block text-xs text-brand-navy/50 mb-1.5">توضیحات محصول</label>
 <textarea
 value={description}
 onChange={e => setDescription(e.target.value)}
 placeholder="توضیحات مربوط به محصول، ویژگی‌ها، نحوه دریافت و غیره..."
 rows={3}
 className="w-full bg-black/[0.03] border border-black/10 text-brand-navy rounded-xl p-4 text-sm outline-none focus:border-brand-teal transition-colors"
 />
 </div>

 <div>
 <div className="flex justify-between items-center mb-1.5">
 <label className="block text-xs text-brand-navy/50">تصاویر محصول (آپلود تا ۱۰ عکس)</label>
 <span className="text-[11px] text-brand-teal font-medium">{imageUrls.length} / ۱۰ عکس</span>
 </div>
 
 <div className="space-y-3">
 {/* Thumbnails Row */}
 {imageUrls.length > 0 && (
 <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 custom-scrollbar">
 {imageUrls.map((img, idx) => {
 const displayUrl = getDisplayableImageUrl(img);
 return (
 <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden bg-black/[0.03] border border-black/5 shrink-0 group">
 {displayUrl ? (
 <img src={displayUrl} alt={`عکس ${idx + 1}`} className="w-full h-full object-cover" />
 ) : (
 <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center bg-brand-teal/10 text-brand-teal text-[9px] font-mono">
 <ImageIcon size={14} />
 <span className="line-clamp-1">{img}</span>
 </div>
 )}
 <button
 type="button"
 onClick={() => handleRemoveImage(idx)}
 className="absolute top-0.5 right-0.5 bg-red-600/80 hover:bg-red-600 text-brand-navy p-1 rounded-full transition-all shadow-md"
 title="حذف عکس"
 >
 <X size={12} />
 </button>
 {idx === 0 && (
 <span className="absolute bottom-0 inset-x-0 bg-brand-teal/80 text-[8px] text-brand-navy text-center py-0.5 font-bold">
 کاور اصلی
 </span>
 )}
 </div>
 );
 })}
 </div>
 )}

 <div className="flex gap-2">
 <input
 type="file"
 accept="image/*"
 multiple
 ref={fileInputRef}
 onChange={handleImageUpload}
 className="hidden"
 />
 <button
 type="button"
 onClick={() => fileInputRef.current?.click()}
 disabled={isUploading || imageUrls.length >= 10}
 className="flex-1 py-2.5 px-4 rounded-xl bg-brand-teal/10 hover:bg-brand-teal/20 text-brand-teal border border-brand-teal/20 transition-all text-sm font-medium flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
 >
 {isUploading ? (
 <span>⏳ در حال آپلود...</span>
 ) : (
 <span>📤 آپلود عکس از گالری (چندتایی)</span>
 )}
 </button>
 </div>
 
 <div className="flex gap-2">
 <input
 type="text"
 value={manualUrlInput}
 onChange={e => setManualUrlInput(e.target.value)}
 onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddManualUrl(); } }}
 placeholder="یا آدرس عکس را وارد کنید: https://..."
 className="flex-1 bg-black/[0.03] border border-black/10 text-brand-navy rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-teal transition-colors text-right"
 dir="ltr"
 />
 <button
 type="button"
 onClick={handleAddManualUrl}
 disabled={!manualUrlInput.trim() || imageUrls.length >= 10}
 className="px-3 py-2 bg-brand-teal hover:bg-brand-teal/90 text-brand-navy rounded-xl text-xs font-medium transition-all disabled:opacity-50"
 >
 افزودن
 </button>
 </div>
 </div>
 </div>

 <div>
 <label className="block text-xs text-brand-navy/50 mb-1.5">دسته‌بندی (اختیاری)</label>
 <input
 type="text"
 value={category}
 onChange={e => setCategory(e.target.value)}
 placeholder="مثال: اشتراک‌ها، فیزیکی، عمومی"
 className="w-full bg-black/[0.03] border border-black/10 text-brand-navy rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-teal transition-colors"
 />
 </div>

 {/* Stock Management */}
 <div className="p-3 bg-black/[0.03] rounded-xl border border-black/5 space-y-3">
 <div className="flex items-center justify-between">
 <div>
 <h4 className="text-sm font-bold text-brand-navy">مدیریت موجودی برای این محصول فعال باشد</h4>
 <p className="text-[10px] text-brand-navy/50 mt-0.5">در صورت فعال بودن، موجودی با هر خرید آنلاین کاهش می‌یابد.</p>
 </div>
 <button
 type="button"
 onClick={() => setTrackStock(!trackStock)}
 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
 trackStock ? 'bg-brand-teal' : 'bg-slate-300'
 }`}
 >
 <span
 className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
 trackStock ? '-translate-x-6' : '-translate-x-1'
 }`}
 />
 </button>
 </div>

 {trackStock && (
 <div className="pt-2 border-t border-black/5">
 <label className="block text-xs text-brand-navy/50 mb-1.5">تعداد موجودی فعلی <span className="text-red-500">*</span></label>
 <input
 type="number"
 min="0"
 value={stockValue}
 onChange={e => setStockValue(e.target.value === '' ? '' : Number(e.target.value))}
 placeholder="مثال: ۱۰"
 className="w-full bg-black/[0.03] border border-black/10 text-brand-navy rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-teal transition-colors text-right"
 dir="ltr"
 />
 </div>
 )}
 </div>

 {/* Per-order quantity cap (product-level override) */}
 <div className="p-3 bg-black/[0.03] rounded-xl border border-black/5">
 <label className="block text-sm font-bold text-brand-navy mb-1">حداکثر تعداد در هر سفارش</label>
 <p className="text-[10px] text-brand-navy/50 mb-2">
 خالی بذارید تا از تنظیم کلی پنل (تنظیمات ← پرداخت) پیروی کنه. عدد بذارید تا فقط برای همین محصول اعمال بشه — مثلاً «۱» یعنی هر مشتری در هر سفارش فقط یک عدد می‌تونه بگیره.
 </p>
 <input
 type="text"
 inputMode="numeric"
 value={formatNumberInput(maxPerOrder)}
 onChange={e => setMaxPerOrder(parseFormattedNumber(e.target.value))}
 placeholder="بدون محدودیت (پیروی از تنظیم کلی)"
 className="w-full bg-white border border-black/10 text-brand-navy rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-teal transition-colors text-right"
 dir="ltr"
 />
 </div>

 <div>
 <label className="block text-xs text-brand-navy/50 mb-1.5">منوی بعد از تایید (اختیاری)</label>
 <select
 value={postConfirmMenuId}
 onChange={e => setPostConfirmMenuId(e.target.value)}
 className="w-full bg-black/[0.03] border border-black/10 text-brand-navy rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-teal transition-colors"
 >
 <option value="">پیش‌فرض سراسری (تنظیمات)</option>
 {Object.entries(getKbMenus()).map(([id, menu]) => (
 <option key={id} value={id}>
 {menu?.title || menu?.content || id} ({id})
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-xs text-brand-navy/50 mb-1.5">فرم بعد از تایید (اختیاری)</label>
 <select
 value={postOrderFormId}
 onChange={e => setPostOrderFormId(e.target.value)}
 className="w-full bg-black/[0.03] border border-black/10 text-brand-navy rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-teal transition-colors"
 >
 <option value="">پیش‌فرض سراسری (تنظیمات)</option>
 {Object.entries(getKbForms()).map(([id, form]) => (
 <option key={id} value={id}>
 {form?.title || id} ({id})
 </option>
 ))}
 </select>
 <p className="text-[11px] text-brand-navy/50 mt-2 leading-relaxed">
 اگر اینجا چیزی انتخاب نکنید، همان تنظیم پیش‌فرضی که در صفحه تنظیمات گذاشته‌اید استفاده می‌شود. برای هر محصول می‌توانید جدا مشخص کنید.
 </p>
 </div>

 <div className="flex items-center justify-between p-3 bg-black/[0.03] rounded-xl border border-black/5">
 <div>
 <h4 className="text-sm font-bold text-brand-navy">وضعیت نمایش محصول</h4>
 <p className="text-[10px] text-brand-navy/50 mt-0.5">در صورت غیرفعال بودن، در فروشگاه نمایش داده نمی‌شود.</p>
 </div>
 <button
 type="button"
 onClick={() => setActive(!active)}
 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
 active ? 'bg-brand-teal' : 'bg-slate-300'
 }`}
 >
 <span
 className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
 active ? '-translate-x-6' : '-translate-x-1'
 }`}
 />
 </button>
 </div>

 <div className="flex justify-end gap-3 pt-4 border-t border-black/5">
 <button
 type="button"
 onClick={() => setIsModalOpen(false)}
 className="px-4 py-2 rounded-xl text-brand-navy/60 hover:text-brand-navy text-sm font-medium transition-colors"
 >
 انصراف
 </button>
 <button
 type="submit"
 className="bg-brand-teal hover:bg-brand-teal/90 text-brand-navy px-5 py-2 rounded-xl text-sm font-medium transition-all shadow-lg flex items-center gap-1.5"
 >
 <Check size={16} />
 {editingProduct ? 'ذخیره تغییرات' : 'افزودن به محصولات'}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
};
