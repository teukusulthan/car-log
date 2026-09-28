import type { z } from "zod";

/** Shape returned by every form Server Action and consumed by `useActionState`. */
export type ActionState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Submitted text values, echoed back so the form keeps what the user typed after an error. */
  values?: Record<string, string>;
};

export const initialActionState: ActionState = {};

export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) values[key] = value;
  }
  return values;
}

type ParseResult<T> = { success: true; data: T } | { success: false; state: ActionState };

export function parseForm<S extends z.ZodType>(
  schema: S,
  formData: FormData,
  input: unknown = formValues(formData),
): ParseResult<z.output<S>> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { success: true, data: parsed.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.join(".");
    fieldErrors[key] ??= issue.message;
  }
  return {
    success: false,
    state: { message: "Please fix the highlighted fields.", fieldErrors, values: formValues(formData) },
  };
}
