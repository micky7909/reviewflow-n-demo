import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { gzipSync } from 'node:zlib';

// Reconstruct a runtime-compatible knowledge object from the preserved pack.
// This is not an export of the deployed KNOWLEDGE_GZIP_B64 environment value.
const [packArg, outputArg, envFileArg] = process.argv.slice(2);
if (!packArg || !outputArg) {
  console.error('Usage: node build-knowledge.mjs PACK_DIRECTORY OUTPUT_JSON [OUTPUT_ENV_FILE]');
  process.exit(2);
}
const pack = path.resolve(packArg);
const hashes = JSON.parse(fs.readFileSync(path.join(pack, 'SHA256.json'), 'utf8'));
for (const [relative, expected] of Object.entries(hashes)) {
  const filename = path.resolve(pack, relative);
  if (!filename.startsWith(pack + path.sep)) throw new Error('unsafe_manifest_path');
  const actual = crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
  if (actual !== expected) throw new Error('knowledge_pack_hash_mismatch: ' + relative);
}
const manifest = JSON.parse(fs.readFileSync(path.join(pack, 'source_manifest.json'), 'utf8'));
const chunks = fs.readFileSync(path.join(pack, 'retrieval_chunks.jsonl'), 'utf8')
  .split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
for (const chunk of chunks) {
  if (typeof chunk.title !== 'string' || typeof chunk.text !== 'string') throw new Error('invalid_chunk');
}
const knowledge = {
  system: fs.readFileSync(path.join(pack, '01_SYSTEM_PROMPT.txt'), 'utf8'),
  quick: fs.readFileSync(path.join(pack, '02_QUICK_CONTEXT.txt'), 'utf8'),
  sourceCount: manifest.sources.length,
  chunks,
};
const json = JSON.stringify(knowledge);
const out = path.resolve(outputArg);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, json + '\n', { mode: 0o600 });
if (envFileArg) {
  const envOut = path.resolve(envFileArg);
  fs.mkdirSync(path.dirname(envOut), { recursive: true });
  fs.writeFileSync(envOut, 'KNOWLEDGE_GZIP_B64=' + gzipSync(Buffer.from(json)).toString('base64') + '\n', { mode: 0o600 });
}
console.log(JSON.stringify({ sources: knowledge.sourceCount, chunks: chunks.length,
  packHashesVerified: Object.keys(hashes).length, output: out,
  origin: 'reconstructed_from_preserved_pack_not_deployed_env_export' }));
