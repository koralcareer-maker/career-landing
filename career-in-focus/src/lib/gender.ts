/**
 * Gender helpers — single source of truth for "show feminine vs masculine".
 *
 * The User row carries a `gender` field ("f" | "m" | null) set at signup.
 * The brand audience is overwhelmingly women, so feminine is the default
 * for anything we surface without context (emails to unknown recipients,
 * placeholders, the marketing landing). Logged-in members get the form
 * that matches their stored gender.
 *
 * Usage on a server page:
 *   const session = await auth();
 *   const t = createGenderT(session?.user?.gender);
 *   <h1>{t("ברוכה הבאה", "ברוך הבא")}</h1>
 *
 * Usage in a client component:
 *   props.gender comes from the server page (don't read session in client)
 *   const t = createGenderT(props.gender);
 *
 * Usage in an isolated string (no helper instance needed):
 *   genderT(gender, "התחילי", "התחל")
 */

/**
 * Wider than `"f" | "m"` on purpose. The DB column is `String?` so the
 * value can be any string in legacy rows (or even null/undefined). All the
 * helpers below treat anything that isn't an explicit "m" as feminine.
 */
export type Gender = string | null | undefined;

/** True when the stored gender explicitly says masculine. Default is feminine. */
export function isMasculine(g: Gender): boolean {
  return g === "m";
}

/** Pick between feminine (default) and masculine string. */
export function genderT(g: Gender, feminine: string, masculine: string): string {
  return isMasculine(g) ? masculine : feminine;
}

/** Returns a bound t(f, m) for a given gender — convenient inside a page. */
export function createGenderT(g: Gender) {
  return (feminine: string, masculine: string) => genderT(g, feminine, masculine);
}
