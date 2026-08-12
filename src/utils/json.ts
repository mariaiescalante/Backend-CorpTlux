export function jsonColumns(row: Record<string, unknown>, columns: string[]): Record<string, unknown> {
  const copy = { ...row };
  for (const col of columns) {
    if (typeof copy[col] === "string") {
      try {
        copy[col] = JSON.parse(copy[col] as string);
      } catch {
        // keep as-is
      }
    }
  }
  return copy;
}
