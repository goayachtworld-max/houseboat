export function serializeDates<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value instanceof Date) {
      result[key] = value.toISOString();
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

export function serializeArray<T extends Record<string, unknown>>(arr: T[]): T[] {
  return arr.map(serializeDates);
}
