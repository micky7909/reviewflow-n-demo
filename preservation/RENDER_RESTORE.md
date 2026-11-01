# Captured Render settings and manual restoration

Observed 2026-11-01, Asia/Seoul. The authoritative pre-cleanup API snapshot
is evidence/render_service_before.json. This document does not deploy anything.

| Setting | Captured value |
| --- | --- |
| Service | kyodong-bot-dayen-1031 |
| Service ID | srv-dbio7uks728c73frvmpg |
| Workspace | tea-dbintd0ae00c73c7bcug |
| Type / runtime | web_service / node |
| Repository | https://github.com/micky7909/reviewflow-n-demo |
| Original branch | kyodong-bot-20261031 |
| Deployed commit | c47ea16ae785dd611db5702552d94d04ea3e37a3 |
| Deployed ID | dep-dbio7vcs728c73frvoug |
| Instance plan / region / instances | free / singapore / 1 |
| Root directory | Empty (repository root) |
| Build command | cd kyodong-bot && npm install --omit=dev |
| Start command | cd kyodong-bot && npm start |
| Health-check path | Empty (platform default TCP check) |
| Automatic deployment before cleanup | yes / commit |
| Independent service previews | off |
| Public endpoint | https://kyodong-bot-dayen-1031.onrender.com/webhook |

The returned buildPlan field says starter. It is a build-pipeline setting;
the serviceDetails.plan field is free. Do not treat buildPlan as evidence of
a paid web-service instance.

To restore later, use the preserved code branch or its recorded commit.
Prepare the knowledge payload with tools/build-knowledge.mjs and either put
knowledge.json next to server.mjs or privately set KNOWLEDGE_GZIP_B64 on Render.
For a public source repository, keep the knowledge pack and generated payload
outside Git. Supply OPENAI_API_KEY, BOT_TOKEN, and WEBHOOK_AUTH privately.
Select the captured commands and plan only when intentionally restoring.
Keep Auto-Deploy Off during archival and initial recovery verification.

The original contest bot/channel will be removed by the organizer on 2026-11-02.
A reusable server needs a new Kakao bot, matching webhook Authorization, bot
credential, and /webhook registration. The old contest channel is not part of
this backup. Do not restore or change the ReviewFlow main branch to run this bot.

Current reference documents checked on 2026-11-01:
- https://render.com/docs/free
- https://render.com/docs/deploys
- https://render.com/docs/health-checks
- https://api-docs.render.com/reference/suspend-service-1

Render's current Free documentation says bandwidth and build minutes can incur
overage charges when included amounts are exhausted and billing is enabled.
Instance plan alone cannot establish the final account balance. Account
subscription, prior usage, auto-recharge, and invoices need authenticated review.
