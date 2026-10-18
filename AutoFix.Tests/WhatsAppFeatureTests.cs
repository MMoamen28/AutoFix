using System;
using AutoFix.Helpers;
using Xunit;

namespace AutoFix.Tests
{
    public class WhatsAppFeatureTests
    {
        [Theory]
        [InlineData("01012345678", "201012345678")]
        [InlineData("+201012345678", "201012345678")]
        [InlineData("00201012345678", "201012345678")]
        [InlineData("201012345678", "201012345678")]
        [InlineData("1012345678", "201012345678")]
        [InlineData("٠١٠١٢٣٤٥٦٧٨", "201012345678")]
        [InlineData("۰۱۰۱۲۳۴۵۶۷۸", "201012345678")]
        [InlineData("+20 10-1234-5678", "201012345678")]
        [InlineData("  011 9876 5432  ", "201198765432")]
        [InlineData("012 333 44 555", "201233344555")]
        [InlineData("015 111 22 333", "201511122333")]
        [InlineData("0020 12 1234 5678", "201212345678")]
        [InlineData("+20 (15) 1234-5678", "201512345678")]
        [InlineData("۰۱۱-۱۲۳۴-۵۶۷۸", "201112345678")]
        [InlineData("+٢٠١٠١٢٣٤٥٦٧٨", "201012345678")]
        [InlineData("+20-11-5555-4444", "201155554444")]
        [InlineData("010-0000-0000", "201000000000")]
        public void PhoneNormalization_ValidNumbers_ReturnsNormalizedDigits(string input, string expected)
        {
            var result = ArabicSearchNormalizer.NormalizePhoneForWhatsApp(input);
            Assert.Equal(expected, result);
        }

        [Theory]
        [InlineData("01312345678")]
        [InlineData("01812345678")]
        [InlineData("01712345678")]
        [InlineData("0212345678")]
        [InlineData("010123456")]
        [InlineData("20101234567899")]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData(null)]
        [InlineData("abcdefghijk")]
        [InlineData("0101234abcd")]
        public void PhoneNormalization_InvalidNumbers_ReturnsNull(string? input)
        {
            var result = ArabicSearchNormalizer.NormalizePhoneForWhatsApp(input);
            Assert.Null(result);
        }

        [Fact]
        public void TemplateBuilder_PaidInFull_ShowsPaidMessage()
        {
            var data = new WhatsAppTemplateData
            {
                CustomerName = "طارق سليم",
                WorkshopName = "AP AUTO SERVICE CENTER",
                InvoiceNumber = "INV-202610-0007",
                InvoiceDate = "2026-10-18",
                CarMake = "Kia",
                CarModel = "Sportage",
                Plate = "ط ر ق 1000",
                Total = 650.00m,
                Paid = 650.00m,
                Remaining = 0.00m,
                Notes = "",
                WorkshopPhone = "01277252262"
            };

            var msg = WhatsAppTemplateHelper.BuildMessage(null, data);

            Assert.Contains("طارق سليم", msg);
            Assert.Contains("AP AUTO SERVICE CENTER", msg);
            Assert.Contains("INV-202610-0007", msg);
            Assert.Contains("650.00 ج.م", msg);
            Assert.Contains("🎉 تم السداد بالكامل", msg);
            Assert.DoesNotContain("المتبقي:", msg);
            Assert.DoesNotContain("{", msg);
            Assert.DoesNotContain("undefined", msg);
            Assert.DoesNotContain("null", msg);
        }

        [Fact]
        public void TemplateBuilder_PartiallyPaid_ShowsRemainingLine()
        {
            var data = new WhatsAppTemplateData
            {
                CustomerName = "طارق سليم",
                WorkshopName = "AP AUTO SERVICE CENTER",
                InvoiceNumber = "INV-202610-0007",
                InvoiceDate = "2026-10-18",
                CarMake = "Kia",
                CarModel = "Sportage",
                Plate = "ط ر ق 1000",
                Total = 650.00m,
                Paid = 300.00m,
                Remaining = 350.00m,
                Notes = "دفعة تحت الحساب",
                WorkshopPhone = "01277252262"
            };

            var msg = WhatsAppTemplateHelper.BuildMessage(null, data);

            Assert.Contains("💰 *الإجمالي:* 650.00 ج.م", msg);
            Assert.Contains("✅ *المدفوع:* 300.00 ج.م", msg);
            Assert.Contains("⏳ *المتبقي:* 350.00 ج.م", msg);
            Assert.Contains("دفعة تحت الحساب", msg);
            Assert.Contains("01277252262", msg);
            Assert.DoesNotContain("🎉 تم السداد بالكامل", msg);
        }

        [Fact]
        public void TemplateBuilder_Unpaid_ShowsFullRemaining()
        {
            var data = new WhatsAppTemplateData
            {
                CustomerName = "محمود عادل",
                WorkshopName = "AP AUTO SERVICE CENTER",
                InvoiceNumber = "INV-202610-0010",
                InvoiceDate = "2026-10-18",
                CarMake = "Hyundai",
                CarModel = "Elantra",
                Plate = "ع د ل 2020",
                Total = 1500.00m,
                Paid = 0.00m,
                Remaining = 1500.00m,
                Notes = "",
                WorkshopPhone = "01277252262"
            };

            var msg = WhatsAppTemplateHelper.BuildMessage(null, data);

            Assert.Contains("💰 *الإجمالي:* 1500.00 ج.م", msg);
            Assert.Contains("✅ *المدفوع:* 0.00 ج.م", msg);
            Assert.Contains("⏳ *المتبقي:* 1500.00 ج.م", msg);
            Assert.DoesNotContain("🎉 تم السداد بالكامل", msg);
        }

        [Fact]
        public void TemplateBuilder_EmptyNotes_OmitNotesLine()
        {
            var data = new WhatsAppTemplateData
            {
                CustomerName = "علي سامي",
                WorkshopName = "AP AUTO SERVICE CENTER",
                InvoiceNumber = "INV-202610-0011",
                InvoiceDate = "2026-10-18",
                CarMake = "Toyota",
                CarModel = "Corolla",
                Plate = "س ا م 123",
                Total = 400.00m,
                Paid = 400.00m,
                Remaining = 0.00m,
                Notes = "   ",
                WorkshopPhone = "01277252262"
            };

            var msg = WhatsAppTemplateHelper.BuildMessage(null, data);

            Assert.DoesNotContain("ملاحظات", msg);
            Assert.DoesNotContain("{notesLine}", msg);
        }

        [Fact]
        public void TemplateBuilder_EmptyWorkshopPhone_OmitPhoneLine()
        {
            var data = new WhatsAppTemplateData
            {
                CustomerName = "سالم جابر",
                WorkshopName = "AP AUTO SERVICE CENTER",
                InvoiceNumber = "INV-202610-0012",
                InvoiceDate = "2026-10-18",
                CarMake = "Nissan",
                CarModel = "Sunny",
                Plate = "ج ب ر 456",
                Total = 800.00m,
                Paid = 800.00m,
                Remaining = 0.00m,
                Notes = "",
                WorkshopPhone = ""
            };

            var msg = WhatsAppTemplateHelper.BuildMessage(null, data);

            Assert.DoesNotContain("للاستفسار", msg);
            Assert.DoesNotContain("{workshopPhone}", msg);
        }

        [Fact]
        public void TemplateBuilder_ArabicNamesWithSpecialCharacters_RendersCorrectly()
        {
            var data = new WhatsAppTemplateData
            {
                CustomerName = "أ.د/ محمد عبد الرحمن (أبو خالد) - & #",
                WorkshopName = "AP AUTO SERVICE CENTER",
                InvoiceNumber = "INV-202610-0013",
                InvoiceDate = "2026-10-18",
                CarMake = "BMW",
                CarModel = "X5",
                Plate = "ب م و 999",
                Total = 3250.75m,
                Paid = 3250.75m,
                Remaining = 0.00m,
                Notes = "تغيير زيت تخليقي 5W40 + فحص كمبيوتر كامل",
                WorkshopPhone = "01277252262"
            };

            var msg = WhatsAppTemplateHelper.BuildMessage(null, data);

            Assert.Contains("أ.د/ محمد عبد الرحمن (أبو خالد) - & #", msg);
            Assert.Contains("3250.75 ج.م", msg);
            Assert.Contains("تغيير زيت تخليقي 5W40 + فحص كمبيوتر كامل", msg);
        }

        [Fact]
        public void TemplateBuilder_VeryLongNames_RendersWithoutErrors()
        {
            var longName = "الشيخ عبد الله بن محمد بن إبراهيم آل سعود ذو الهمة العالية والفضل العظيم للشؤون الخاصة والتجارة الدولية والاستيراد والتصدير والمقاولات العامة والتوريدات";
            var data = new WhatsAppTemplateData
            {
                CustomerName = longName,
                WorkshopName = "AP AUTO SERVICE CENTER",
                InvoiceNumber = "INV-202610-0014",
                InvoiceDate = "2026-10-18",
                CarMake = "Mercedes",
                CarModel = "S500",
                Plate = "س ع د 777",
                Total = 15000.00m,
                Paid = 10000.00m,
                Remaining = 5000.00m,
                Notes = "",
                WorkshopPhone = "01277252262"
            };

            var msg = WhatsAppTemplateHelper.BuildMessage(null, data);

            Assert.Contains(longName, msg);
            Assert.Contains("15000.00 ج.م", msg);
            Assert.Contains("⏳ *المتبقي:* 5000.00 ج.م", msg);
        }
    }
}
