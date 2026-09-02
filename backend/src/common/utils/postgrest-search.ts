// Escapes a raw search term for safe embedding inside a PostgREST
// `ilike` pattern used within `.or(...)`. Two escaping layers are
// needed, applied in this order:
//
// 1. Postgres's own ILIKE pattern semantics: backslash is the LIKE
//    escape character, so it must be doubled before the caller's own
//    `%`/`_` are neutralized into literal matches.
// 2. PostgREST's `.or(...)` quoted-value syntax: it unescapes any
//    `\X` back to `X` before Postgres ever sees the value, so every
//    backslash produced by step 1 must be doubled again to survive
//    that unescape, and a literal `"` would otherwise end the quoted
//    value early (letting the rest of the term inject extra clauses).
export function escapeIlikeTerm(term: string): string {
  const likeEscaped = term.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  return likeEscaped.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
