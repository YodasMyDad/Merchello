# Supplier Direct Fulfilment

Supplier Direct is a built-in fulfilment provider for transmitting orders directly to suppliers via email, FTP, or SFTP. Instead of integrating with a 3PL API, it generates a CSV file of the order and delivers it to the supplier through their preferred channel.

This is ideal for drop-shipping scenarios, suppliers without API integrations, or any workflow where you need to send order data as files.

## Capabilities

| Feature | Supported |
|---|---|
| Order submission | Yes |
| Order cancellation | No (you cannot "unsend" an email or file) |
| Webhook status updates | No |
| Status polling | No |
| Product sync | No |
| Inventory sync | No |
| Shipment on submission | Yes (creates shipment record immediately) |

## Delivery Methods

Supplier Direct supports three delivery methods, configured per supplier:

### Email

Sends the order as a formatted email to the supplier's email address. The order data is included in the email body using the configured MJML template.

- Recipient can be set explicitly, via supplier profile, or from the supplier's contact email
- Supports CC addresses for internal stakeholders
- Uses the standard Merchello email queue and retry system
- A copy can be sent to the store (configurable)

### FTP

Uploads a CSV file to the supplier's FTP server.

- Default port: 21
- Passive mode enabled by default
- TLS encryption enabled by default

### SFTP

Uploads a CSV file to the supplier's SFTP server (the secure option).

- Default port: 22
- Supports host key fingerprint validation
- Recommended over plain FTP

## Configuration

### Supplier Profile

Each supplier that uses Supplier Direct needs a delivery profile stored in their extended data. The profile contains:

```json
{
  "submissionTrigger": "OnPaid",
  "deliveryMethod": "Email",
  "emailSettings": {
    "recipientEmail": "orders@supplier.com",
    "ccAddresses": ["warehouse@supplier.com"]
  },
  "ftpSettings": {
    "host": "ftp.supplier.com",
    "port": 22,
    "username": "merchello",
    "password": "***",
    "remotePath": "/orders/incoming",
    "useSftp": true,
    "hostFingerprint": "ssh-rsa 2048 xx:xx:xx..."
  },
  "csvSettings": {
    "columns": { "OrderNumber": "PO Number", "Sku": "Item Code" },
    "staticColumns": { "AccountNumber": "MERCH-001" }
  }
}
```

### Email Topic Configuration

For email delivery, you need an enabled email configuration for the `fulfilment.supplier-order` topic. Set this up in the Merchello backoffice under **Settings** > **Email**.

## Trigger Policies

Supplier Direct supports two trigger policies that control when orders are sent to suppliers:

### OnPaid (Default)

Orders are automatically submitted when payment is confirmed. This is the "fire and forget" approach -- as soon as the customer pays, the supplier gets the order.

### ExplicitRelease

Staff must manually release the order before it is sent to the supplier. This gives you a chance to review or modify the order before it goes out.

To release an order via the API:

```
POST /orders/{orderId}/fulfillment/release
```

> **Warning:** The order must be fully paid before it can be released. The release endpoint is exclusive to Supplier Direct -- it does not affect other fulfilment providers.

## How Submission Works

### Email Delivery

1. The provider resolves the target email address (explicit > profile > supplier contact)
2. Builds the email subject using the template: `"Order {OrderNumber} for {SupplierName}"`
3. Looks up all enabled email configurations for the `fulfilment.supplier-order` topic
4. Queues a delivery for each configuration
5. Returns a reference like `email:{deliveryId}`

### File Transfer (FTP/SFTP)

1. The provider resolves connection settings from the supplier profile
2. Validates that host, username, and password are configured
3. Generates a CSV file from the order data using the column mapping
4. Builds a deterministic file name from the order number
5. Uploads the file to the remote path
6. Returns a reference like `sftp:/orders/incoming/ORD-0001.csv`

### Idempotency

For file transfers, if the file already exists on the server and overwrite is disabled (the default), the provider treats it as a successful idempotent retry -- it does not fail. This is important because the retry job may attempt redelivery.

## CSV Column Mapping

The CSV generator uses a configurable column mapping. You can customize:

- **Columns** -- Map internal field names to supplier-specific column headers
- **Static columns** -- Add fixed values to every row (e.g., account numbers)

If no custom mapping is provided, a default mapping is used.

## Error Handling

Errors are classified by the `SupplierDirectErrorClassifier` into categories like `ConfigurationError`, `ConnectionError`, etc. This helps the retry job decide whether to retry (connection errors) or give up immediately (configuration errors).

All error messages are run through `SupplierDirectSecretRedactor` to ensure passwords, tokens, and other sensitive data never appear in logs or error responses.

## Troubleshooting

**"No supplier email address configured":**
Set an email address on the supplier profile, the email delivery settings, or the supplier's contact email.

**"No enabled email configuration found":**
Create an email configuration for the `fulfilment.supplier-order` topic in the backoffice.

**FTP/SFTP connection fails:**
- Verify host, port, username, and password
- For SFTP, check the host key fingerprint
- Use the connection test feature in the backoffice
- Check firewall rules for outbound FTP/SFTP

**Orders not being submitted automatically:**
Check the supplier's trigger policy. If set to `ExplicitRelease`, staff must manually release the order.

## Related Topics

- [Fulfilment System Overview](fulfilment-overview.md)
- [ShipBob Integration](shipbob.md)
- [Email System](../email/email-overview.md)
