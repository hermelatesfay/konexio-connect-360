import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import { ArrowRight, UserPlus } from 'lucide-react';
import { fetchProgrammes } from '../api';
import { useAuthStore } from '../store/authStore';
import type { PathwayInfo } from '../types';

type SignUpPageProps = {
  onNavigate: (path: string) => void;
  initialSearch?: string;
};

type RegistrationType = 'learner' | 'alumni' | 'employer' | 'partner' | 'donor';

type SignUpForm = {
  first_name: string;
  second_name: string;
  email: string;
  password: string;
  city: string;
  country: string;
  pathway_code: string;
  learning_goal: string;
  short_bio: string;
  skills: string;
  languages: string;
  availability: string;
  portfolio_title: string;
  portfolio_url: string;
  personal_website: string;
  linkedin_url: string;
  consent_to_publish: boolean;
  consent_to_show_photo: boolean;
  organisation: string;
  partner_type: 'Employer' | 'Client' | 'Training partner';
  description: string;
  website: string;
  phone: string;
};

const isRegistrationType = (value: string | null): value is RegistrationType =>
  value === 'learner' ||
  value === 'alumni' ||
  value === 'employer' ||
  value === 'partner' ||
  value === 'donor';

const SignUpPage = ({ onNavigate, initialSearch = '' }: SignUpPageProps) => {
  const initialTypeParam = new URLSearchParams(initialSearch).get('type');
  const preselectedType = isRegistrationType(initialTypeParam) ? initialTypeParam : '';

  const register = useAuthStore((state) => state.register);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [registrationType, setRegistrationType] = useState<RegistrationType | ''>(preselectedType);
  const [pathways, setPathways] = useState<PathwayInfo[]>([]);
  const [form, setForm] = useState<SignUpForm>({
    first_name: '',
    second_name: '',
    email: '',
    password: '',
    city: '',
    country: '',
    pathway_code: 'P1',
    learning_goal: '',
    short_bio: '',
    skills: '',
    languages: '',
    availability: 'Available for freelance work',
    portfolio_title: '',
    portfolio_url: '',
    personal_website: '',
    linkedin_url: '',
    consent_to_publish: false,
    consent_to_show_photo: false,
    organisation: '',
    partner_type: 'Employer',
    description: '',
    website: '',
    phone: '',
  });

  useEffect(() => {
    let active = true;
    fetchProgrammes()
      .then((res) => {
        if (active) setPathways(res.pathways);
      })
      .catch(() => {
        /* Fallback options handled below */
      });
    return () => {
      active = false;
    };
  }, []);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    const checked = event.target instanceof HTMLInputElement ? event.target.checked : false;
    setForm((prev) => ({
      ...prev,
      [name]:
        event.target instanceof HTMLInputElement && event.target.type === 'checkbox'
          ? checked
          : value,
    }));
    clearError();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!registrationType) return;

    try {
      const user = await register({
        first_name: form.first_name.trim(),
        second_name: form.second_name.trim(),
        email: form.email.trim(),
        password: form.password,
        account_type: registrationType,
        has_organisation:
          registrationType === 'employer' ||
          registrationType === 'partner' ||
          registrationType === 'donor',
        ...(registrationType === 'learner' && {
          city: form.city.trim(),
          country: form.country.trim(),
          pathway_code: form.pathway_code,
          learning_goal: form.learning_goal.trim(),
        }),
        ...(registrationType === 'alumni' && {
          city: form.city.trim(),
          country: form.country.trim(),
          pathway_code: form.pathway_code,
          short_bio: form.short_bio.trim(),
          skills: form.skills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          languages: form.languages
            .split(',')
            .map((l) => l.trim())
            .filter(Boolean),
          availability: form.availability,
          portfolio_title: form.portfolio_title.trim(),
          portfolio_url: form.portfolio_url.trim(),
          personal_website: form.personal_website.trim(),
          linkedin_url: form.linkedin_url.trim(),
          consent_to_publish: form.consent_to_publish,
          consent_to_show_photo: form.consent_to_show_photo,
        }),
        ...((registrationType === 'employer' ||
          registrationType === 'partner' ||
          registrationType === 'donor') && {
          organisation: form.organisation.trim(),
          country: form.country.trim(),
          partner_type:
            registrationType === 'donor'
              ? ('Donor' as const)
              : registrationType === 'employer'
                ? ('Employer' as const)
                : form.partner_type,
          description: form.description.trim(),
          website: form.website.trim(),
          phone: form.phone.trim(),
        }),
      });
      onNavigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch {
      // Error surfaced via authStore
    }
  };

  return (
    <section className="auth-shell">
      <div className="container" style={{ maxWidth: '780px' }}>
        <div className="form-panel">
          <span className="kicker">Create Account</span>
          <h1 className="page-title" style={{ marginBottom: '8px' }}>
            Join Konexio Africa
          </h1>
          <p className="card-copy" style={{ marginBottom: '22px' }}>
            Register as a learner, graduate alumnus, employer/training partner, or donor to access your tailored dashboard.
          </p>

          <div className="field-group" style={{ marginBottom: '22px' }}>
            <label htmlFor="signup-type">Account role</label>
            <select
              id="signup-type"
              className="select-control"
              value={registrationType}
              onChange={(event) => {
                setRegistrationType(event.target.value as RegistrationType | '');
                clearError();
              }}
              required
            >
              <option value="">Select how you are joining</option>
              <option value="learner">Prospective Learner — Explore programmes &amp; cohort status</option>
              <option value="alumni">Alumni — Manage graduate portfolio &amp; consent</option>
              <option value="employer">Employer / Client — Discover &amp; hire alumni talent</option>
              <option value="partner">Partner — Strategic, training, or client organisation</option>
              <option value="donor">Donor — Institutional or philanthropic supporter</option>
            </select>
          </div>

          {registrationType ? (
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
              <div className="form-grid-2">
                <div className="field-group">
                  <label htmlFor="signup-first-name">First name</label>
                  <input
                    id="signup-first-name"
                    type="text"
                    name="first_name"
                    className="input-control"
                    value={form.first_name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="signup-last-name">Last name</label>
                  <input
                    id="signup-last-name"
                    type="text"
                    name="second_name"
                    className="input-control"
                    value={form.second_name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="field-group">
                  <label htmlFor="signup-email">Email address</label>
                  <input
                    id="signup-email"
                    type="email"
                    name="email"
                    className="input-control"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="you@example.org"
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="signup-password">Password (min 8 characters)</label>
                  <input
                    id="signup-password"
                    type="password"
                    name="password"
                    className="input-control"
                    value={form.password}
                    onChange={handleChange}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                  />
                </div>
              </div>

              {(registrationType === 'learner' || registrationType === 'alumni') && (
                <>
                  <div className="form-grid-2">
                    <div className="field-group">
                      <label htmlFor="signup-country">Country</label>
                      <input
                        id="signup-country"
                        name="country"
                        className="input-control"
                        value={form.country}
                        onChange={handleChange}
                        required
                        placeholder="e.g. Kenya, Uganda, Nigeria"
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor="signup-city">City</label>
                      <input
                        id="signup-city"
                        name="city"
                        className="input-control"
                        value={form.city}
                        onChange={handleChange}
                        placeholder="e.g. Nairobi"
                      />
                    </div>
                  </div>

                  <div className="field-group">
                    <label htmlFor="signup-pathway">Programme pathway</label>
                    <select
                      id="signup-pathway"
                      name="pathway_code"
                      className="select-control"
                      value={form.pathway_code}
                      onChange={handleChange}
                      required
                    >
                      {pathways.length > 0
                        ? pathways.map((pw) => (
                            <option key={pw.code} value={pw.code}>
                              {pw.code} · {pw.name}
                            </option>
                          ))
                        : Array.from({ length: 11 }, (_, idx) => `P${idx + 1}`).map((code) => (
                            <option key={code} value={code}>
                              {code}
                            </option>
                          ))}
                    </select>
                  </div>
                </>
              )}

              {registrationType === 'learner' && (
                <div className="field-group">
                  <label htmlFor="signup-goal">What do you hope to learn or achieve?</label>
                  <textarea
                    id="signup-goal"
                    name="learning_goal"
                    className="textarea-control"
                    value={form.learning_goal}
                    onChange={handleChange}
                    required
                    maxLength={2000}
                    placeholder="Share your digital career goal and target pathway."
                  />
                </div>
              )}

              {registrationType === 'alumni' && (
                <>
                  <div className="field-group">
                    <label htmlFor="signup-bio">Short bio</label>
                    <textarea
                      id="signup-bio"
                      name="short_bio"
                      className="textarea-control"
                      value={form.short_bio}
                      onChange={handleChange}
                      maxLength={2000}
                      placeholder="Summarise your services, project background, and strengths."
                    />
                  </div>
                  <div className="form-grid-2">
                    <div className="field-group">
                      <label htmlFor="signup-skills">Skills (comma-separated)</label>
                      <input
                        id="signup-skills"
                        name="skills"
                        className="input-control"
                        value={form.skills}
                        onChange={handleChange}
                        placeholder="React, TypeScript, SQL"
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor="signup-languages">Languages (comma-separated)</label>
                      <input
                        id="signup-languages"
                        name="languages"
                        className="input-control"
                        value={form.languages}
                        onChange={handleChange}
                        placeholder="English, French, Swahili"
                      />
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div className="field-group">
                      <label htmlFor="signup-availability">Availability</label>
                      <select
                        id="signup-availability"
                        name="availability"
                        className="select-control"
                        value={form.availability}
                        onChange={handleChange}
                      >
                        <option value="Available for freelance work">Available for freelance work</option>
                        <option value="Available part-time">Available part-time</option>
                        <option value="Open to full-time roles">Open to full-time roles</option>
                        <option value="Open to work">Open to work</option>
                        <option value="Freelancing">Freelancing</option>
                        <option value="Employed">Employed</option>
                        <option value="Available for projects">Available for projects</option>
                      </select>
                    </div>
                    <div className="field-group">
                      <label htmlFor="signup-portfolio-title">Portfolio title</label>
                      <input
                        id="signup-portfolio-title"
                        name="portfolio_title"
                        className="input-control"
                        value={form.portfolio_title}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div className="field-group">
                      <label htmlFor="signup-portfolio-url">Portfolio URL (optional)</label>
                      <input
                        id="signup-portfolio-url"
                        type="url"
                        name="portfolio_url"
                        className="input-control"
                        value={form.portfolio_url}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor="signup-linkedin">LinkedIn URL (optional)</label>
                      <input
                        id="signup-linkedin"
                        type="url"
                        name="linkedin_url"
                        className="input-control"
                        value={form.linkedin_url}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      name="consent_to_publish"
                      checked={form.consent_to_publish}
                      onChange={handleChange}
                    />
                    <span>
                      I consent for Konexio Africa to publish my public alumni profile (you can withdraw consent anytime from your dashboard).
                    </span>
                  </label>
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      name="consent_to_show_photo"
                      checked={form.consent_to_show_photo}
                      onChange={handleChange}
                    />
                    <span>I consent to display an approved portrait photo or video introduction.</span>
                  </label>
                </>
              )}

              {(registrationType === 'employer' ||
                registrationType === 'partner' ||
                registrationType === 'donor') && (
                <>
                  <div className="form-grid-2">
                    <div className="field-group">
                      <label htmlFor="signup-org">Organisation name</label>
                      <input
                        id="signup-org"
                        name="organisation"
                        className="input-control"
                        value={form.organisation}
                        onChange={handleChange}
                        required
                        maxLength={160}
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor="signup-org-country">Country</label>
                      <input
                        id="signup-org-country"
                        name="country"
                        className="input-control"
                        value={form.country}
                        onChange={handleChange}
                        required
                        maxLength={120}
                      />
                    </div>
                  </div>

                  {registrationType === 'partner' && (
                    <div className="field-group">
                      <label htmlFor="signup-partner-type">Partner type</label>
                      <select
                        id="signup-partner-type"
                        name="partner_type"
                        className="select-control"
                        value={form.partner_type}
                        onChange={handleChange}
                      >
                        <option value="Employer">Employer</option>
                        <option value="Client">Client</option>
                        <option value="Training partner">Training partner</option>
                      </select>
                    </div>
                  )}

                  <div className="field-group">
                    <label htmlFor="signup-org-desc">Organisation description</label>
                    <textarea
                      id="signup-org-desc"
                      name="description"
                      className="textarea-control"
                      value={form.description}
                      onChange={handleChange}
                      required
                      maxLength={2000}
                    />
                  </div>

                  <div className="form-grid-2">
                    <div className="field-group">
                      <label htmlFor="signup-website">Website (optional)</label>
                      <input
                        id="signup-website"
                        type="url"
                        name="website"
                        className="input-control"
                        value={form.website}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="field-group">
                      <label htmlFor="signup-phone">Phone (optional)</label>
                      <input
                        id="signup-phone"
                        type="tel"
                        name="phone"
                        className="input-control"
                        value={form.phone}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </>
              )}

              {error ? <div className="alert-box alert-error">{error}</div> : null}

              <button type="submit" className="btn btn-amber" disabled={loading}>
                <UserPlus size={16} aria-hidden="true" />
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          ) : null}

          <div
            style={{
              marginTop: '24px',
              paddingTop: '18px',
              borderTop: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <span className="card-copy">Already registered?</span>
            <button
              type="button"
              className="inline-link-btn"
              onClick={() => onNavigate('/login')}
            >
              Sign in instead
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SignUpPage;