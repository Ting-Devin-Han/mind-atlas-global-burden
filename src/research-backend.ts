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

const environment = import.meta.env as Record<string, string | undefined>;

export const researchConfig = {
  url: (environment.VITE_SUPABASE_URL || "").replace(/\/$/, ""),
  anonKey: environment.VITE_SUPABASE_ANON_KEY || "",
  studyContact: environment.VITE_STUDY_CONTACT || "",
  ethicsId: environment.VITE_ETHICS_ID || "",
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
