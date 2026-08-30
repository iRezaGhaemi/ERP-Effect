export function parseCookieHeader(value: string): Record<string, string> {
  return value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((cookies, part) => {
      const [name, ...valueParts] = part.split("=");
      if (!name) return cookies;
      try {
        cookies[name] = decodeURIComponent(valueParts.join("="));
      } catch {
        // A malformed attacker-controlled cookie is treated as absent.
      }
      return cookies;
    }, {});
}
