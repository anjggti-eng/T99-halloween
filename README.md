# Voting App - Firebase Implementation

This application has been refactored to use Firebase (Firestore) directly for voting, removing dependencies on AI APIs (Gemini/OpenAI) to eliminate quota exhaustion errors.

## Deployment Setup

### Vercel Configuration
Remove the following environment variables from your Vercel project settings, as they are no longer used:
- `GOOGLE_API_KEY`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- (Any other AI-related API keys)

### Backend/Database
The database is now entirely Firestore-based. No additional SQL setup is required on your server.

### Server Configuration
Ensure your Firebase project allows CORS requests from your Vercel-hosted frontend domain. This is managed in the Google Cloud Console for your Firebase project.
