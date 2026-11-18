import type {
  AnnualReport,
  CourseModule,
  ExpressInterestPayload,
  ExpressInterestResponse,
  ImpactStory,
  ImpactSummary,
  LocationImpact,
  PathwayInfo,
  PublicAlumnus,
  PublicPartner,
  PublicTeamMember,
  YearlyImpact,
} from './types';

export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const PARTNER_LOGOS: Record<string, string> = {
  partner_01: '/assets/aistudio/partner_01_493ddae3.png',
  partner_02: '/assets/aistudio/partner_02_c8629ceb.png',
  partner_03: '/assets/aistudio/partner_03_222bba2b.png',
  partner_04: '/assets/aistudio/partner_04_ca367b0f.png',
  partner_05: '/assets/aistudio/partner_05_90f15472.png',
  partner_06: '/assets/aistudio/partner_06_9871d626.png',
  partner_07: '/assets/aistudio/partner_07_8fb5d1d3.png',
  partner_08: '/assets/aistudio/partner_08_cd19a28b.png',
  partner_09: '/assets/aistudio/partner_09_75384d0f.png',
  partner_10: '/assets/aistudio/partner_10_26b5343c.png',
};

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      typeof data?.detail === 'string'
        ? data.detail
        : typeof data?.error === 'string'
          ? data.error
          : 'Request failed. Please try again.';
    throw new Error(detail);
  }
  return data as T;
}

export function fetchImpactSummary(): Promise<ImpactSummary> {
  return apiFetch<ImpactSummary>('/api/impact/summary');
}

export function fetchImpactLocations(): Promise<{
  as_of: string;
  data_label: string;
  locations: LocationImpact[];
}> {
  return apiFetch('/api/impact/locations');
}

export function fetchImpactYears(): Promise<{
  as_of: string;
  data_label: string;
  years: YearlyImpact[];
}> {
  return apiFetch('/api/impact/years');
}

export function fetchReports(): Promise<{
  as_of: string;
  data_label: string;
  reports: AnnualReport[];
  stories?: ImpactStory[];
}> {
  return apiFetch('/api/reports');
}

export function fetchProgrammes(): Promise<{
  as_of: string;
  data_label: string;
  modules: CourseModule[];
  pathways: PathwayInfo[];
}> {
  return apiFetch('/api/programmes');
}

export function fetchAlumni(filters?: {
  pathway?: string;
  country?: string;
  availability?: string;
  skill?: string;
  q?: string;
}): Promise<{
  total: number;
  countries: string[];
  alumni: PublicAlumnus[];
}> {
  const params = new URLSearchParams();
  if (filters?.pathway) params.set('pathway', filters.pathway);
  if (filters?.country) params.set('country', filters.country);
  if (filters?.availability) params.set('availability', filters.availability);
  if (filters?.skill) params.set('skill', filters.skill);
  if (filters?.q) params.set('q', filters.q);
  const qs = params.toString();
  return apiFetch(`/api/alumni${qs ? `?${qs}` : ''}`);
}

export function fetchAlumnusDetail(businessId: string): Promise<{
  profile: PublicAlumnus;
  related: PublicAlumnus[];
}> {
  return apiFetch(`/api/alumni/${encodeURIComponent(businessId)}`);
}

export function fetchTeam(): Promise<{ team: PublicTeamMember[] }> {
  return apiFetch('/api/team');
}

export function fetchPartners(): Promise<{ partners: PublicPartner[] }> {
  return apiFetch('/api/partners');
}

export function submitExpressInterest(
  payload: ExpressInterestPayload,
): Promise<ExpressInterestResponse> {
  return apiFetch('/api/interest', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function registerPartnerApplication(payload: {
  organisation: string;
  type: 'Employer' | 'Donor' | 'Client' | 'Training partner';
  country?: string;
  description?: string;
  website?: string;
  contact_name: string;
  email: string;
  phone?: string;
}): Promise<{ business_id: string; status: string }> {
  return apiFetch('/partners/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function subscribeNewsletter(payload: {
  email: string;
  list: 'alumni' | 'donor_partner';
  consent: boolean;
  website_url?: string;
}): Promise<{ status: string; list: string; message: string }> {
  return apiFetch('/api/newsletter/subscribe', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchDashboardData(token: string) {
  return apiFetch<Record<string, unknown>>('/api/dashboard', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function updateAlumniDashboard(
  token: string,
  payload: {
    short_bio?: string;
    availability?: string;
    skills?: string[];
    portfolio_title?: string;
    portfolio_url?: string | null;
    personal_website?: string | null;
    linkedin_url?: string | null;
    consent_to_publish?: boolean;
    consent_to_show_photo?: boolean;
  },
) {
  return apiFetch<{ status: string; consent_to_publish: boolean }>('/api/dashboard/alumni', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export function updateDashboardNewsletter(
  token: string,
  payload: { list: 'alumni' | 'donor_partner'; subscribed: boolean },
) {
  return apiFetch<{ list: string; status: string }>('/api/dashboard/newsletter', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export function fetchAdminOverview(token: string) {
  return apiFetch<Record<string, unknown>>('/api/admin/overview', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function updateAdminAlumnus(
  token: string,
  businessId: string,
  payload: {
    consent_to_publish?: boolean;
    consent_to_show_photo?: boolean;
    is_active?: boolean;
  },
) {
  return apiFetch(`/api/admin/alumni/${encodeURIComponent(businessId)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export function updateAdminPartner(
  token: string,
  businessId: string,
  payload: { show_on_site?: boolean; status?: string },
) {
  return apiFetch(`/api/admin/partners/${encodeURIComponent(businessId)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export function updateAdminUserRole(
  token: string,
  userId: number,
  role: string,
) {
  return apiFetch<{ id: number; role: string }>(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ role }),
  });
}

export function recordAdminImpactEvent(
  token: string,
  payload: {
    metric: 'learners_trained' | 'graduates' | 'employed_or_freelancing' | 'employer_partners';
    location_city: string;
    change: number;
    description: string;
  },
) {
  return apiFetch('/api/admin/impact/events', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}
