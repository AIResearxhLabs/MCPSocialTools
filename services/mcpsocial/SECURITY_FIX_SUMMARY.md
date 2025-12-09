# Security Fix: LinkedIn API Credentials Migration to Environment Variables

## Summary
Moved LinkedIn API credentials from the hardcoded `config.json` file to environment variables to comply with security best practices and GitHub security requirements.

## Changes Made

### 1. Updated `.env.example`
**File:** `services/mcpsocial/.env.example`

Added LinkedIn API configuration variables:
```bash
LINKEDIN_API_KEY=your_linkedin_api_key_here
LINKEDIN_API_SECRET=your_linkedin_api_secret_here
```

Also added missing Facebook and Instagram App ID and Secret variables for completeness.

### 2. Removed Hardcoded Secrets from `config.json`
**File:** `services/mcpsocial/src/config/config.json`

**Before:**
```json
{
  "linkedin": {
    "apiKey": "", 
    "apiSecret": "" 
  }
}
```

**After:**
```json
{
  "linkedin": {
    "apiKey": "YOUR_LINKEDIN_API_KEY",
    "apiSecret": "YOUR_LINKEDIN_API_SECRET"
  }
}
```

### 3. Created `.env` File
**File:** `services/mcpsocial/.env`

Created the actual `.env` file with the LinkedIn credentials that were previously in `config.json`. This file is protected by `.gitignore` and will not be committed to the repository.

### 4. Updated Documentation
**File:** `services/mcpsocial/DEPLOYMENT_README.md`

Updated the environment variables table and configuration example to include:
- `LINKEDIN_API_KEY`
- `LINKEDIN_API_SECRET`
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`
- `INSTAGRAM_APP_ID`
- `INSTAGRAM_APP_SECRET`

### 5. Verified `.gitignore` Protection
**File:** `.gitignore`

Confirmed that `.env` files are already properly excluded from version control:
```
.env
.env.local
.env.*.local
```

## How It Works

The existing code in `services/mcpsocial/src/config/index.ts` already supports environment variables with fallback to `config.json`:

```typescript
export const linkedinConfig = {
  apiKey: process.env.LINKEDIN_API_KEY || config.linkedin.apiKey,
  apiSecret: process.env.LINKEDIN_API_SECRET || config.linkedin.apiSecret,
};
```

With the `.env` file in place, the application will:
1. First try to load credentials from environment variables
2. Fall back to `config.json` values if environment variables are not set
3. Since `config.json` now contains placeholder values, actual credentials must be in `.env`

## Security Benefits

✅ **No secrets in version control**: The `.env` file is gitignored and won't be committed
✅ **Easy credential rotation**: Update `.env` without modifying code
✅ **Environment-specific configs**: Different credentials for dev/staging/production
✅ **GitHub security compliance**: Resolves GitHub secret scanning alerts
✅ **Best practice alignment**: Follows 12-factor app methodology

## Migration Checklist

For team members setting up the project:

- [x] Copy `.env.example` to `.env`
- [x] Add your LinkedIn API credentials to `.env`
- [x] Add other API keys (OpenAI, Facebook, Instagram) as needed
- [x] Never commit the `.env` file to git
- [x] Keep credentials secure and rotate regularly

## Testing

Build verification completed successfully:
```bash
cd services/mcpsocial && npm run build
✓ Build completed without errors
```

## Next Steps

1. **For existing deployments**: Update environment variables in your deployment platform (AWS ECS, Docker, etc.)
2. **For new team members**: Follow the updated `DEPLOYMENT_README.md` to configure environment variables
3. **For CI/CD**: Ensure secrets are configured in your CI/CD pipeline (GitHub Secrets, AWS Secrets Manager, etc.)

## Files Modified

1. `services/mcpsocial/.env.example` - Added LinkedIn and other missing variables
2. `services/mcpsocial/.env` - Created with actual credentials (not in git)
3. `services/mcpsocial/src/config/config.json` - Removed hardcoded secrets
4. `services/mcpsocial/DEPLOYMENT_README.md` - Updated documentation
5. `services/mcpsocial/SECURITY_FIX_SUMMARY.md` - This file (new)

## Date
December 9, 2025

## Status
✅ **COMPLETED** - All changes implemented and verified
