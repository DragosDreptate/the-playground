/**
 * Time utilities for the Moment form date/time picker.
 * Pure functions — no external dependencies.
 */

export type TimeOption = {
  value: string; // "HH:mm"
  label: string; // "HH:mm" (display)
};

/**
 * Generate 30-minute time slots from 00:00 to 23:30.
 */
export function generateTimeOptions(): TimeOption[] {
  const options: TimeOption[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const value = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      options.push({ value, label: value });
    }
  }
  return options;
}

/**
 * Combine a Date (day) and a time string ("HH:mm") into an ISO UTC string.
 *
 * The Date is interpreted in the **browser's local timezone** (getHours, etc.
 * are local), so the resulting ISO string correctly represents the UTC instant
 * matching the user's local time selection.
 *
 * Example (Paris UTC+1): date=Feb 25, time="23:00"
 *   → new Date set to Feb 25 23:00 Paris → toISOString() → "2026-02-25T22:00:00.000Z"
 */
export function combineDateAndTime(date: Date, time: string): string {
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

/**
 * Extract "HH:mm" from a Date object.
 */
export function extractTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Snap a time string to the nearest 30-minute slot.
 * E.g. "17:14" → "17:00", "17:16" → "17:30"
 */
export function snapToSlot(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const snapped = m < 15 ? 0 : m < 45 ? 30 : 0;
  const finalH = m >= 45 ? (h + 1) % 24 : h;
  return `${finalH.toString().padStart(2, "0")}:${snapped.toString().padStart(2, "0")}`;
}
