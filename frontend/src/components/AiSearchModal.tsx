import { type FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowRight, Search, Sparkles, X } from 'lucide-react';
import { searchWithAi } from '../api';
import type { AiSearchResponse } from '../types';

type AiSearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
};

const QUICK_PROMPTS = [
  'Find alumni skilled in Digital Marketing or SEO',
  'Which African hubs and cities run Digi Pass cohorts?',
  'What is covered in Part I (M0–M5)?',
  'How can an employer hire or partner with Konexio Africa?',
];

const TYPE_LABELS: Record<string, string> = {
  alumnus: 'Consented Alumnus',
  pathway: 'Pathway',
  module: 'Part I Module',
  partner: 'Partner',
  location: 'Training Hub',
  report: 'Annual Report',
  story: 'Impact Story',
  team: 'Team',
  page: 'Page',
};

const AiSearchModal = ({ isOpen, onClose, onNavigate }: AiSearchModalProps) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiSearchResponse | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const runQuery = async (searchText: string) => {
    const trimmed = searchText.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const response = await searchWithAi(trimmed);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void runQuery(query);
  };

  const handleSelectResult = (url: string) => {
    onClose();
    onNavigate(url);
  };

  return (
    <div
      className="ai-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="ai-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-search-title"
      >
        <div className="ai-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={18} color="#0B6B94" aria-hidden="true" />
            <div>
              <h2 id="ai-search-title" style={{ margin: 0, fontSize: '1.05rem' }}>
                Smart Site &amp; Talent Search
              </h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--slate)' }}>
                Searches public programmes, impact hubs, partners, and consented alumni only
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onClose}
            aria-label="Close search"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="ai-search-form">
          <div className="ai-search-input-wrap">
            <Search size={18} color="#4B5563" aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              className="ai-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question or search skills, pathways, hubs, reports..."
              maxLength={240}
              aria-label="Search Konexio Africa"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading || !query.trim()}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        <div className="ai-modal-body">
          {!result && !loading && !error ? (
            <div>
              <p className="card-copy" style={{ marginBottom: '12px', fontSize: '0.88rem' }}>
                Try a natural-language question:
              </p>
              <div className="ai-chip-list">
                {QUICK_PROMPTS.map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    className="ai-prompt-chip"
                    onClick={() => {
                      setQuery(sample);
                      void runQuery(sample);
                    }}
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {error ? <div className="alert-box alert-error">{error}</div> : null}

          {result ? (
            <div style={{ display: 'grid', gap: '16px' }}>
              {result.ai_available && result.answer ? (
                <div className="ai-answer-box">
                  <div className="ai-answer-badge">
                    <Sparkles size={13} aria-hidden="true" />
                    <span>AI Grounded Summary</span>
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: '0.94rem', lineHeight: 1.55 }}>
                    {result.answer}
                  </p>
                </div>
              ) : result.unavailable_reason ? (
                <div className="alert-box alert-info" style={{ fontSize: '0.86rem' }}>
                  {result.unavailable_reason}
                </div>
              ) : null}

              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                  }}
                >
                  <strong style={{ fontSize: '0.86rem', color: 'var(--ink)' }}>
                    Matching Public Records ({result.matches.length})
                  </strong>
                </div>

                {result.matches.length === 0 ? (
                  <p className="card-copy">
                    No matching public records found for &ldquo;{result.query}&rdquo;. Try searching by
                    pathway name (e.g., Digital Marketing, Data Annotation) or city (Nairobi, Kampala, Kigali).
                  </p>
                ) : (
                  <div className="ai-match-list">
                    {result.matches.map((match) => (
                      <button
                        key={match.id}
                        type="button"
                        className="ai-match-card"
                        onClick={() => handleSelectResult(match.url)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                          <span className="tag tag-cyan" style={{ fontSize: '0.72rem' }}>
                            {TYPE_LABELS[match.type] ?? match.type}
                          </span>
                          <ArrowRight size={15} color="#1B1D5E" aria-hidden="true" />
                        </div>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--ink)' }}>{match.title}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--cyan-ink)' }}>
                          {match.subtitle}
                        </span>
                        <span className="card-copy" style={{ fontSize: '0.82rem' }}>
                          {match.summary}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {result.suggested_follow_ups.length > 0 ? (
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--slate)', display: 'block', marginBottom: '8px' }}>
                    Suggested follow-up searches:
                  </span>
                  <div className="ai-chip-list">
                    {result.suggested_follow_ups.map((follow) => (
                      <button
                        key={follow}
                        type="button"
                        className="ai-prompt-chip"
                        onClick={() => {
                          setQuery(follow);
                          void runQuery(follow);
                        }}
                      >
                        {follow}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AiSearchModal;
