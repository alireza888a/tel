import DOMPurify from 'dompurify';

/**
 * Telegram's Bot API HTML parse_mode only ever supports this small tag
 * set (see https://core.telegram.org/bots/api#html-style). Any HTML a
 * merchant types into a broadcast/announcement/message box is meant to be
 * interpreted as exactly that subset by Telegram — never as arbitrary
 * browser HTML.
 *
 * We render some of that same merchant-authored text directly in the
 * browser (the Mini App's announcements feed, the Channels page's live
 * preview) via dangerouslySetInnerHTML. Without sanitizing first, that
 * turns any merchant-entered (or merchant-account-compromised) payload —
 * e.g. `<img src=x onerror=...>` or `<svg onload=...>` — into script
 * execution inside a real user's browser/Telegram WebView, which for the
 * Mini App case has access to Telegram.WebApp and initData. Restricting
 * the allow-list to Telegram's own supported tags/attributes closes that
 * off while leaving every legitimate formatting option merchants already
 * rely on fully intact.
 */
const TELEGRAM_ALLOWED_TAGS = [
  'b', 'strong', 'i', 'em', 'u', 'ins', 's', 'strike', 'del',
  'a', 'code', 'pre', 'tg-spoiler', 'span', 'br', 'blockquote',
];

const TELEGRAM_ALLOWED_ATTR = ['href', 'class'];

export function sanitizeTelegramHtml(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: TELEGRAM_ALLOWED_TAGS,
    ALLOWED_ATTR: TELEGRAM_ALLOWED_ATTR,
    // belt-and-suspenders: never allow a javascript:/data: href even
    // though ALLOWED_ATTR already restricts which attributes survive
    ALLOWED_URI_REGEXP: /^(?:https?|tg):/i,
  });
}
