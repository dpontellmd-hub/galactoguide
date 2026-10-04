// Dataset-wide review metadata.
//
// DATA_LAST_REVIEWED is the baseline "evidence last reviewed" date applied to
// every substance that doesn't carry its own `reviewed` override. Bump this
// whenever the clinical content is re-checked as a batch; set a per-substance
// `reviewed` field when a single entry is reviewed out of cycle.
export const DATA_LAST_REVIEWED = '2026-06-15';

// Editorially curated Home collection. Order is intentional; this does not
// imply recency or popularity because the bundled data has neither signal.
export const FEATURED_IDS = ['pseudoephedrine', 'fenugreek'];
