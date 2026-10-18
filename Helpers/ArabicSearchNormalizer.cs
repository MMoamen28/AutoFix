using System;
using System.Text;
using System.Text.RegularExpressions;

namespace AutoFix.Helpers
{
    public static class ArabicSearchNormalizer
    {
        private static readonly Regex DiacriticsRegex = new Regex(@"[\u064B-\u065F\u0670]", RegexOptions.Compiled);

        /// <summary>
        /// Converts Arabic-Indic digits (٠-٩) and Persian digits (۰-۹) to standard Western digits (0-9).
        /// </summary>
        public static string NormalizeDigits(string input)
        {
            if (string.IsNullOrEmpty(input)) return string.Empty;

            var sb = new StringBuilder(input.Length);
            foreach (var ch in input)
            {
                if (ch >= '٠' && ch <= '٩')
                {
                    sb.Append((char)('0' + (ch - '٠')));
                }
                else if (ch >= '۰' && ch <= '۹') // Persian digits
                {
                    sb.Append((char)('0' + (ch - '۰')));
                }
                else
                {
                    sb.Append(ch);
                }
            }
            return sb.ToString();
        }

        /// <summary>
        /// Normalizes Arabic letters (Alif forms, Taa Marbuta, Yaa forms, removes diacritics).
        /// </summary>
        public static string NormalizeArabicText(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return string.Empty;

            // 1. Digits to western
            var text = NormalizeDigits(input);

            // 2. Remove diacritics (harakat / tashkeel)
            text = DiacriticsRegex.Replace(text, string.Empty);

            var sb = new StringBuilder(text.Length);
            foreach (var ch in text)
            {
                switch (ch)
                {
                    case 'أ':
                    case 'إ':
                    case 'آ':
                    case 'ٱ':
                        sb.Append('ا');
                        break;
                    case 'ة':
                        sb.Append('ه');
                        break;
                    case 'ى':
                        sb.Append('ي');
                        break;
                    case 'ؤ':
                    case 'ئ':
                        sb.Append('ء');
                        break;
                    default:
                        sb.Append(ch);
                        break;
                }
            }
            return sb.ToString().Trim();
        }

        /// <summary>
        /// Strips punctuation, spaces, dashes for exact phone/plate/VIN comparison.
        /// </summary>
        public static string StripNonAlphanumeric(string input)
        {
            if (string.IsNullOrEmpty(input)) return string.Empty;
            var normalized = NormalizeArabicText(input);
            var sb = new StringBuilder(normalized.Length);
            foreach (var ch in normalized)
            {
                if (char.IsLetterOrDigit(ch))
                {
                    sb.Append(char.ToLowerInvariant(ch));
                }
            }
            return sb.ToString();
        }

        /// <summary>
        /// Normalizes Egyptian phone number: strips +20, 0020, leading 0, or spaces.
        /// e.g. "+20 101 234 5678" -> "1012345678", "٠١٠١٢٣٤٥٦٧٨" -> "1012345678".
        /// </summary>
        public static string NormalizeEgyptianPhone(string phone)
        {
            if (string.IsNullOrWhiteSpace(phone)) return string.Empty;
            return NormalizePhoneForComparison(phone);
        }

        public static string NormalizePhoneForComparison(string? phone)
        {
            if (string.IsNullOrWhiteSpace(phone)) return string.Empty;
            var digits = NormalizeDigits(phone);
            digits = Regex.Replace(digits, @"\D", "");
            if (digits.StartsWith("0020")) digits = digits.Substring(4);
            else if (digits.StartsWith("20") && digits.Length >= 11) digits = digits.Substring(2);
            while (digits.StartsWith("0")) digits = digits.Substring(1);
            return digits;
        }

        public static string FormatPhoneForStorage(string? phone)
        {
            if (string.IsNullOrWhiteSpace(phone)) return string.Empty;
            var digits = NormalizeDigits(phone);
            digits = Regex.Replace(digits, @"\D", "");
            if (digits.StartsWith("0020")) digits = digits.Substring(4);
            else if (digits.StartsWith("20") && digits.Length >= 11) digits = digits.Substring(2);
            if (!digits.StartsWith("0") && digits.Length == 10)
            {
                digits = "0" + digits;
            }
            return digits;
        }
    }
}
