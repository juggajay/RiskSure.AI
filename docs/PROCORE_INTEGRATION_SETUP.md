# Procore API Integration Setup for risksure.ai

## Account Created
- **Developer Portal**: https://developers.procore.com
- **Account Email**: jaysonryan2107@gmail.com
- **Company Name**: risksure.ai
- **App Name**: risksure.ai Compliance Integration
- **App ID**: 0dab1e8b-c180-4f1e-bc66-54722a29ace8

## OAuth Credentials

### Production Credentials
```
PROCORE_CLIENT_ID=DJMsxodsmb_0IBnQXqIV2ORP01u9Pzsqa2uC_E78mcE
PROCORE_CLIENT_SECRET=-4M_72nZb8D6QXGRwsAfAQZl6LlgePwg_dYw9vZ31qA
PROCORE_API_URL=https://api.procore.com
```

### Sandbox Credentials
```
PROCORE_SANDBOX_CLIENT_ID=cTyCKK5hQQGxm1fURogZOmcrnGiAtcdjBU5D8cW1hyg
PROCORE_SANDBOX_CLIENT_SECRET=021n8k3Hm5Vl-SM_0zRfy4X2WAdHpnk8ACu7BixLZbI
PROCORE_SANDBOX_URL=https://sandbox.procore.com
PROCORE_SANDBOX_COMPANY_URL=https://sandbox.procore.com/4280201/company/home
PROCORE_SANDBOX_COMPANY_ID=4280201
```

### Redirect URIs Configured
- Development: `http://localhost:3000/api/integrations/procore/callback`
- Production: `https://app.risksure.ai/api/integrations/procore/callback`

---

## Research Findings

### 1. ABN (Australian Business Number) Field
**Finding**: Procore does not have a dedicated ABN field for vendors.

**Available Options**:
- **Tax ID Field**: Procore uses a generic "Tax ID" or "EIN" field that could potentially store ABN
- **Custom Fields**: Procore supports configurable custom fields at the company level
- **Recommendation**: Use a custom field specifically for ABN or map ABN to the Tax ID field

**API Endpoint**:
- `GET /rest/v1.0/companies/{company_id}/vendors` - List vendors
- `PATCH /rest/v1.0/companies/{company_id}/vendors/{id}` - Update vendor with custom fields

### 2. Insurance/Compliance Status via API
**Finding**: YES - Procore has dedicated Insurance Management APIs

**Available Endpoints**:
- `GET /rest/v1.0/companies/{company_id}/vendor_insurances` - List company vendor insurances
- `POST /rest/v1.0/companies/{company_id}/vendor_insurances` - Create vendor insurance
- `PATCH /rest/v1.0/companies/{company_id}/vendor_insurances/{id}` - Update vendor insurance
- `DELETE /rest/v1.0/companies/{company_id}/vendor_insurances/{id}` - Delete vendor insurance

**Project-Level Endpoints**:
- `GET /rest/v1.0/projects/{project_id}/vendor_insurances` - List project vendor insurances
- Similar CRUD operations available at project level

**Insurance Record Fields** (typical):
- Insurance type (General Liability, Workers Comp, etc.)
- Policy number
- Carrier name
- Expiration date
- Coverage amounts
- Status

### 3. Webhook Events for Vendors/Companies
**Finding**: Procore supports webhooks for vendor-related events

**Available Webhook Triggers**:
- `Company Vendors` - create, update, delete events
- `Company Vendor Insurances` - create, update, delete events
- `Project Vendors` - create, update, delete events
- `Project Vendor Insurances` - create, update, delete events

**Webhook Setup**:
1. Create a Hook (endpoint + scope)
2. Add Triggers (resource + event type)
3. Monitor Deliveries

**Webhook Payload Format**:
```json
{
  "id": "event_id",
  "company_id": 12345,
  "project_id": null,
  "resource_id": 67890,
  "resource_name": "Company Vendors",
  "event_type": "update",
  "timestamp": "2026-01-09T20:30:00Z",
  "user_id": 11111,
  "ulid": "unique_identifier"
}
```

### 4. API Rate Limits
**Finding**: 3,600 requests per hour per authentication token

**Rate Limit Details**:
- **Hourly Limit**: 3,600 requests per hour (60-minute rolling window)
- **Burst/Spike Limits**: Additional short-term limits may apply

**Response Headers**:
- `X-Rate-Limit-Limit`: Total requests allowed in current window
- `X-Rate-Limit-Remaining`: Requests remaining in current window
- `X-Rate-Limit-Reset`: Unix timestamp when window resets

**HTTP Status Codes**:
- `429 Too Many Requests`: Rate limit exceeded (hourly or spike)
- `503 Service Unavailable`: Platform under heavy load (check `Retry-After` header)

**Best Practices**:
- Always check rate limit headers
- Implement exponential backoff for 429 responses
- Use index actions to fetch collections in one request
- Cache results when possible
- Include `Procore-Company-Id` header for DMSA tokens (separate limits per company)

---

## Relevant API Scopes

For the risksure.ai integration, request these permission scopes:
- `user:read` - Read user profile
- `company:read` - Read company directory
- `company:write` - Update vendor/insurance data
- `project:read` - Read projects
- `webhooks:read` - Read webhook configuration
- `webhooks:write` - Create/manage webhooks

---

## Next Steps

1. **Test OAuth Flow**: Implement OAuth 2.0 authorization code flow with sandbox credentials
2. **Fetch Vendors**: Test vendor listing and identify custom field configuration for ABN
3. **Insurance CRUD**: Test creating/updating insurance records for vendors
4. **Set Up Webhooks**: Configure webhooks for vendor and insurance change notifications
5. **Map ABN**: Work with Procore support or use custom fields to store ABN data

---

## Important Notes

- **Sandbox is Pre-configured**: A sandbox company (ID: 4280201) was automatically created
- **Client Secret Warning**: Production client secret is only shown once - stored above
- **Token Rotation**: Implement refresh token logic as access tokens expire
- **HTTPS Required**: All webhook endpoints must use HTTPS in production
