// Shared helpers for money/quantity <input> fields that show live
// thousands-separator formatting (e.g. typing 500000 displays as
// "500,000") instead of a plain type="number" box, which is where the
// "500000 vs 5000000 — did I add one too many zeros?" mistake happens.
//
// The input itself must be type="text" (browsers strip anything
// non-numeric, including commas, out of a type="number" box), so these
// helpers do the formatting/parsing by hand instead.

// Iranian keyboards commonly produce Persian digits (۰-۹) even in a field
// meant for plain numbers — convert those (and the Arabic-Indic variant
// ٠-٩, used by some keyboard layouts) to normal digits before parsing, or
// typing a price with a Persian keyboard would silently strip every digit.
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

function toEnglishDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (ch) => {
    const persianIdx = PERSIAN_DIGITS.indexOf(ch);
    if (persianIdx > -1) return String(persianIdx);
    const arabicIdx = ARABIC_DIGITS.indexOf(ch);
    if (arabicIdx > -1) return String(arabicIdx);
    return ch;
  });
}

// Extracts a clean integer (or '' if empty) from whatever the user typed —
// strips commas, spaces, and anything else that isn't a digit, and
// normalizes Persian/Arabic digits first.
export function parseFormattedNumber(raw: string): number | '' {
  const digitsOnly = toEnglishDigits(raw).replace(/[^\d]/g, '');
  return digitsOnly === '' ? '' : Number(digitsOnly);
}

// Formats a number (or '') for display inside the input, with English
// thousands separators (500000 -> "500,000") — plain commas rather than
// toLocaleString('fa-IR') on purpose, since the field is dir="ltr" and
// mixing Persian digits into an LTR-typed box reads awkwardly while typing.
export function formatNumberInput(value: number | ''): string {
  if (value === '') return '';
  return value.toLocaleString('en-US');
}

// String-state variants of the two helpers above, for forms that keep
// their field values as raw strings rather than numbers (e.g. the coupon
// form, where '' vs '0' are meaningfully different and the value is
// passed straight through to the API). Same behaviour, no number round-trip.
export function formatNumberString(raw: string): string {
  const digitsOnly = toEnglishDigits(raw || '').replace(/[^\d]/g, '');
  if (digitsOnly === '') return '';
  return Number(digitsOnly).toLocaleString('en-US');
}

export function parseNumberString(raw: string): string {
  return toEnglishDigits(raw || '').replace(/[^\d]/g, '');
}
