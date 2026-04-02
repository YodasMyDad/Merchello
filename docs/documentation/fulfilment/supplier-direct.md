# Supplier Direct Fulfilment

Supplier Direct is a built-in fulfilment provider for transmitting orders directly to suppliers via email, FTP, or SFTP. Instead of integrating with a 3PL API, it generates a CSV file of the order and delivers it to the supplier through their preferred channel.

This is ideal for drop-shipping scenarios, suppliers without API integrations, or any workflow where you need to send order data as files.

## Capabilities

| Feature | Supported |
| ------- | --------- |
| Order submission | Yes |
| Order cancellation | No (you cannot "unsend" an email or file) |
| Webhook status updates | No |
| Status polling | No |
| Product sync | No |
| Inventory sync | No |
| Shipment on submission | Yes (creates shipment record immediately) |

## Delivery Methods

Supplier Direct supports three delivery methods, configured per supplier:

- **Email** -- Sends the order as a formatted email using the configured MJML template. Recipient can be set explicitly, via supplier profile, or from the supplier's contact email. Supports CC addresses and uses the standard Merchello email queue and retry system.
- **FTP** -- Uploads a CSV file to the supplier's FTP server. Default port 21, passive mode and TLS enabled by default.
- **SFTP** -- Uploads a CSV file via SFTP (port 22). Supports host key fingerprint validation. Recommended over plain FTP.

## Trigger Policies

Supplier Direct supports two trigger policies that control when orders are sent to suppliers. This is a strategic choice that affects your integration workflow:

### OnPaid (Default)

Orders are automatically submitted when payment is confirmed (`FulfilmentSubmissionSource.PaymentCreated`). No intervention required.

### ExplicitRelease

Staff must manually release the order before it is sent. This gives a chance to review or modify the order first. The order must be fully paid before it can be released. This trigger is exclusive to Supplier Direct and does not affect other fulfilment providers.

## Submission Workflow

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

## Supplier Profile Configuration

Each supplier needs a delivery profile stored in their extended data:

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

## CSV Column Mapping

The CSV generator uses a configurable column mapping:

- **Columns** -- Map internal field names to supplier-specific column headers
- **Static columns** -- Add fixed values to every row (e.g., account numbers)

If no custom mapping is provided, a default mapping is used.

## Error Handling

Errors are classified by `SupplierDirectErrorClassifier` into categories like `ConfigurationError`, `ConnectionError`, etc. This determines retry behavior: connection errors are retried, configuration errors fail immediately.

All error messages are run through `SupplierDirectSecretRedactor` to ensure passwords, tokens, and other sensitive data never appear in logs or error responses.

## Related Topics

- [Fulfilment System Overview](fulfilment-overview.md)
- [ShipBob Integration](shipbob.md)
- [Email System](../email/email-overview.md)
