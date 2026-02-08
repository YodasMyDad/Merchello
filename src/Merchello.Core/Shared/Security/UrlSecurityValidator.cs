using System.Net;
using System.Net.Sockets;

namespace Merchello.Core.Shared.Security;

/// <summary>
/// Validates outbound URLs to reduce SSRF risk.
/// </summary>
public static class UrlSecurityValidator
{
    public static bool TryValidatePublicHttpUrl(
        string? url,
        bool requireHttps,
        out Uri? uri,
        out string error)
    {
        uri = null;
        error = string.Empty;

        if (string.IsNullOrWhiteSpace(url))
        {
            error = "URL is required.";
            return false;
        }

        if (!Uri.TryCreate(url, UriKind.Absolute, out var parsed))
        {
            error = "URL must be an absolute URI.";
            return false;
        }

        if (!string.Equals(parsed.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(parsed.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            error = "Only HTTP and HTTPS URLs are allowed.";
            return false;
        }

        if (requireHttps && !string.Equals(parsed.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            error = "HTTPS is required.";
            return false;
        }

        if (parsed.IsLoopback || IsLocalHostName(parsed.DnsSafeHost))
        {
            error = "Loopback and local hostnames are not allowed.";
            return false;
        }

        if (parsed.HostNameType is UriHostNameType.IPv4 or UriHostNameType.IPv6)
        {
            if (!IPAddress.TryParse(parsed.DnsSafeHost, out var ip))
            {
                error = "Invalid IP host.";
                return false;
            }

            if (IsPrivateOrReservedAddress(ip))
            {
                error = "Private, loopback, and link-local IP ranges are not allowed.";
                return false;
            }

            uri = parsed;
            return true;
        }

        try
        {
            var addresses = Dns.GetHostAddresses(parsed.DnsSafeHost);
            if (addresses.Any(IsPrivateOrReservedAddress))
            {
                error = "Host resolves to a private or reserved address.";
                return false;
            }
        }
        catch (SocketException)
        {
            // Best-effort DNS check: unresolved hosts are allowed here and will fail
            // at request time if they are not reachable in the runtime environment.
        }
        catch (ArgumentException)
        {
            error = "Invalid host.";
            return false;
        }

        uri = parsed;
        return true;
    }

    private static bool IsLocalHostName(string host)
    {
        if (string.IsNullOrWhiteSpace(host))
        {
            return true;
        }

        return host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
               host.EndsWith(".localhost", StringComparison.OrdinalIgnoreCase) ||
               host.EndsWith(".local", StringComparison.OrdinalIgnoreCase) ||
               host.EndsWith(".internal", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsPrivateOrReservedAddress(IPAddress address)
    {
        var ip = address;
        if (ip.IsIPv4MappedToIPv6)
        {
            ip = ip.MapToIPv4();
        }

        if (IPAddress.IsLoopback(ip) ||
            ip.Equals(IPAddress.Any) ||
            ip.Equals(IPAddress.None) ||
            ip.Equals(IPAddress.IPv6Any) ||
            ip.Equals(IPAddress.IPv6None))
        {
            return true;
        }

        if (ip.AddressFamily == AddressFamily.InterNetworkV6)
        {
            if (ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal || ip.IsIPv6Multicast)
            {
                return true;
            }

            var bytes = ip.GetAddressBytes();
            // fc00::/7 unique local addresses
            return (bytes[0] & 0xFE) == 0xFC;
        }

        if (ip.AddressFamily != AddressFamily.InterNetwork)
        {
            return true;
        }

        var bytes4 = ip.GetAddressBytes();
        var first = bytes4[0];
        var second = bytes4[1];

        // RFC1918 + common non-public ranges
        return first == 10 ||                                      // 10.0.0.0/8
               first == 127 ||                                     // 127.0.0.0/8
               first == 0 ||                                       // 0.0.0.0/8
               (first == 100 && second >= 64 && second <= 127) || // 100.64.0.0/10
               (first == 169 && second == 254) ||                 // 169.254.0.0/16
               (first == 172 && second >= 16 && second <= 31) ||  // 172.16.0.0/12
               (first == 192 && second == 168) ||                 // 192.168.0.0/16
               (first == 198 && (second == 18 || second == 19)) ||// 198.18.0.0/15
               first >= 224;                                       // Multicast/reserved
    }
}
