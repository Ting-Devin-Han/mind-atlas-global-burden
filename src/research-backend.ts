export type ResearchSubmission = {
  participant_uuid: string;
  survey_version: string;
  consent_version: string;
  consented_at: string;
  language: "zh" | "en";
  recruitment_source: string | null;
  age_group: string;
  gender: string;
  country_code: string;
  residence_type: string;
  education: string;
  employment: string;
  household_size: number;
  income_ladder: number;
  financial_strain: number;
  housing_status: string;
  housing_insecurity: number;
  job_insecurity: number | null;
  healthcare_barrier: number;
  chronic_condition: string;
  disability: string;
  caregiving_hours: string;
  social_support: number;
  loneliness: number;
  discrimination: number;
  major_life_events: string;
  sleep_hours: number | null;
  gad7_answers: number[];
  gad7_score: number;
  who5_answers: number[];
  who5_score: number;
  functional_difficulty: number;
  completion_seconds: number;
};

export type StoredResearchSubmission = ResearchSubmission & {
  id: string;
  submitted_at: string;
};

export type SiteVisit = {
  session_id: string;
  page_path: string;
  country_code: string | null;
  country_name: string | null;
  browser_language: string | null;
  screen_width: number;
  referrer_host: string | null;
};

export type VisitorCountryCount = {
  country_code: string;
  visit_count: number;
};

const environment = import.meta.env as Record<string, string | undefined>;

export const researchConfig = {
  url: (environment.VITE_SUPABASE_URL || "").replace(/\/$/, ""),
  anonKey: environment.VITE_SUPABASE_ANON_KEY || "",
  studyContact: environment.VITE_STUDY_CONTACT || "",
  ethicsId: environment.VITE_ETHICS_ID || "",
  visitorGeoEndpoint: environment.VITE_VISITOR_GEO_ENDPOINT || "https://get.geojs.io/v1/ip/country.json",
  visitorAnalyticsEnabled: environment.VITE_VISITOR_ANALYTICS_ENABLED !== "false",
};

export const backendConfigured = Boolean(researchConfig.url && researchConfig.anonKey);
export const studyConfigured = Boolean(researchConfig.studyContact && researchConfig.ethicsId);

function headers(token = researchConfig.anonKey) {
  return {
    apikey: researchConfig.anonKey,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function submitResearchResponse(payload: ResearchSubmission) {
  if (!backendConfigured) throw new Error("BACKEND_NOT_CONFIGURED");
  const response = await fetch(`${researchConfig.url}/rest/v1/research_responses`, {
    method: "POST",
    headers: { ...headers(), Prefer: "return=minimal" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`SUBMISSION_FAILED_${response.status}`);
}

export async function signInResearchAdmin(email: string, password: string) {
  if (!backendConfigured) throw new Error("BACKEND_NOT_CONFIGURED");
  const response = await fetch(`${researchConfig.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: researchConfig.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error("AUTH_FAILED");
  return response.json() as Promise<{ access_token: string; expires_in: number; user: { email?: string } }>;
}

export async function fetchResearchResponses(token: string) {
  const response = await fetch(`${researchConfig.url}/rest/v1/research_responses?select=*&order=submitted_at.desc`, {
    headers: headers(token),
  });
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "FORBIDDEN" : "FETCH_FAILED");
  return response.json() as Promise<StoredResearchSubmission[]>;
}

export async function recordSiteVisit(payload: SiteVisit) {
  if (!backendConfigured) throw new Error("BACKEND_NOT_CONFIGURED");
  const response = await fetch(`${researchConfig.url}/rest/v1/site_visits`, {
    method: "POST",
    headers: { ...headers(), Prefer: "return=minimal" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`VISIT_RECORD_FAILED_${response.status}`);
}

export async function fetchVisitorCountryCounts() {
  if (!backendConfigured) return [];
  const response = await fetch(`${researchConfig.url}/rest/v1/rpc/get_visitor_country_counts`, {
    method: "POST",
    headers: headers(),
    body: "{}",
  });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`VISITOR_COUNTS_FAILED_${response.status}`);
  return response.json() as Promise<VisitorCountryCount[]>;
}
