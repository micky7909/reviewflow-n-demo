# Environment contract

These names are extracted from the deployed source commit. Render's saved
environment-variable inventory and values have not been exported.

| Name | Purpose | Restore rule |
| --- | --- | --- |
| OPENAI_API_KEY | OpenAI Responses API credential | Required secret; enter privately |
| BOT_TOKEN | Kakao bot credential | Required secret; use the token for the replacement bot |
| WEBHOOK_AUTH | Complete Authorization header expected on incoming webhooks | Required secret; must exactly match the replacement webhook setting |
| OPENAI_MODEL | Model ID | Optional; source default is gpt-5.4-mini |
| PORT | HTTP listening port | Optional; source default is 10000; bind is 0.0.0.0 |
| KNOWLEDGE_GZIP_B64 | Base64 of gzip-compressed JSON knowledge | Optional if knowledge.json is present; required to boot when that file is absent |

The source reads knowledge before listening. Missing both the environment
payload and knowledge.json prevents startup. A successful /healthz response
does not establish that model credentials or Kakao delivery work. /readyz checks
the presence of three required credentials, without validating them remotely.

No actual API key, bot token, webhook Authorization value, callback token,
Render API key, deploy-hook URL, or exported .env file is included. Strings
beginning with local- in the original tests are inert test fixtures.

The 2026-10-27 generic server has a different environment contract and request
adapter. Its .env.example is preserved in legacy/; do not substitute it for
the deployed Kyodong implementation.
