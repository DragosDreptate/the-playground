export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };
