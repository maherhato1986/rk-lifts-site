# RKL Client Portal Integration

The client portal front end is available at `/customer-portal.html`.

## Security model

- Both email and Saudi mobile must be verified once during registration.
- Later sign-in uses a one-time code sent to either verified identity.
- Authentication is cookie-based. Use `HttpOnly`, `Secure`, `SameSite=Lax` session cookies.
- Never store access tokens, OTP codes, customer files, or authorization state in `localStorage`.
- Every data query must be filtered by the authenticated organization ID on the server.
- Uploaded drawings must use private object storage and short-lived signed URLs.

## API contract

The front end expects JSON endpoints below under `/api/portal`.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/register/start` | Create pending registration and send email/mobile OTP |
| POST | `/auth/register/verify` | Verify both codes and create the client account |
| POST | `/auth/register/resend` | Resend registration codes with rate limits |
| POST | `/auth/login/start` | Send a sign-in code |
| POST | `/auth/logout` | Revoke the session |
| GET/PATCH | `/me` | Read/update the authenticated client |
| GET/POST | `/requests` | List/create service requests |
| GET | `/files` | List files visible to the organization |
| POST | `/files/upload-ticket` | Validate the file and return a private signed upload URL |
| POST | `/files/complete` | Register the completed upload |

## Required environment configuration

- Database and private object storage
- Transactional email provider
- Saudi SMS provider credentials
- Session signing secret
- Allowed file types, maximum file size, retention and malware scanning policy

The existing company-profile lead form should remain live until these services are configured. After successful production verification, its primary CTA can redirect to `/customer-portal.html`.
