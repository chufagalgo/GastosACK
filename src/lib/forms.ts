// Helpers para leer FormData en server actions.

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: string;
  /** Valores enviados: React vacía el formulario tras la acción y así se pueden restaurar. */
  values?: Record<string, string>;
}

export function formValues(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd) if (typeof v === "string" && !k.startsWith("$")) out[k] = v;
  return out;
}

export function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim() : "";
}

export function bool(fd: FormData, name: string): boolean {
  return fd.get(name) === "on";
}

export function optInt(fd: FormData, name: string): number | null {
  const v = str(fd, name);
  if (v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : NaN;
}

/** Convierte los issues de zod a { campo: mensaje } */
export function fieldErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = String(i.path[0] ?? "_");
    out[key] ??= i.message;
  }
  return out;
}
