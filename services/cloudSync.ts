// A "credential" is either the owner's license code, or an assistant's
// session access_token (issued by /api/auth/admin) — never both. Every
// function below accepts this shape instead of a bare code string, so the
// same save/load/autosave machinery works identically for both roles; the
// backend (/api/data/save, /api/data/load) is what actually resolves which
// one it is and enforces what an assistant session can't touch.
export interface StoredCredential {
  code?: string;
  access_token?: string;
}

// Reads whichever credential is currently stored for this device — the
// owner's license_cache if present, otherwise an assistant's
// assistant_session_cache. A device is only ever one or the other.
export const getStoredCredential = (): StoredCredential | null => {
  try {
    const ownerStr = localStorage.getItem('license_cache');
    if (ownerStr) {
      const cache = JSON.parse(ownerStr);
      if (cache.code) return { code: cache.code };
    }
  } catch (e) {}

  try {
    const assistantStr = localStorage.getItem('assistant_session_cache');
    if (assistantStr) {
      const cache = JSON.parse(assistantStr);
      if (cache.access_token) return { access_token: cache.access_token };
    }
  } catch (e) {}

  return null;
};

export const saveToCloud = async (credential: StoredCredential): Promise<boolean> => {
  try {
    if (!credential || (!credential.code && !credential.access_token)) return false;

    const backupData = {
      meta: {
        version: "2.5.3",
        exported_at: new Date().toISOString(),
        type: "full_backup"
      },
      config: {
        token: localStorage.getItem('bot_token'),
        db_channel: localStorage.getItem('bot_db_channel'),
        webhook_url: localStorage.getItem('bot_webhook_url'),
        theme: localStorage.getItem('theme'),
        force_join: localStorage.getItem('force_join_enabled'),
        payment_card_number: localStorage.getItem('payment_card_number'),
        payment_card_owner: localStorage.getItem('payment_card_owner'),
        admin_chat_id: localStorage.getItem('admin_chat_id'),
        support_chat_id: localStorage.getItem('support_chat_id'),
        post_confirm_menu_id: localStorage.getItem('post_confirm_menu_id'),
        miniapp_modules: JSON.parse(localStorage.getItem('miniapp_modules') || '["shop"]'),
        booking_hours: JSON.parse(localStorage.getItem('booking_hours') || '{}'),
        admins: JSON.parse(localStorage.getItem('bot_admins') || '[]'),
        auto_backup_enabled: localStorage.getItem('auto_backup_enabled') === 'true',
        auto_backup_frequency: localStorage.getItem('auto_backup_frequency') || 'daily',
        custom_texts: JSON.parse(localStorage.getItem('custom_texts') || '{}'),
        profile_photo_file_id: localStorage.getItem('profile_photo_file_id') || null
      },
      data: {
        menus: JSON.parse(localStorage.getItem('kb_menus') || '{}'),
        forms: JSON.parse(localStorage.getItem('kb_forms') || '{}'),
        commands: JSON.parse(localStorage.getItem('bot_commands') || '[]'),
        channels: JSON.parse(localStorage.getItem('saved_channels') || '[]'),
        templates: JSON.parse(localStorage.getItem('broadcast_templates') || '[]'),
        users: JSON.parse(localStorage.getItem('bot_users') || '[]'),
        logs: JSON.parse(localStorage.getItem('bot_logs') || '[]'),
        queue: JSON.parse(localStorage.getItem('channel_queue') || '[]'),
        products: JSON.parse(localStorage.getItem('bot_products') || '[]'),
        carts: JSON.parse(localStorage.getItem('bot_carts') || '{}'),
        orders: JSON.parse(localStorage.getItem('bot_orders') || '[]'),
        tickets: JSON.parse(localStorage.getItem('bot_tickets') || '[]'),
        automations: JSON.parse(localStorage.getItem('bot_automations') || '[]'),
        gallery: JSON.parse(localStorage.getItem('gallery_images') || '[]'),
        services: JSON.parse(localStorage.getItem('booking_services') || '[]'),
        providers: JSON.parse(localStorage.getItem('booking_providers') || '[]'),
        coupons: JSON.parse(localStorage.getItem('coupons') || '[]')
      }
    };

    const res = await fetch('https://corepanel-api.tajikr450.workers.dev/api/data/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...credential, data: backupData })
    });
    
    const result = await res.json();
    return !!result.ok;
  } catch (e) {
    console.warn('Failed to save state to cloud:', e);
    return false;
  }
};

export const loadFromCloud = async (credential: StoredCredential): Promise<boolean> => {
  try {
    if (!credential || (!credential.code && !credential.access_token)) return false;

    const res = await fetch('https://corepanel-api.tajikr450.workers.dev/api/data/load', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credential)
    });

    const result = await res.json();
    if (result.ok && result.data) {
      const json = result.data;
      const config = json.config || {};
      const data = json.data || {};

      // Restore Config — every field is written unconditionally (with an
      // explicit empty fallback), never "only if truthy". A brand-new shop
      // that hasn't set its bot token yet has an EMPTY token, and the old
      // conditional version would then just skip writing it — silently
      // leaving whatever token a *previous* shop's session had left behind
      // on this same browser still sitting in localStorage. That's exactly
      // how a switch to shop B ended up still showing shop A's bot: nothing
      // ever told the browser "this field is now empty for this shop."
      localStorage.setItem('bot_token', config.token || '');
      localStorage.setItem('bot_db_channel', config.db_channel || '');
      localStorage.setItem('bot_webhook_url', config.webhook_url || '');
      localStorage.setItem('force_join_enabled', config.force_join || '');
      localStorage.setItem('payment_card_number', config.payment_card_number || '');
      localStorage.setItem('payment_card_owner', config.payment_card_owner || '');
      localStorage.setItem('admin_chat_id', config.admin_chat_id || '');
      localStorage.setItem('support_chat_id', config.support_chat_id || '');
      localStorage.setItem('post_confirm_menu_id', config.post_confirm_menu_id || '');
      localStorage.setItem('miniapp_modules', JSON.stringify(config.miniapp_modules || ['shop']));
      localStorage.setItem('booking_hours', JSON.stringify(config.booking_hours || {}));
      localStorage.setItem('bot_admins', JSON.stringify(config.admins || []));
      localStorage.setItem('auto_backup_enabled', String(!!config.auto_backup_enabled));
      localStorage.setItem('auto_backup_frequency', config.auto_backup_frequency || 'daily');
      localStorage.setItem('custom_texts', JSON.stringify(config.custom_texts || {}));
      localStorage.setItem('profile_photo_file_id', config.profile_photo_file_id || '');

      // Restore Data — same reasoning, unconditional for every key.
      localStorage.setItem('kb_menus', JSON.stringify(data.menus || {}));
      localStorage.setItem('kb_forms', JSON.stringify(data.forms || {}));
      localStorage.setItem('bot_commands', JSON.stringify(data.commands || []));
      localStorage.setItem('saved_channels', JSON.stringify(data.channels || []));
      localStorage.setItem('broadcast_templates', JSON.stringify(data.templates || []));
      localStorage.setItem('bot_users', JSON.stringify(data.users || []));
      localStorage.setItem('bot_logs', JSON.stringify(data.logs || []));
      localStorage.setItem('channel_queue', JSON.stringify(data.queue || []));
      localStorage.setItem('bot_products', JSON.stringify(data.products || []));
      localStorage.setItem('bot_carts', JSON.stringify(data.carts || {}));
      localStorage.setItem('bot_orders', JSON.stringify(data.orders || []));
      localStorage.setItem('bot_tickets', JSON.stringify(data.tickets || []));
      localStorage.setItem('bot_automations', JSON.stringify(data.automations || []));
      localStorage.setItem('gallery_images', JSON.stringify(data.gallery || []));
      localStorage.setItem('booking_services', JSON.stringify(data.services || []));
      localStorage.setItem('booking_providers', JSON.stringify(data.providers || []));
      localStorage.setItem('bookings_cache', JSON.stringify(data.bookings || []));
      localStorage.setItem('coupons', JSON.stringify(data.coupons || []));
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Failed to load state from cloud:', e);
    return false;
  }
};

let syncTimer: ReturnType<typeof setTimeout> | null = null;

export const syncNow = () => {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    try {
      const credential = getStoredCredential();
      if (credential) {
        saveToCloud(credential);
      }
    } catch (e) {
      // silent fail
    }
  }, 400);
};