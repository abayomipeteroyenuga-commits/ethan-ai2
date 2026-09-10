# Free Search Setup

1. Upload this build to the ETHAN AI GitHub repository.
2. Redeploy it on Vercel.
3. No OPENAI_API_KEY, OPENAI_MODEL, or MAX_OUTPUT_TOKENS environment variables are required.
4. Test `/api/health`. It should report `searchMode: "free-public"` and `paidApiRequired: false`.
5. Test Smart Answer, News, Academic, Images, Videos and Discussions individually.

Supabase remains separate and is still used for account authentication.
