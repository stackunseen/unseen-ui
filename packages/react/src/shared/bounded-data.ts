/** Bound plain data before Zod traverses it. Never invoke accessor properties. */
export function boundedData(value: unknown, arrayLimit: 200 | 500 = 200) {
  let values = 0,
    characters = 0;
  const ancestors = new WeakSet<object>();
  function visit(current: unknown, depth: number): boolean {
    if (++values > 12000 || depth > 14) return false;
    if (typeof current === 'string') {
      characters += current.length;
      return current.length <= 10000 && characters <= 200000;
    }
    if (current === null || current === undefined || typeof current === 'boolean') return true;
    if (typeof current === 'number') return Number.isFinite(current);
    if (typeof current !== 'object' || ancestors.has(current)) return false;
    const array = Array.isArray(current);
    if (
      array
        ? current.length > arrayLimit
        : ![Object.prototype, null].includes(Object.getPrototypeOf(current))
    )
      return false;
    const descriptors = Object.getOwnPropertyDescriptors(current);
    const keys = Object.keys(descriptors).filter((key) => key !== 'length' || !array);
    if (
      keys.length > (array ? arrayLimit : 64) ||
      Reflect.ownKeys(current).some((key) => typeof key !== 'string')
    )
      return false;
    ancestors.add(current);
    const valid = keys.every((key) => {
      const property = descriptors[key]!;
      return 'value' in property && visit(property.value, depth + 1);
    });
    ancestors.delete(current);
    return valid;
  }
  try {
    return visit(value, 0);
  } catch {
    return false;
  }
}
