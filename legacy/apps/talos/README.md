# talos

Meter provisioning and hardware registration service. Talos handles the workflows for registering and deregistering smart electricity meters against vendor APIs, and processes inbound hardware import jobs.

**Default port:** set via `PORT` (falls back to `3000`)

---

## Responsibilities

- Meter registration and deregistration against the CALIN API (v1 via Puppeteer automation, v2 via REST API)
- Processing metering hardware import jobs (cron + on-demand)
- Reporting provisioning results back to Tiamat

---

## Modules

| Module | Description |
|--------|-------------|
| `calin` | Facade that selects between the CALIN v1 and v2 implementations based on the meter's `communication_protocol`. Runs meter and DCU import/removal against the appropriate backend. |
| `calin-v1` | Registers and deregisters meters in the CALIN v1 web application using Puppeteer browser automation. Reports results to Tiamat via REST. |
| `metering-hardware-imports` | Processes pending hardware import jobs — triggered by cron (production) and on startup. Manages DCU removal flows and updates Tiamat after completion. |
| `debug` | `GET __debug/image/:name` — serves PNG screenshots from disk for debugging Puppeteer sessions. |

---

## CALIN V1 Service

CALIN V1 does not provide a REST API. Talos uses headless Chrome (Puppeteer) to automate the CALIN EasyUI-based web interface directly.

### Registration Workflow

Registration happens in 3 steps, each with its own retry logic:

```
Step 1: Add Meter
├── Login (with captcha solving)
├── Navigate to Meter Management → Meter Management tab
├── Fill meter form (ID, phase type)
└── Save meter

Step 2: Create Customer Account
├── Reload page (clean state)
├── Navigate to Open an Account tab
├── Select customer, meter, and price plan from dropdowns
└── Save account

Step 3: Assign Meter to DCU
├── Reload page (clean state)
├── Navigate to DCU Meter File tab
├── Select DCU, meter, protocol, and baud rate
└── Save assignment
```

### Deregistration Workflow

```
Step 1: Unassign from DCU
├── Navigate to DCU Meter File tab
├── Search for meter assignment
└── Delete assignment

Step 2: Delete Customer Account
├── Navigate to Open an Account tab
├── Search for customer account
└── Delete account

Step 3: Remove Meter
├── Navigate to Meter Management tab
├── Search for meter
└── Delete meter
```

### Key Features

- **Concurrent session limiting** — prevents overloading CALIN; configurable max sessions via `CONCURRENT_SESSIONS`
- **Deferred queue** — requests exceeding the limit are queued and processed in order
- **Automatic retries** — each step has individual retry logic with configurable attempts
- **Debug screenshots** — automatic screenshots on failure saved to `UPLOAD_FOLDER`
- **Captcha solving** — integration with an external captcha solving service
- **EasyUI handling** — special handling for CALIN's EasyUI framework quirks

---

## HTTP Endpoints

### CALIN V1

```
POST   /calin-v1/register-meter
DELETE /calin-v1/deregister-meter/:external_reference
```

**Register request body:**
```json
{
  "external_reference": "47001891341",
  "meter_phase": "single_phase",
  "dcu_external_reference": "DCU-001"
}
```

### Metering Hardware Imports

```
POST /metering-hardware-imports
PUT  /metering-hardware-imports
GET  /metering-hardware-imports/run
```

### Debug

```
GET /__debug/image/:filename
```

Returns PNG screenshots captured during failed Puppeteer operations. Screenshot filenames follow the pattern:
```
{timestamp}_{description}_attempt{N}_failure.png
```
Example:
```
GET /__debug/image/2026-01-22T19-23-25-169Z_Deregistration_Step_1__unassignFromDCU__for_47001891341_attempt1_failure.png
```

> **Security:** path traversal is prevented by sanitizing the filename. Only files in the configured `UPLOAD_FOLDER` are accessible.

---

## Puppeteer Helpers

`libs/helpers/puppeteer-helpers.ts` provides robust browser automation utilities designed around CALIN's EasyUI quirks.

### Click operations

| Helper | Description |
|--------|-------------|
| `safeClick` | Waits for visibility, scrolls into view, verifies clickability, then clicks. Pass `useJsClick: true` to use JS `.click()` instead of simulated mouse (more reliable for EasyUI). |
| `clickInNthElement` | Clicks a child element within the nth matching parent. |

### Input operations

| Helper | Description |
|--------|-------------|
| `safeType` | Types text character by character with proper waits. |
| `safeSetValue` | Sets an input value directly. Supports hidden EasyUI inputs with `visible: false`. |

### Selection operations

| Helper | Description |
|--------|-------------|
| `selectFromCombobox` | Opens a combobox and selects an option by visible text. |
| `getElementInNthParent` | Gets an element handle from the nth matching parent. |

### Navigation

| Helper | Description |
|--------|-------------|
| `safeReload` | Reloads the page and waits for network idle. |
| `safeGoto` | Navigates to a URL with configurable wait conditions. |

### Utilities

| Helper | Description |
|--------|-------------|
| `waitForElement` | Waits for an element with configurable visibility. |
| `waitForPageIdle` | Waits for network activity to settle. |
| `callBrowserFunction` | Calls a JavaScript function in the browser context. |
| `withRetry` | Wraps an operation with retry logic and optional failure screenshots. |

---

## Troubleshooting

**"Function not found in browser context"**
The page has not fully loaded. Ensure `waitForPageIdle` is called after navigation.

**"Element not clickable within timeout"**
Another element (loading overlay, dialog) is covering the target. Check debug screenshots for visual context.

**"Waiting for selector failed"**
Element does not exist or its selector has changed. For hidden EasyUI inputs, use the `visible: false` option.

**Captcha failures**
Check the captcha service status and API key. The service may need more time — increase `CAPTCHA_FETCH_DELAY_MS` if needed.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all values before running.

| Variable | Description |
|----------|-------------|
| `IS_HIBERNATED` | Set to `true` to start with no modules loaded (idle/standby mode). |
| `PORT` | HTTP listen port (default: `3000`). |
| `NXT_ENV` | Environment name. Cron jobs are only active when set to `production`. |
| `NXT_DB_HOST` | Primary PostgreSQL host (TypeORM). |
| `NXT_DB_PORT` | Primary PostgreSQL port. |
| `NXT_DB_USERNAME` | Primary PostgreSQL username. |
| `NXT_DB_PASSWORD` | Primary PostgreSQL password. |
| `NXT_DB_NAME` | Primary PostgreSQL database name. |
| `SUPABASE_API_URL` | Supabase project URL. |
| `SUPABASE_ANON_KEY` | Supabase anonymous (public) key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (admin). |
| `CALIN_V1_URL` | Base URL for the CALIN v1 web portal (used by Puppeteer). |
| `CALIN_V1_COMPANY_NAME` | Company name for CALIN v1 portal login. |
| `CALIN_V1_USERNAME` | CALIN v1 portal username. |
| `CALIN_V1_PASSWORD` | CALIN v1 portal password. |
| `CALIN_V2_API` | CALIN v2 REST API base URL. |
| `CALIN_V2_COMPANY_NAME` | Company name field for CALIN v2 API payloads. |
| `CALIN_V2_ADMIN_USERNAME` | CALIN v2 admin username. |
| `CALIN_V2_PASSWORD` | CALIN v2 password. |
| `CALIN_V2_POS_PASSWORD` | CALIN v2 POS password. |
| `CALIN_V2_CUSTOMER_ID` | CALIN v2 customer ID for API payloads. |
| `CALIN_V2_CUSTOMER_NAME` | CALIN v2 customer name for API payloads. |
| `CAPTCHA_API` | Captcha solving service base URL (used during CALIN v1 registration). |
| `CAPTCHA_API_KEY` | Captcha solving service API key. |
| `TIAMAT_API` | Tiamat service base URL (for reporting provisioning results). |
| `TIAMAT_API_KEY` | Tiamat API key (`X-API-KEY` header). |
| `HEADLESS_CHROME` | Set to `true` to run Puppeteer in headless mode. |
| `CONCURRENT_SESSIONS` | Maximum number of parallel CALIN v1 / hardware import sessions (default: `10`). |
| `SLEEP_UNIT` | Base timing unit (ms) for CALIN v1 Puppeteer automation delays. |
| `UPLOAD_FOLDER` | Path for storing Puppeteer screenshots and debug images. |
| `SENDGRID_API_KEY` | SendGrid API key (used by shared alert modules). |
| `MAKE_API_URL` | Make.com API base URL (for software dev alerts). |
| `MAKE_API_SOFTWARE_DEV_ALERT_ID` | Make.com scenario ID for dev alerts. |
| `EXCHANGE_RATES_API_URL` | Exchange rates API base URL. |
| `EXCHANGE_RATES_API_KEY` | Exchange rates API key. |
| `CHIRPSTACK_API_URL` | ChirpStack network server URL. |
| `CHIRPSTACK_API_TOKEN` | ChirpStack API token. |
| `CHIRPSTACK_APPLICATION_ID` | ChirpStack application ID. |
| `CHIRPSTACK_TENANT_ID` | ChirpStack tenant ID. |
| `CHIRPSTACK_PROFILE_ID` | ChirpStack device profile ID. |
| `CHIRPSTACK_APP_KEY` | ChirpStack application key. |
| `LOKI_URL` | Grafana Loki push URL for structured logging. |
| `LOKI_APP_NAME` | App label used in Loki log streams. |

---

## Running

```bash
# Development
npx nx serve talos

# Production build
npx nx build talos --configuration=production
```

---

## License

This project is licensed under the [Mozilla Public License 2.0](https://www.mozilla.org/MPL/2.0/). See the [`LICENSE`](../../LICENSE) file at the repository root.
