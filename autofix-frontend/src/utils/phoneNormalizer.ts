export function normalizeDigits(input: string): string {
  if (!input) return '';
  let res = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code >= 0x0660 && code <= 0x0669) {
      res += String.fromCharCode(48 + (code - 0x0660));
    } else if (code >= 0x06f0 && code <= 0x06f9) {
      res += String.fromCharCode(48 + (code - 0x06f0));
    } else {
      res += input[i];
    }
  }
  return res;
}

export function normalizePhoneForWhatsApp(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== 'string') return null;
  const digitsConverted = normalizeDigits(phone);
  let digits = digitsConverted.replace(/\D/g, '');

  if (digits.startsWith('0020')) {
    digits = digits.substring(2);
  } else if (digits.startsWith('01') && digits.length === 11) {
    digits = '2' + digits;
  } else if ((digits.startsWith('10') || digits.startsWith('11') || digits.startsWith('12') || digits.startsWith('15')) && digits.length === 10) {
    digits = '20' + digits;
  }

  if (/^20(10|11|12|15)\d{8}$/.test(digits)) {
    return digits;
  }

  return null;
}
