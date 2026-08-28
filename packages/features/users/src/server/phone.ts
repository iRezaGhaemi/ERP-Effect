import { DomainError } from '@effect-erp/contracts';

const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
const arabicDigits = '٠١٢٣٤٥٦٧٨٩';

function toEnglishDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persianIndex = persianDigits.indexOf(digit);
    return persianIndex >= 0 ? String(persianIndex) : String(arabicDigits.indexOf(digit));
  });
}

export function normalizeIranianMobile(value: string): string {
  const compact = toEnglishDigits(value).trim().replace(/[\s-]/g, '');
  const canonical = compact.startsWith('0098')
    ? `+${compact.slice(2)}`
    : compact.startsWith('0')
      ? `+98${compact.slice(1)}`
      : compact.startsWith('98')
        ? `+${compact}`
        : compact;

  if (!/^\+989\d{9}$/.test(canonical)) {
    throw new DomainError('PHONE_INVALID', 'شماره موبایل معتبر نیست.');
  }

  return canonical;
}
