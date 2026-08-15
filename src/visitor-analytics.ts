import { backendConfigured, recordSiteVisit, researchConfig } from "./research-backend";

type GeoLookup = {
  success?: boolean;
  country_code?: string;
  country?: string;
  region?: string;
  city?: string;
  timezone?: { id?: string } | string;
};

const visitKey = "mind-atlas-visit-recorded-v1";

function compact(value: unknown, limit: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, limit) : null;
}

function referrerHost() {
  if (!document.referrer) return null;
  try {
    return new URL(document.referrer).hostname.slice(0, 255) || null;
  } catch {
    return null;
  }
}

export async function recordAnonymousSiteVisit(pagePath: string) {
  if (!backendConfigured || !researchConfig.visitorAnalyticsEnabled) return;
  try {
    if (window.sessionStorage.getItem(visitKey)) return;
    window.sessionStorage.setItem(visitKey, "pending");
  } catch {
    return;
  }

  let geo: GeoLookup = {};
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(researchConfig.visitorGeoEndpoint, { signal: controller.signal });
    if (response.ok) {
      const result = await response.json() as GeoLookup;
      if (result.success !== false) geo = result;
    }
  } catch {
    geo = {};
  } finally {
    window.clearTimeout(timeout);
  }

  const timezone = typeof geo.timezone === "string" ? geo.timezone : geo.timezone?.id;
  try {
    await recordSiteVisit({
      session_id: crypto.randomUUID(),
      page_path: compact(pagePath, 120) || "#/",
      country_code: compact(geo.country_code?.toUpperCase(), 2),
      country_name: compact(geo.country, 120),
      region: compact(geo.region, 160),
      city: compact(geo.city, 160),
      timezone: compact(timezone, 80),
      browser_language: compact(navigator.language, 35),
      screen_width: Math.round(window.innerWidth),
      referrer_host: referrerHost(),
    });
    window.sessionStorage.setItem(visitKey, "recorded");
  } catch {
    window.sessionStorage.removeItem(visitKey);
  }
}
