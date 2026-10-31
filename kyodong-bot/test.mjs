import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, kakaoResponse, retrieve } from './server.mjs';

const env = { OPENAI_API_KEY: 'local-test', BOT_TOKEN: 'local-bot-test', WEBHOOK_AUTH: 'local-header-test' };
const event = { op: 0, t: 'MESSAGE_CREATE', d: { id: '558185822630215770', content: '환불 방법', botUserKey: 'test-user', botGroupKey: 'test-room', callbackToken: 'local-callback' } };

test('Kakao text components obey 3 x 1000 codepoint limits', () => {
  const result = kakaoResponse('😀'.repeat(3200));
  assert.equal(result.template.outputs.length, 3);
  for (const x of result.template.outputs) assert.ok(Array.from(x.simpleText.text).length <= 1000);
});

test('source retrieval includes refund material', () => {
  const result = retrieve('곰팡이 하자 환불');
  assert.ok(result.some(x => /환불|하자/.test(x.text)));
});

test('webhook acknowledges immediately, authenticates, calls correct async API, deduplicates, ignores leave', async () => {
  let release;
  const wait = new Promise(resolve => { release = resolve; });
  const calls = [];
  const server = createServer({ env, agent: async () => { await wait; return '고객이 재배송 또는 전액환불을 선택할 수 있습니다.'; },
    fetcher: async (url, options) => { calls.push({ url, headers: options.headers, body: JSON.parse(options.body) }); return { ok: true, json: async () => ({ sendCount: 1, errorCount: 0 }) }; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/webhook`;
  const post = (body, auth = env.WEBHOOK_AUTH) => fetch(url, { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    assert.equal((await post(event, 'incorrect')).status, 401);
    const at = Date.now();
    assert.equal((await post(event)).status, 204);
    assert.ok(Date.now() - at < 1000);
    assert.equal(calls.length, 0);
    assert.equal((await post(event)).status, 204);
    release();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://kapi.kakao.com/v1/bot/callback');
    assert.equal(calls[0].headers.Authorization, `KakaoAK ${env.BOT_TOKEN}`);
    assert.equal(calls[0].headers['X-Bot-Callback-Token'], event.d.callbackToken);
    assert.equal(calls[0].body.skillResponse.version, '2.0');
    assert.equal((await post({ op: 0, t: 'LEAVE', d: { botUserKey: 'test-user', botGroupKey: 'test-room' } })).status, 204);
    assert.equal(calls.length, 1);
  } finally { release(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
