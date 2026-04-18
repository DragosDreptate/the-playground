// Local part : caractères non-espace et non-@, sans point en tête, fin, ou consécutifs.
// Domaine : une ou plusieurs parties séparées par `.`, chaque partie sans point interne,
// donc rejette les points terminaux (coco@google.com.) et consécutifs (a@b..c).
const EMAIL_REGEX =
  /^[^\s@.](?:[^\s@]*[^\s@.])?@[^\s@.]+(?:\.[^\s@.]+)+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}
