import type { Document } from "mongoose";

export function serializeDoc<T>(doc: Document): T {
  return doc.toJSON() as T;
}

export function serializeDocs<T>(docs: Document[]): T[] {
  return docs.map((doc) => serializeDoc<T>(doc));
}

export function definedFields<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export function serializePopulatedRef<T>(
  doc: Document,
  path: string,
): T | null {
  if (!doc.populated(path)) return null;

  const ref = doc.get(path);
  if (
    !ref ||
    typeof ref !== "object" ||
    !("toJSON" in ref) ||
    typeof ref.toJSON !== "function"
  ) {
    return null;
  }

  return ref.toJSON() as T;
}

export function jsonTransform(
  _doc: unknown,
  ret: Record<string, unknown>,
  omit: string[] = [],
): Record<string, unknown> {
  ret.id = String(ret._id);
  delete ret._id;
  for (const key of omit) {
    delete ret[key];
  }
  return ret;
}
