/**
 * A host state value as people read it: `auth-required` becomes "Auth required", `added` becomes
 * "Added". Status badges then read like the rest of the interface instead of showing raw values.
 */
export function stateLabel(value: string): string {
  const words = value.replace(/[-_]+/g, ' ').trim();
  return words ? words[0]!.toLocaleUpperCase() + words.slice(1) : value;
}
