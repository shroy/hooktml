// Not a valid component: lowercase single-word filename and a default export
// that is a plain object, not a function named "Malicious". A correct
// validate-/allowlist-before-import must skip it WITHOUT running this
// top-level side effect.
globalThis.__ISSUE_35_SIDE_EFFECT__ = (globalThis.__ISSUE_35_SIDE_EFFECT__ || 0) + 1
export default { notAComponent: true }
