# Procore API Reference for Shield-AI Integration

## Overview

This document describes the Procore REST API endpoints used by Shield-AI for syncing projects, vendors, and compliance status.

**API Version**: REST v1.x (with v2 for new endpoints)
**Base URLs**:
- Production: `https://api.procore.com`
- Sandbox: `https://sandbox.procore.com`

**Official Documentation**: https://developers.procore.com/

---

## Authentication

Procore uses OAuth 2.0 for authentication.

### URLs

| Purpose | URL |
|---------|-----|
| Authorization | `https://login.procore.com/oauth/authorize` |
| Token Exchange | `https://login.procore.com/oauth/token` |
| Token Revocation | `https://login.procore.com/oauth/revoke` |

### Grant Types

1. **Authorization Code Grant** - For user-authorized integrations
2. **Client Credentials Grant** - For service account integrations (DMSA)

### Required Scopes

Based on our integration needs:

| Scope | Purpose |
|-------|---------|
| `read` | Read access to company data |
| `write` | Write access (for compliance push) |

> **Note**: Procore's scope system is permission-based rather than resource-based. Access is determined by the user's permissions in Procore.

### Token Refresh

Tokens expire after the duration specified in `expires_in` (typically 2 hours).

```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&client_id={client_id}
&client_secret={client_secret}
&refresh_token={refresh_token}
```

---

## Rate Limits

| Limit | Value |
|-------|-------|
| Default | 3,600 requests/hour |
| Increased (on request) | 7,200 or 14,400 requests/hour |
| Reset | Every hour |

### Headers

```
X-RateLimit-Limit: 3600
X-RateLimit-Remaining: 3542
X-RateLimit-Reset: 2024-01-15T15:00:00Z
```

### When Exceeded

- Status: `429 Too Many Requests`
- Body: `{"error": "You have surpassed the max number of requests..."}`
- Action: Wait until reset time

### Best Practices

1. Use webhooks instead of polling where possible
2. Batch operations when feasible
3. Cache responses locally
4. Implement exponential backoff on 429 errors

---

## Endpoints

### Companies

#### List Companies

Get companies the authenticated user has access to.

```http
GET /rest/v1.0/companies
Authorization: Bearer {access_token}
```

**Response**:
```json
[
  {
    "id": 12345,
    "name": "BuildCorp Pty Ltd",
    "is_active": true,
    "logo_url": "https://..."
  }
]
```

---

### Projects

#### List Projects

```http
GET /rest/v1.0/projects
Authorization: Bearer {access_token}
Procore-Company-Id: {company_id}
```

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `company_id` | integer | Required. Company ID |
| `page` | integer | Page number (default: 1) |
| `per_page` | integer | Items per page (default: 100, max: 1000) |
| `filters[active]` | boolean | Filter by active status |

**Response**:
```json
[
  {
    "id": 185407,
    "name": "Sydney Metro West Station",
    "display_name": "A-2 - Sydney Metro West Station",
    "project_number": "A-2",
    "address": "500 George Street",
    "city": "Sydney",
    "state_code": "NSW",
    "country_code": "AU",
    "zip": "2000",
    "latitude": -33.8688,
    "longitude": 151.2093,
    "description": "Metro station development project",
    "estimated_start_date": "2024-01-15",
    "estimated_completion_date": "2026-06-30",
    "active": true,
    "flag": "Green",
    "created_at": "2023-10-01T09:00:00Z",
    "updated_at": "2024-01-10T14:30:00Z",
    "office": {
      "id": 3610,
      "name": "Sydney Office"
    },
    "project_stage": {
      "id": 2,
      "name": "Construction"
    },
    "project_type": {
      "id": 5,
      "name": "Commercial"
    }
  }
]
```

#### Get Single Project

```http
GET /rest/v1.0/projects/{project_id}
Authorization: Bearer {access_token}
Procore-Company-Id: {company_id}
```

---

### Company Vendors (Directory)

#### List Company Vendors

Get vendors from the company directory.

```http
GET /rest/v1.0/companies/{company_id}/vendors
Authorization: Bearer {access_token}
```

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number |
| `per_page` | integer | Items per page (max: 1000) |
| `filters[is_active]` | boolean | Filter by active status |
| `filters[vendor_group_id]` | integer | Filter by vendor group |

**Response**:
```json
[
  {
    "id": 98765,
    "name": "Acme Electrical Pty Ltd",
    "abbreviated_name": "ACME-001",
    "entity_type": "abn",
    "entity_id": "12345678901",
    "email_address": "info@acmeelectrical.com.au",
    "business_phone": "+61 2 9876 5432",
    "fax_number": null,
    "website": "https://acmeelectrical.com.au",
    "address": "123 Industrial Way",
    "city": "Parramatta",
    "state_code": "NSW",
    "country_code": "AU",
    "zip": "2150",
    "dba": null,
    "is_active": true,
    "license_number": "EC12345",
    "vendor_group": {
      "id": 101,
      "name": "Electrical Contractors"
    },
    "primary_contact": {
      "id": 55001,
      "name": "John Smith",
      "email_address": "john@acmeelectrical.com.au",
      "business_phone": "+61 2 9876 5432",
      "mobile_phone": "+61 400 123 456",
      "is_primary": true
    },
    "created_at": "2022-05-15T10:30:00Z",
    "updated_at": "2024-01-08T16:45:00Z"
  }
]
```

#### Get Single Vendor

```http
GET /rest/v1.0/companies/{company_id}/vendors/{vendor_id}
Authorization: Bearer {access_token}
```

---

### Project Vendors

#### List Project Vendors

Get vendors assigned to a specific project.

```http
GET /rest/v1.0/projects/{project_id}/vendors
Authorization: Bearer {access_token}
Procore-Company-Id: {company_id}
```

**Response**: Same structure as company vendors.

---

## ABN (Australian Business Number) Handling

### Where ABN is Stored

Procore stores ABN in multiple possible locations:

| Priority | Field | Description |
|----------|-------|-------------|
| 1 | `entity_id` (when `entity_type` = 'abn') | Primary location for Australian companies |
| 2 | `tax_id` | Sometimes used for business identifiers |
| 3 | `business_id` | Generic business ID field |
| 4 | `abbreviated_name` | Often used for external system IDs |

### ABN Verification

Procore provides built-in ABN verification against the Australian Government's ABN Lookup system. This is available in the UI but not directly via API.

**Shield-AI Approach**: We use our existing ABN validation logic (`validateABN` function) to verify ABN format and checksum when importing vendors.

### Extraction Logic

```typescript
function extractABNFromVendor(vendor: ProcoreVendor): string | null {
  // Check entity_id first (primary)
  if (vendor.entity_type === 'abn' && vendor.entity_id) {
    return vendor.entity_id
  }
  // Check other fields for 11-digit number
  for (const field of [vendor.tax_id, vendor.business_id, vendor.abbreviated_name]) {
    if (field && /^\d{11}$/.test(field.replace(/\s/g, ''))) {
      return field.replace(/\s/g, '')
    }
  }
  return null
}
```

---

## Compliance/Insurance Status Push

### Current API Support

**IMPORTANT LIMITATION**: Procore does not have a dedicated API endpoint for updating vendor insurance/compliance status. The insurance management features are primarily UI-based.

### Available Options

1. **Custom Fields** (Recommended)
   - Create custom fields for compliance status
   - Update via vendor update endpoint
   - Requires configuration in Procore admin

2. **Documents API**
   - Upload compliance documents (PDFs)
   - Associate with vendor record
   - Endpoint: `POST /rest/v1.0/projects/{project_id}/documents`

3. **Webhook Notification** (Passive)
   - Procore can notify Shield-AI of changes
   - Shield-AI cannot push directly

### Recommended Implementation

```http
PATCH /rest/v1.0/companies/{company_id}/vendors/{vendor_id}
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "vendor": {
    "custom_fields": {
      "custom_field_123456": "Compliant",
      "custom_field_123457": "2024-12-31"
    }
  }
}
```

> **Blocker Note**: Custom fields must be configured in Procore by the customer. Shield-AI should provide setup instructions for creating compliance-related custom fields.

---

## Webhooks

### Setup

Webhooks are configured per-company in Procore. Shield-AI needs an endpoint to receive webhook events.

### Event Types

| Event | Description |
|-------|-------------|
| `create` | Resource created |
| `update` | Resource modified |
| `delete` | Resource removed |

### Resources

| Resource Name | Description |
|---------------|-------------|
| `projects` | Project create/update/delete |
| `company_vendors` | Company directory vendor changes |
| `project_vendors` | Project vendor assignments |

### Payload Structure

```json
{
  "id": "01HPQR3NQFXW4KTMV9GHJ5E7ZY",
  "timestamp": "2024-01-15T10:30:00Z",
  "resource_name": "company_vendors",
  "resource_id": 98765,
  "event_type": "update",
  "company_id": 12345,
  "project_id": null,
  "api_version": "v2"
}
```

### Security

Procore uses **Authorization Header** verification (not HMAC signatures):

1. When creating a webhook, you specify an authorization token
2. Procore includes this token in the `Authorization` header of each request
3. Your endpoint validates this header value

```http
POST /api/webhooks/procore
Authorization: Bearer {your_configured_token}
Content-Type: application/json
```

---

## Pagination

### v1.0 (Page-based)

```http
GET /rest/v1.0/companies/{company_id}/vendors?page=2&per_page=100
```

**Response Headers**:
```
Link: <https://api.procore.com/rest/v1.0/...?page=3>; rel="next"
Total: 450
Per-Page: 100
```

### v2 (Cursor-based)

```http
GET /rest/v2.0/companies/{company_id}/vendors?cursor={cursor}
```

**Response**:
```json
{
  "data": [...],
  "pagination": {
    "has_more": true,
    "next_cursor": "abc123..."
  }
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid/expired token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 422 | Unprocessable Entity - Validation error |
| 429 | Rate Limited |
| 500 | Server Error |

### Error Response Format

```json
{
  "error": "invalid_request",
  "error_description": "The request was invalid.",
  "errors": [
    {
      "field": "name",
      "message": "can't be blank"
    }
  ]
}
```

---

## Australian State Code Mapping

Procore uses standard state/province codes. For Australian projects:

| Code | State |
|------|-------|
| NSW | New South Wales |
| VIC | Victoria |
| QLD | Queensland |
| WA | Western Australia |
| SA | South Australia |
| TAS | Tasmania |
| ACT | Australian Capital Territory |
| NT | Northern Territory |

**Shield-AI Mapping**: Direct mapping - no conversion needed for Australian states.

---

## Integration Checklist

### Pre-requisites

- [ ] Procore developer account
- [ ] OAuth application registered
- [ ] Client ID and Secret obtained
- [ ] Redirect URI configured
- [ ] Webhook endpoint deployed (for real-time sync)

### Customer Setup

- [ ] Customer grants OAuth authorization
- [ ] Customer selects Procore company (if multiple)
- [ ] Custom compliance fields configured in Procore (optional)
- [ ] Webhook configured in Procore admin (optional)

### Data Mapping

- [ ] Projects: Map Procore project → Shield-AI project
- [ ] Vendors: Map Procore vendor → Shield-AI subcontractor
- [ ] ABN: Extract from appropriate field
- [ ] State: Direct mapping for AU, skip for US states

---

## References

- [Procore Developer Portal](https://developers.procore.com/)
- [REST API Concepts](https://developers.procore.com/documentation/restful-api-concepts)
- [OAuth Introduction](https://developers.procore.com/documentation/oauth-introduction)
- [Rate Limiting](https://developers.procore.com/documentation/rate-limiting)
- [Webhooks](https://developers.procore.com/documentation/webhooks)
- [Company Vendors](https://developers.procore.com/reference/rest/company-vendors)
- [Projects](https://developers.procore.com/reference/rest/projects)
