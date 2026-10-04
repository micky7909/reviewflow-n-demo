// Draft audit rules, applied in this order (the order is visible in the report).
// To add a rule: create a file exporting {id, check(context, policy, facts)}, add it here,
// and give it a penalty in the policy pack. validatePolicyPack fails fast if you forget.
import { disclosureMissingRule } from './disclosure-missing.js';
import { disclosureLateRule } from './disclosure-late.js';
import { placeholderRule } from './placeholder.js';
import { keywordCountRule } from './keyword-count.js';
import { lengthRule } from './length.js';
import { evidenceRule } from './evidence.js';

export const DRAFT_RULES = Object.freeze([
  disclosureMissingRule,
  disclosureLateRule,
  placeholderRule,
  keywordCountRule,
  lengthRule,
  evidenceRule,
]);

const ids = DRAFT_RULES.map(r => r.id);
if (new Set(ids).size !== ids.length) throw new Error(`duplicate rule id in ${ids.join(', ')}`);
