const PRODUCT_ID = /^[0-9A-Z]{12}$/;

/**
 * The Fydell desktop app's Microsoft Store page, from the 12-character product
 * ID Partner Center assigns (MICROSOFT_STORE_PRODUCT_ID). Null until the app is
 * listed, so nothing links to a Store page that does not exist.
 */
export function microsoftStoreUrl(env: Record<string, string | undefined> = process.env): string | null {
  const id = env.MICROSOFT_STORE_PRODUCT_ID?.trim().toUpperCase();
  return id && PRODUCT_ID.test(id) ? `https://apps.microsoft.com/detail/${id}` : null;
}
