/** Hosts of the browser push services (Apple, Google, Mozilla, Microsoft). */
const PUSH_HOSTS = [/^web\.push\.apple\.com$/, /^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/];

/** The cron POSTs to stored endpoints, so only real push services are accepted (no SSRF to other hosts). */
export function isAllowedPushEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && PUSH_HOSTS.some((re) => re.test(url.hostname));
  } catch {
    return false;
  }
}
