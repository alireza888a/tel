// ============================================================
// Silent one-time migration: upgrades any "webapp" button whose URL still
// embeds the private license code (old, insecure format — see the security
// fix in ButtonPropertiesCard.tsx) to the safe access_token-based URL.
//
// How we tell old vs. new apart: a license code always looks like
// "ALV-XXXX-XXXX-XXXX" (dashes, ALV- prefix — see randomLicenseCode() on
// the backend). An access_token is a plain 32-character string with NO
// dashes (see randomAlnum(32) on the backend). So: if the `code=` value in
// a webapp button's URL contains a dash, it's the old/unsafe format and
// needs replacing. If it has no dash, it's already safe — leave it alone.
//
// This runs once, automatically, whenever the panel loads (see App.tsx).
// It never touches buttons that are already safe, and it fails silently
// (does nothing) if there's no access_token yet — in that case the
// merchant just hasn't connected their bot/logged in fully yet, and the
// normal login flow will set webhook_access_token soon anyway.
// ============================================================

export function migrateMiniAppButtonUrls(): boolean {
  try {
    const accessToken = localStorage.getItem('webhook_access_token');
    if (!accessToken) return false; // nothing we can safely migrate to yet

    const savedMenus = localStorage.getItem('kb_menus');
    if (!savedMenus) return false;

    const menus = JSON.parse(savedMenus);
    if (!menus || typeof menus !== 'object') return false;

    let changed = false;

    for (const menuId of Object.keys(menus)) {
      const menu = menus[menuId];
      if (!menu || !Array.isArray(menu.rows)) continue;

      for (const row of menu.rows) {
        if (!row || !Array.isArray(row.buttons)) continue;

        for (const button of row.buttons) {
          if (!button || button.type !== 'webapp' || !button.webAppUrl) continue;

          const match = button.webAppUrl.match(/([?&])code=([^&]+)/);
          if (!match) continue;

          const currentCode = decodeURIComponent(match[2]);
          const looksLikeOldLicenseCode = currentCode.includes('-');
          if (!looksLikeOldLicenseCode) continue; // already the safe format

          const newUrl = button.webAppUrl.replace(
            /([?&])code=[^&]+/,
            `$1code=${encodeURIComponent(accessToken)}`
          );
          button.webAppUrl = newUrl;
          button.value = newUrl; // kept in sync with webAppUrl, same as when the button is first created
          changed = true;
        }
      }
    }

    if (changed) {
      localStorage.setItem('kb_menus', JSON.stringify(menus));
    }

    return changed;
  } catch (e) {
    console.error('migrateMiniAppButtonUrls error:', e);
    return false;
  }
}
