/** @typedef {Readonly<{ruleId: string, penalty: number, note: string}>} Finding */

/** Builds a finding whose penalty comes from the policy pack, never from the rule. */
export function finding(ruleId, policy, note) {
  return Object.freeze({ ruleId, penalty: policy.penalties[ruleId], note });
}
