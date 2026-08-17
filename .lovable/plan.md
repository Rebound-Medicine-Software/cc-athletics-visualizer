# Fix VALD test loading

## Implementation
- Update the VALD tests request to include the API-required `modifiedFrom` timestamp.
- Use a stable historical default so existing athlete tests remain discoverable without requiring a UI change.
- URL-encode all query parameters rather than interpolating raw values.
- Keep error responses and CORS behavior intact.

## Verification
- Deploy the updated `vald-bridge` Edge Function automatically.
- Call the tests action for the affected athlete and confirm the upstream 400 is gone and a valid tests payload is returned.
