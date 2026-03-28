# Customer Segments

Customer Segments let you group customers together for targeted promotions, reporting, and personalized experiences. You can create segments manually (hand-picking customers) or automatically (defining criteria that Merchello evaluates).

## Segment Types

| Type | How members are determined |
|------|---------------------------|
| **Manual** | You explicitly add and remove customers |
| **Automated** | Merchello evaluates criteria rules and includes matching customers |

## Creating Segments

### Manual segment

A manual segment is just a named group you manage yourself:

```http
POST /umbraco/api/v1/customer-segments
Content-Type: application/json

{
  "name": "VIP Customers",
  "description": "Hand-picked high-value customers",
  "segmentType": "Manual"
}
```

Then add members:

```http
POST /umbraco/api/v1/customer-segments/{segmentId}/members
Content-Type: application/json

{
  "customerIds": ["guid-1", "guid-2", "guid-3"]
}
```

### Automated segment

An automated segment defines criteria rules. Customers are included when they match:

```http
POST /umbraco/api/v1/customer-segments
Content-Type: application/json

{
  "name": "High Spenders",
  "description": "Customers who have spent over 1000",
  "segmentType": "Automated",
  "matchMode": "All",
  "criteria": [
    {
      "field": "TotalSpend",
      "operator": "GreaterThan",
      "value": 1000
    }
  ]
}
```

## Available Criteria Fields

| Field | Description | Value Type |
|-------|-------------|-----------|
| `OrderCount` | Number of completed orders | Number |
| `TotalSpend` | Total amount spent across all orders | Decimal |
| `AverageOrderValue` | Average order value | Decimal |
| `FirstOrderDate` | Date of first order | DateTime |
| `LastOrderDate` | Date of most recent order | DateTime |
| `DaysSinceLastOrder` | Days since last order | Number |
| `DateCreated` | Customer creation date | DateTime |
| `Email` | Customer email address | String |
| `Country` | Customer's country (from billing address) | String |
| `Tag` | Customer tags | String |

## Match Modes

When a segment has multiple criteria, the `MatchMode` determines how they combine:

| Mode | Behavior |
|------|----------|
| `All` | Customer must match **every** criterion (AND logic) |
| `Any` | Customer must match **at least one** criterion (OR logic) |

### Example: Lapsed high-value customers

```json
{
  "name": "Win-Back Targets",
  "segmentType": "Automated",
  "matchMode": "All",
  "criteria": [
    {
      "field": "TotalSpend",
      "operator": "GreaterThan",
      "value": 500
    },
    {
      "field": "DaysSinceLastOrder",
      "operator": "GreaterThan",
      "value": 90
    }
  ]
}
```

This finds customers who have spent over 500 but haven't ordered in 90+ days -- perfect for a win-back campaign.

## Criteria Operators

| Operator | Works With |
|----------|-----------|
| `Equals` | All types |
| `NotEquals` | All types |
| `GreaterThan` | Numbers, Decimals, Dates |
| `LessThan` | Numbers, Decimals, Dates |
| `GreaterThanOrEquals` | Numbers, Decimals, Dates |
| `LessThanOrEquals` | Numbers, Decimals, Dates |
| `Between` | Numbers, Decimals (uses `Value` and `Value2`) |
| `Contains` | Strings |
| `StartsWith` | Strings |

## Using Segments with Discounts

Segments are the primary way to target discounts at specific customers. When creating a discount, you can set eligibility to `CustomerSegments` and specify which segments qualify:

```json
{
  "name": "VIP 10% Off",
  "category": "AmountOffOrder",
  "valueType": "Percentage",
  "value": 10,
  "eligibilityRules": [
    {
      "type": "CustomerSegments",
      "segmentIds": ["guid-of-vip-segment"]
    }
  ]
}
```

See [Discounts Overview](../discounts/discounts-overview.md) for more on discount eligibility.

## Segment Properties

| Property | Description |
|----------|-------------|
| `Id` | Unique identifier |
| `Name` | Display name |
| `Description` | Optional description |
| `SegmentType` | `Manual` or `Automated` |
| `CriteriaJson` | JSON-serialized criteria rules (automated only) |
| `MatchMode` | `All` (AND) or `Any` (OR) |
| `IsActive` | Whether the segment is active |
| `IsSystemSegment` | Built-in segments that cannot be deleted |
| `CreatedBy` | User who created the segment |
| `Members` | Navigation property for manual segment members |

## System Segments

Merchello may include built-in system segments (marked with `IsSystemSegment = true`). These cannot be deleted but can be deactivated. They provide common groupings like "All Customers" or "Repeat Buyers".

## Criteria Validation

When you create or update an automated segment, Merchello validates the criteria:

- Automated segments must have at least one criterion
- Each criterion's field, operator, and value are validated by `ISegmentCriteriaEvaluator`
- Invalid criteria combinations return descriptive error messages

## Notifications

| Operation | Before (Cancelable) | After |
|-----------|---------------------|-------|
| Create | `CustomerSegmentCreatingNotification` | `CustomerSegmentCreatedNotification` |

## Key Service Methods

| Method | Description |
|--------|-------------|
| `GetAllAsync()` | List all segments |
| `GetByIdAsync(id)` | Get a segment by ID |
| `GetByIdsAsync(ids)` | Get multiple segments by ID |
| `CreateAsync(parameters)` | Create a new segment |
