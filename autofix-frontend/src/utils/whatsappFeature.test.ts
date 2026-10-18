import { describe, it, expect } from 'vitest';
import { normalizePhoneForWhatsApp } from './phoneNormalizer';
import { buildWhatsAppMessage, DEFAULT_WHATSAPP_TEMPLATE } from './whatsappTemplateHelper';

describe('Phone Normalization for WhatsApp', () => {
  it('normalizes standard 11-digit local Egyptian numbers', () => {
    expect(normalizePhoneForWhatsApp('01012345678')).toBe('201012345678');
    expect(normalizePhoneForWhatsApp('01198765432')).toBe('201198765432');
    expect(normalizePhoneForWhatsApp('01233344555')).toBe('201233344555');
    expect(normalizePhoneForWhatsApp('01511122333')).toBe('201511122333');
  });

  it('normalizes international numbers with +20 prefix', () => {
    expect(normalizePhoneForWhatsApp('+201012345678')).toBe('201012345678');
    expect(normalizePhoneForWhatsApp('+201198765432')).toBe('201198765432');
  });

  it('normalizes numbers with 0020 prefix', () => {
    expect(normalizePhoneForWhatsApp('00201012345678')).toBe('201012345678');
    expect(normalizePhoneForWhatsApp('00201233344555')).toBe('201233344555');
  });

  it('normalizes numbers already starting with 20 without +', () => {
    expect(normalizePhoneForWhatsApp('201012345678')).toBe('201012345678');
  });

  it('normalizes 10-digit numbers starting directly with network code', () => {
    expect(normalizePhoneForWhatsApp('1012345678')).toBe('201012345678');
    expect(normalizePhoneForWhatsApp('1511122333')).toBe('201511122333');
  });

  it('normalizes Eastern Arabic digits', () => {
    expect(normalizePhoneForWhatsApp('٠١٠١٢٣٤٥٦٧٨')).toBe('201012345678');
    expect(normalizePhoneForWhatsApp('+٢٠١٠١٢٣٤٥٦٧٨')).toBe('201012345678');
  });

  it('normalizes Persian digits', () => {
    expect(normalizePhoneForWhatsApp('۰۱۰۱۲۳۴۵۶۷۸')).toBe('201012345678');
    expect(normalizePhoneForWhatsApp('۰۱۱-۱۲۳۴-۵۶۷۸')).toBe('201112345678');
  });

  it('handles spaces, dashes, dots and parentheses', () => {
    expect(normalizePhoneForWhatsApp('+20 10-1234-5678')).toBe('201012345678');
    expect(normalizePhoneForWhatsApp('  011 9876 5432  ')).toBe('201198765432');
    expect(normalizePhoneForWhatsApp('+20 (15) 1234-5678')).toBe('201512345678');
    expect(normalizePhoneForWhatsApp('0020 12 1234 5678')).toBe('201212345678');
    expect(normalizePhoneForWhatsApp('+20.10.1234.5678')).toBe('201012345678');
  });

  it('returns null for invalid carrier prefix', () => {
    expect(normalizePhoneForWhatsApp('01312345678')).toBeNull();
    expect(normalizePhoneForWhatsApp('01812345678')).toBeNull();
    expect(normalizePhoneForWhatsApp('01712345678')).toBeNull();
    expect(normalizePhoneForWhatsApp('0212345678')).toBeNull();
  });

  it('returns null for too short or too long numbers', () => {
    expect(normalizePhoneForWhatsApp('010123456')).toBeNull();
    expect(normalizePhoneForWhatsApp('20101234567899')).toBeNull();
  });

  it('returns null for empty or non-digit input', () => {
    expect(normalizePhoneForWhatsApp('')).toBeNull();
    expect(normalizePhoneForWhatsApp('   ')).toBeNull();
    expect(normalizePhoneForWhatsApp(null)).toBeNull();
    expect(normalizePhoneForWhatsApp(undefined)).toBeNull();
    expect(normalizePhoneForWhatsApp('abcdefghijk')).toBeNull();
  });
});

describe('WhatsApp Template Message Builder', () => {
  it('correctly builds message for paid in full invoice', () => {
    const msg = buildWhatsAppMessage(DEFAULT_WHATSAPP_TEMPLATE, {
      customerName: 'طارق سليم',
      workshopName: 'AP AUTO SERVICE CENTER',
      invoiceNumber: 'INV-202610-0007',
      invoiceDate: '2026-10-18',
      carMake: 'Kia',
      carModel: 'Sportage',
      plate: 'ط ر ق 1000',
      total: 650,
      paid: 650,
      remaining: 0,
      notes: '',
      workshopPhone: '01277252262'
    });

    expect(msg).toContain('طارق سليم');
    expect(msg).toContain('AP AUTO SERVICE CENTER');
    expect(msg).toContain('INV-202610-0007');
    expect(msg).toContain('650.00 ج.م');
    expect(msg).toContain('🎉 تم السداد بالكامل');
    expect(msg).not.toContain('المتبقي:');
    expect(msg).not.toContain('{');
    expect(msg).not.toContain('undefined');
    expect(msg).not.toContain('null');
  });

  it('correctly builds message for partially paid invoice', () => {
    const msg = buildWhatsAppMessage(DEFAULT_WHATSAPP_TEMPLATE, {
      customerName: 'طارق سليم',
      workshopName: 'AP AUTO SERVICE CENTER',
      invoiceNumber: 'INV-202610-0007',
      invoiceDate: '2026-10-18',
      carMake: 'Kia',
      carModel: 'Sportage',
      plate: 'ط ر ق 1000',
      total: 650,
      paid: 300,
      remaining: 350,
      notes: 'دفعة تحت الحساب',
      workshopPhone: '01277252262'
    });

    expect(msg).toContain('💰 *الإجمالي:* 650.00 ج.م');
    expect(msg).toContain('✅ *المدفوع:* 300.00 ج.م');
    expect(msg).toContain('⏳ *المتبقي:* 350.00 ج.م');
    expect(msg).toContain('دفعة تحت الحساب');
    expect(msg).toContain('01277252262');
    expect(msg).not.toContain('🎉 تم السداد بالكامل');
  });

  it('correctly builds message for completely unpaid invoice', () => {
    const msg = buildWhatsAppMessage(DEFAULT_WHATSAPP_TEMPLATE, {
      customerName: 'محمود عادل',
      workshopName: 'AP AUTO SERVICE CENTER',
      invoiceNumber: 'INV-202610-0010',
      invoiceDate: '2026-10-18',
      carMake: 'Hyundai',
      carModel: 'Elantra',
      plate: 'ع د ل 2020',
      total: 1500,
      paid: 0,
      remaining: 1500,
      notes: '',
      workshopPhone: '01277252262'
    });

    expect(msg).toContain('💰 *الإجمالي:* 1500.00 ج.م');
    expect(msg).toContain('✅ *المدفوع:* 0.00 ج.م');
    expect(msg).toContain('⏳ *المتبقي:* 1500.00 ج.م');
    expect(msg).not.toContain('🎉 تم السداد بالكامل');
  });

  it('omits notes line when notes are empty', () => {
    const msg = buildWhatsAppMessage(DEFAULT_WHATSAPP_TEMPLATE, {
      customerName: 'علي سامي',
      workshopName: 'AP AUTO SERVICE CENTER',
      invoiceNumber: 'INV-202610-0011',
      invoiceDate: '2026-10-18',
      carMake: 'Toyota',
      carModel: 'Corolla',
      plate: 'س ا م 123',
      total: 400,
      paid: 400,
      remaining: 0,
      notes: '   ',
      workshopPhone: '01277252262'
    });

    expect(msg).not.toContain('ملاحظات');
    expect(msg).not.toContain('{notesLine}');
  });

  it('omits workshop phone line when phone is empty', () => {
    const msg = buildWhatsAppMessage(DEFAULT_WHATSAPP_TEMPLATE, {
      customerName: 'سالم جابر',
      workshopName: 'AP AUTO SERVICE CENTER',
      invoiceNumber: 'INV-202610-0012',
      invoiceDate: '2026-10-18',
      carMake: 'Nissan',
      carModel: 'Sunny',
      plate: 'ج ب ر 456',
      total: 800,
      paid: 800,
      remaining: 0,
      notes: '',
      workshopPhone: ''
    });

    expect(msg).not.toContain('للاستفسار');
    expect(msg).not.toContain('{workshopPhone}');
  });

  it('renders Arabic names with special characters correctly', () => {
    const msg = buildWhatsAppMessage(DEFAULT_WHATSAPP_TEMPLATE, {
      customerName: 'أ.د/ محمد عبد الرحمن (أبو خالد) - & #',
      workshopName: 'AP AUTO SERVICE CENTER',
      invoiceNumber: 'INV-202610-0013',
      invoiceDate: '2026-10-18',
      carMake: 'BMW',
      carModel: 'X5',
      plate: 'ب م و 999',
      total: 3250.75,
      paid: 3250.75,
      remaining: 0,
      notes: 'تغيير زيت تخليقي 5W40 + فحص كمبيوتر كامل',
      workshopPhone: '01277252262'
    });

    expect(msg).toContain('أ.د/ محمد عبد الرحمن (أبو خالد) - & #');
    expect(msg).toContain('3250.75 ج.م');
    expect(msg).toContain('تغيير زيت تخليقي 5W40 + فحص كمبيوتر كامل');
  });

  it('renders very long customer names without truncation or failure', () => {
    const longName = 'الشيخ عبد الله بن محمد بن إبراهيم آل سعود ذو الهمة العالية والفضل العظيم للشؤون الخاصة والتجارة الدولية والاستيراد والتصدير والمقاولات العامة والتوريدات';
    const msg = buildWhatsAppMessage(DEFAULT_WHATSAPP_TEMPLATE, {
      customerName: longName,
      workshopName: 'AP AUTO SERVICE CENTER',
      invoiceNumber: 'INV-202610-0014',
      invoiceDate: '2026-10-18',
      carMake: 'Mercedes',
      carModel: 'S500',
      plate: 'س ع د 777',
      total: 15000,
      paid: 10000,
      remaining: 5000,
      notes: '',
      workshopPhone: '01277252262'
    });

    expect(msg).toContain(longName);
    expect(msg).toContain('15000.00 ج.م');
    expect(msg).toContain('⏳ *المتبقي:* 5000.00 ج.م');
  });
});
