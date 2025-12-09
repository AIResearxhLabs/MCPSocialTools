# Migration Summary: Gemini to OpenAI & Deployment Separation

## Overview

This document summarizes the changes made to migrate the MCPSocial service from Gemini API to OpenAI API, and the separation of local and cloud deployment processes.

## Date: November 17, 2025

---

## 🔄 Changes Made

### 1. API Migration: Gemini → OpenAI

#### Updated Files

**Configuration Files:**
- ✅ `.env.example` - Replaced `GEMINI_API_KEY` with `OPENAI_API_KEY`
- ✅ `src/config/config.json` - Updated API key configuration
- ✅ `src/config/index.ts` - Exported `openaiConfig` instead of `geminiConfig`

**Core Client:**
- ✅ Created `src/core/openai-client.ts` - New OpenAI API client implementation
- ✅ Deleted `src/core/gemini-client.ts` - Removed old Gemini client

**API Routes:**
- ✅ `src/api/routes.ts` - Updated to use OpenAIClient
  - Changed endpoints from `/api/gemini/*` to `/api/openai/*`
  - Updated capabilities documentation

**MCP Host:**
- ✅ `src/mcp-host.ts` - Updated to use OpenAIClient
  - Renamed `registerGeminiTools()` to `registerOpenAITools()`
  - Updated tool descriptions to reference OpenAI

**AWS Configuration:**
- ✅ `task-definition.json` - Updated environment variable from `GEMINI_API_KEY` to `OPENAI_API_KEY`

---

### 2. Deployment Process Separation

#### New Deployment Scripts

**Local Deployment (Primary):**
- ✅ `deploy-local.sh` - NEW: Dedicated script for Docker Desktop deployment
  - Pre-flight checks for Docker
  - Environment variable validation
  - Local container management
  - Service health verification
  - Clear user feedback and instructions

**AWS Deployment (Secondary):**
- ✅ `deploy-aws.sh` - UPDATED: Maintained existing AWS deployment
  - Updated to use `OPENAI_API_KEY`
  - Kept comprehensive infrastructure setup
  - Maintained service lifecycle management

**Legacy Scripts (Preserved):**
- `deploy.sh` - Original local deployment script (kept for compatibility)
- `quick-deploy.sh` - Quick deployment option (unchanged)

#### Documentation

- ✅ `DEPLOYMENT_README.md` - NEW: Comprehensive deployment guide
  - Prerequisites for local and AWS deployment
  - Step-by-step deployment instructions
  - Troubleshooting section
  - Best practices and workflow recommendations

---

## 📊 API Endpoint Changes

### Old Endpoints (Gemini)
```
POST /api/gemini/caption
POST /api/gemini/schedule
```

### New Endpoints (OpenAI)
```
POST /api/openai/caption
POST /api/openai/schedule
```

---

## 🔑 Environment Variables

### Before
```bash
GEMINI_API_KEY=your_gemini_api_key_here
FACEBOOK_ACCESS_TOKEN=your_facebook_access_token_here
INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token_here
PORT=3001
```

### After
```bash
OPENAI_API_KEY=your_openai_api_key_here
FACEBOOK_ACCESS_TOKEN=your_facebook_access_token_here
INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token_here
PORT=3001
DEPLOYMENT_ENV=local  # NEW: optional environment indicator
```

---

## 🚀 Deployment Workflow

### Recommended Process

1. **Local Development & Testing**
   ```bash
   cd services/mcpsocial
   ./deploy-local.sh
   ```

2. **Validation**
   ```bash
   # Test endpoints
   curl http://localhost:3001/api/capabilities
   
   # Check logs
   docker logs -f mcpsocial-app
   ```

3. **AWS Deployment** (only after local validation)
   ```bash
   ./deploy-aws.sh
   ```

---

## ✅ Testing Checklist

- [x] Build succeeds without TypeScript errors
- [x] All imports updated to use OpenAIClient
- [x] Configuration files properly updated
- [x] Environment variables correctly mapped
- [x] Local deployment script created and executable
- [x] AWS deployment script updated
- [x] Documentation created

---

## 📝 Migration Notes

### OpenAI Client Implementation

The new `OpenAIClient` class:
- Uses OpenAI's Chat Completions API (GPT-4)
- Implements the same interface as the old GeminiClient
- Returns JSON-formatted responses for consistency
- Includes error handling with fallback responses
- Uses standard fetch API for HTTP requests

### Deployment Philosophy

The new deployment approach:
1. **Local-First**: Always test locally before AWS deployment
2. **Validation-Heavy**: Extensive pre-flight checks and environment validation
3. **User-Friendly**: Clear progress indicators and helpful error messages
4. **Self-Documenting**: Scripts include detailed comments and help text

---

## 🔐 Security Considerations

1. **API Keys**: Never commit actual API keys to the repository
2. **Environment Files**: `.env` is gitignored, only `.env.example` is tracked
3. **AWS Deployment**: API keys are prompted at deployment time, not stored
4. **Local Deployment**: Uses `.env` file for secure key storage

---

## 📚 Additional Resources

- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [DEPLOYMENT_README.md](./DEPLOYMENT_README.md) - Detailed deployment guide
- [API_REFERENCE.md](./docs/API_REFERENCE.md) - API documentation

---

## 🔄 Rollback Procedure

If issues occur with the OpenAI integration:

1. The old Gemini implementation can be restored from git history
2. Revert commits related to this migration
3. Restore environment variables to use `GEMINI_API_KEY`
4. Rebuild and redeploy

---

## ✨ Benefits of These Changes

1. **Better AI Performance**: OpenAI GPT-4 provides superior text generation
2. **Clearer Deployment**: Separate scripts for local and cloud deployment
3. **Faster Development**: Test locally before expensive cloud deployment
4. **Better Documentation**: Comprehensive guides for all deployment scenarios
5. **Improved Workflow**: Clear separation of development and production phases

---

## 📞 Support

For questions or issues:
1. Review the [DEPLOYMENT_README.md](./DEPLOYMENT_README.md)
2. Check the troubleshooting section in the deployment guide
3. Review logs (local: `docker logs -f mcpsocial-app`)
4. Consult the main documentation in `docs/`

---

**Migration completed successfully! ✅**
