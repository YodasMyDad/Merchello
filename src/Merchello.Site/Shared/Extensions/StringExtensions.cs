using System.Text;
using System.Text.RegularExpressions;

namespace Merchello.Site.Shared.Extensions;

public static class StringExtensions
{
    extension(string s)
    {
        public List<int> ToListInt()
        {
            return !s.IsNullOrWhiteSpace() ? s.Split(',').Select(int.Parse).ToList() : new List<int>();
        }

        public string Truncate(int length)
        {
            if (!s.IsNullOrWhiteSpace())
            {
                if (s.Length > length)
                {
                    s = s[..length];
                    s = Regex.Replace(s, @"\t|\n|\r", "");
                }
            }

            return s;
        }

        public string ReduceWhitespace()
        {
            var newString = new StringBuilder();
            var previousIsWhitespace = false;
            foreach (var t in s)
            {
                if (char.IsWhiteSpace(t))
                {
                    if (previousIsWhitespace)
                    {
                        continue;
                    }

                    previousIsWhitespace = true;
                }
                else
                {
                    previousIsWhitespace = false;
                }

                newString.Append(t);
            }

            return newString.ToString();
        }
    }
}
