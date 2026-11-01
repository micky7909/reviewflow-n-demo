# AI_TOP_100 preserved source — 2026-11-01

This archive branch preserves the Kyodong Kakao bot deployed for AI_TOP_100.
Original commit: `c47ea16ae785dd611db5702552d94d04ea3e37a3`.
Original deployed branch: `kyodong-bot-20261031`.
All six original files under `kyodong-bot/` are unchanged.
The archive branch is separate from the deployment branch and `main`.

## Restore locally

Retrieve the privately preserved `Kyodong_Chatbot_Knowledge_Pack_v1_20261031.zip`
and extract its `Kyodong_Knowledge_Pack_v1` directory outside this repository.
From this repository root:

```bash
node preservation/build-knowledge.mjs /absolute/path/to/Kyodong_Knowledge_Pack_v1 kyodong-bot/knowledge.json
cd kyodong-bot
npm test
```

For real use, copy `.env.example` to a private `.env.local`, privately fill the
three required credentials, then run `npm start`. No credentials are provided
by this archive. Node.js >=22 is declared by the original package; recovery
was verified with Node.js 24.22.1. The original package has no third-party npm
dependencies.

## Files in preservation/

- `ENVIRONMENT.md`: all six environment-variable names used by source
- `RENDER_RESTORE.md`: captured build, start, region, plan and deployment settings
- `env.example`: empty credential placeholders and original source defaults
- `build-knowledge.mjs`: verifies the original pack and reconstructs knowledge
- `source-manifest.json`: original per-file blob hashes and SHA-256 checksums

The knowledge pack, reconstructed knowledge, actual .env files, API keys,
bot credentials, incoming Authorization values, callback tokens and deploy
hooks are excluded from this public repository. Knowledge reconstructed from
the preserved pack is runtime-compatible; equality to the deployed environment
payload has not been verified. Do not describe it as a deployed-env export.

Recovery verification: original Kyodong tests 3/3 passed with reconstructed
knowledge and mocked network calls; original knowledge-pack hashes 39/39
passed. The separately preserved 2026-10-27 generic server passed 42 tests,
but uses a different webhook adapter. No paid API call or official contest
evaluation was performed for this archival task.

The organizer announced contest bot/channel removal on 2026-11-02. Reuse needs
a replacement Kakao bot, its credentials, and webhook registration. This archive
is independent of the 2026-11-04 qualification result. Account billing and
the server suspension outcome are tracked in the private cleanup report.
