
import React from 'react';

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export interface Channel {
  id: number | string;
  name: string;
  members: number;
  role: 'creator' | 'admin';
  username: string;
  isLocked?: boolean; // New: For Force Join
}

export interface BotConfig {
  token: string;
  name: string;
  webhookUrl: string;
  isActive: boolean;
}

export type ButtonActionType = 'link' | 'submenu' | 'form' | 'command' | 'callback' | 'inquiry' | 'product' | 'ticket' | 'api' | 'webapp';

export interface InquiryConfig {
    adminId: string; // The admin who receives the lead
    catalogFileId?: string; // Telegram File ID of the PDF/Image
    catalogFileName?: string;
    catalogType?: 'image' | 'document';
    responseText: string; // What the bot says to the user (e.g. "Here is the catalog, message me")
}

export interface InlineButton {
  id: string;
  text: string;
  type: ButtonActionType;
  value?: string; // URL, Command, or Webview URL
  targetMenuId?: string; // ID of the submenu Page if type is 'submenu'
  inquiryConfig?: InquiryConfig; // NEW: For Inquiry/Lead Gen buttons
  productId?: string; // NEW: For Mini Shop Product buttons
  apiUrl?: string; // NEW: For API / Webhook buttons
  webAppUrl?: string; // NEW: For Telegram Mini App URL
  color?: 'default' | 'blue' | 'green' | 'red' | 'gold' | 'orange'; // NEW: Colored inline buttons
  condition?: {
    type: 'none' | 'order_status_confirmed' | 'product_category';
    value?: string;
  };
}

export interface InlineRow {
  id: string;
  buttons: InlineButton[];
}

export interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string; // Used for File_ID if available, or Blob URL as fallback
  previewUrl?: string; // Always a Blob URL for displaying in the browser UI
  name: string;
  fileId?: string; // The Telegram File ID (Persistent)
}

export interface MenuPage {
  id: string;
  title: string; // Internal admin title
  content: string; // The message text
  media: MediaAttachment[];
  rows: InlineRow[];
  parentId?: string; // To navigate back
}

export type FormQuestionType = 'text' | 'number' | 'photo' | 'document' | 'video' | 'audio' | 'location' | 'date' | 'select' | 'checkbox';

export interface FormQuestion {
    id: string;
    text: string;
    type: FormQuestionType;
    options?: string[];
}

export interface FormConfig {
    id: string;
    title: string;
    adminId: string;
    questions: FormQuestion[];
    visibleInMiniApp?: boolean;
}

export interface CommandConfig {
    command: string; // e.g., "start" (no slash)
    description: string; // e.g., "شروع مجدد ربات"
    actionType: 'menu' | 'text' | 'function';
    actionValue: string; // MenuID, Text Content, or Function Name
}

// --- NEW TYPES FOR BROADCAST & QUEUE ---

export interface QueueItem {
    id: string;
    content: string;
    hasMedia: boolean; 
    mediaType?: 'image' | 'video' | 'audio';
    // Inline buttons support
    rows: InlineRow[]; 
    settings: {
        pin: boolean;
        silent: boolean;
        protect: boolean;
        addReactions: boolean;
    };
    targetChannelId: string; // 'all' or specific ID
    status: 'pending' | 'sent' | 'failed';
    createdAt: number; // Scheduled time timestamp
    error?: string;
    mediaFiles?: MediaAttachment[]; // Support for file IDs in queue
}

export interface ChannelSchedule {
    channelId: string; // 'all' or specific ID
    intervalMinutes: number; // e.g. 60 for 1 hour, 1440 for 1 day
    lastSentAt: number;
    active: boolean;
}

// --- NEW TYPES FOR CHANNELS PAGE ---

export interface SavedChannel {
    id: string | number;
    type: 'channel' | 'group';
    title: string;
    username: string;
    photo?: string | null;
    addedAt: number;
    isAdmin: boolean;
    statusCheckTime: number;
    isLocked?: boolean;
    /** Only meaningful for private channels/groups (no public username) — the
     * join button used by force-join needs SOME working link, and a private
     * chat has no "https://t.me/<username>" to fall back on. */
    inviteLink?: string;
}

export interface SentMessageLog {
    id: string | number;
    text: string;
    sentAt: number | string;
    messageId?: number;
    chatId?: string;
    hasMedia?: boolean;
    successCount?: number;
    failCount?: number;
    targetCount?: number;
}

export interface MediaFile {
    id: string;
    file: File | null;
    type: 'image' | 'video' | 'audio';
    preview: string;
    fileId?: string;
}

export type MiniAppModule = 'shop' | 'orders' | 'support' | 'forms' | 'gallery' | 'announcements' | 'booking';

export interface BookableService {
  id: string;
  name: string;
  durationMinutes: number;
  price?: number;
  active: boolean;
  providerIds?: string[];
  description?: string;
}

export interface WorkingHours {
  sun?: { start: string; end: string } | null;
  mon?: { start: string; end: string } | null;
  tue?: { start: string; end: string } | null;
  wed?: { start: string; end: string } | null;
  thu?: { start: string; end: string } | null;
  fri?: { start: string; end: string } | null;
  sat?: { start: string; end: string } | null;
  maxPerDay?: number;
}

export interface Provider {
  id: string;
  name: string;
  active: boolean;
  workingHours: WorkingHours;
  description?: string;
  maxBookingsPerDay?: number;
  exceptions?: {
    date: string;
    closed: boolean;
    hours?: { start: string; end: string };
  }[];
}

export interface Booking {
  id: string; // BKG-XXXXXX
  serviceId: string;
  providerId?: string | null;
  userId: string;
  userFirstName: string;
  contactInfo?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: number;
  remindedAt: number | null;
}

export interface GalleryImage {
  id: string;
  imageUrl: string; // file_id یا URL
  caption?: string;
}

export interface MiniAppConfig {
  enabledModules: MiniAppModule[];
}

export interface Product {
  id: string;
  name: string;
  price: number; // تومان
  description: string;
  imageUrl?: string;
  imageUrls?: string[];
  active: boolean;
  category?: string;
  post_confirm_menu_id?: string;
  post_order_form_id?: string;
  trackStock?: boolean;
  /** Live remaining stock, sent only by /api/shop/:code/products (Mini App
   *  feed) for trackStock products — null when not tracked, undefined
   *  everywhere else (e.g. the admin panel's own Product objects, which
   *  get stock separately via /api/products/stock/list). */
  stock?: number | null;
  /** Optional per-product cap on how many units one buyer can put in a
   *  single order. Overrides the shop-wide config.max_per_order when set;
   *  undefined means "follow the global setting" (which itself may be
   *  unset, meaning unlimited). */
  maxPerOrder?: number;
}

export interface CartItem {
  productId: string;
  qty: number;
}

export interface Order {
  id: string;
  userId: string; // آیدی عددی کاربر تلگرام
  userFirstName: string;
  items: { productId: string; name: string; price: number; qty: number }[];
  total: number;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: number;
  fulfillment?: { q?: string; a?: string; question?: string; answer?: string }[] | Record<string, string>;
}

export interface BotTicket {
  id: string; // مانند "SUP-X9F4"
  userId: string;
  userFirstName: string;
  message: string;
  status: 'open' | 'answered';
  adminReply?: string;
  createdAt: number | string;
  repliedAt?: number | string;
}

export type AutomationTrigger = 'new_order' | 'order_rejected' | 'new_user' | 'ticket_created';

export interface AutomationRule {
  id: string;
  trigger: AutomationTrigger;
  enabled: boolean;
  productCategory?: string; // اختیاری — فقط برای new_order/order_rejected؛ خالی یعنی برای همه محصولات
  menuId?: string;          // اختیاری — کدوم منو ارسال بشه
  formId?: string;          // اختیاری — کدوم فرم شروع بشه
  messageText?: string;     // اختیاری — یه متن ثابت اضافه (می‌تونه با بقیه ترکیب بشه)
}

export interface Coupon {
  code: string;                          // یکتا، حروف بزرگ، مثل "WELCOME10"
  discountType: 'percent' | 'fixed';
  discountValue: number;                 // درصد (0-100) یا مبلغ ثابت به تومان
  active: boolean;
  maxUses?: number;                      // سقف کل استفاده (همه‌ی خریدارها با هم)
  perUserLimit?: number;                 // سقف استفاده برای هر خریدار (مثلاً 1 = فقط یکبار)
  minOrderAmount?: number;               // حداقل مبلغ سفارش برای اعمال کد
  expiresAt?: number;                    // timestamp میلی‌ثانیه، اختیاری
  createdAt: number;
}


