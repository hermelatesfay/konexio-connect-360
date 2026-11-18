import { useMemo, useState } from 'react';
import { ArrowUpDown, MapPin } from 'lucide-react';
import type { LocationImpact } from '../types';

type ImpactMapProps = {
  locations: LocationImpact[];
  compact?: boolean;
};

type SortKey = 'city' | 'learners_trained' | 'graduates' | 'employment_rate_pct' | 'women_pct';

// Map bounds for Africa SVG viewport (520 x 460)
const LON_MIN = -22;
const LON_MAX = 54;
const LAT_MIN = -36;
const LAT_MAX = 38;
const SVG_W = 520;
const SVG_H = 460;

function projectPoint(lat: number, lon: number): { x: number; y: number } {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * (SVG_W - 60) + 30;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (SVG_H - 50) + 25;
  return { x, y };
}

// Clean simplified continental Africa polygon projected in the same coordinate space
const AFRICA_CONTINENT_COORDS: Array<[number, number]> = [
  [35.8, -5.9],
  [37.1, 10.2],
  [32.9, 13.2],
  [31.2, 29.9],
  [29.9, 32.6],
  [22.0, 36.8],
  [15.6, 39.5],
  [11.8, 43.3],
  [11.9, 51.3],
  [4.5, 48.0],
  [-1.7, 41.5],
  [-6.8, 39.3],
  [-15.0, 40.7],
  [-25.9, 32.6],
  [-34.0, 25.6],
  [-34.8, 20.0],
  [-33.9, 18.4],
  [-22.9, 14.5],
  [-12.6, 13.4],
  [-5.8, 12.2],
  [3.9, 9.7],
  [4.5, 7.0],
  [6.4, 3.4],
  [5.5, -0.2],
  [4.8, -4.0],
  [6.3, -10.8],
  [12.3, -16.7],
  [14.7, -17.5],
  [20.9, -17.0],
  [27.9, -13.1],
  [33.6, -7.6],
];

const MADAGASCAR_COORDS: Array<[number, number]> = [
  [-12.0, 49.3],
  [-15.5, 50.4],
  [-25.0, 47.0],
  [-25.2, 44.1],
  [-18.0, 44.0],
  [-13.5, 47.8],
];

function coordsToSvgPath(coords: Array<[number, number]>): string {
  return (
    coords
      .map(([lat, lon], i) => {
        const { x, y } = projectPoint(lat, lon);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ') + ' Z'
  );
}

const ImpactMap = ({ locations, compact = false }: ImpactMapProps) => {
  const [selectedCity, setSelectedCity] = useState<string>(locations[0]?.city ?? 'Nairobi');
  const [sortKey, setSortKey] = useState<SortKey>('learners_trained');
  const [sortAsc, setSortAsc] = useState(false);

  const sortedLocations = useMemo(() => {
    return [...locations].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    });
  }, [locations, sortKey, sortAsc]);

  const activeLocation =
    locations.find((l) => l.city === selectedCity) ?? locations[0] ?? null;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const continentPath = useMemo(() => coordsToSvgPath(AFRICA_CONTINENT_COORDS), []);
  const madagascarPath = useMemo(() => coordsToSvgPath(MADAGASCAR_COORDS), []);

  return (
    <div className={`impact-map-layout${compact ? ' is-compact' : ''}`}>
      <div className="map-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontSize: '1.08rem' }}>Seven Active Training &amp; Placement Hubs</h3>
            <p className="card-copy" style={{ fontSize: '0.84rem' }}>
              {compact
                ? 'Select a hub marker below to inspect regional hub outcomes.'
                : 'Select a hub marker or table row to inspect regional coordinates and outcomes.'}
            </p>
          </div>
          <span className="mono" style={{ fontSize: '0.76rem', color: 'var(--slate)' }}>
            7 Countries · 18 Cohorts
          </span>
        </div>

        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="africa-map-svg"
          role="img"
          aria-label="Interactive map of Konexio Africa's seven training hubs across Africa"
        >
          {/* Subtle latitude / longitude graticule */}
          {[-20, 0, 20].map((lat) => {
            const { y } = projectPoint(lat, 0);
            return (
              <line
                key={`lat-${lat}`}
                x1={0}
                y1={y}
                x2={SVG_W}
                y2={y}
                stroke="rgba(20, 45, 66, 0.08)"
                strokeDasharray="3 4"
              />
            );
          })}
          {[-10, 10, 30].map((lon) => {
            const { x } = projectPoint(0, lon);
            return (
              <line
                key={`lon-${lon}`}
                x1={x}
                y1={0}
                x2={x}
                y2={SVG_H}
                stroke="rgba(20, 45, 66, 0.08)"
                strokeDasharray="3 4"
              />
            );
          })}

          <path d={continentPath} fill="#FFFFFF" stroke="rgba(20, 45, 66, 0.22)" strokeWidth="1.5" />
          <path d={madagascarPath} fill="#FFFFFF" stroke="rgba(20, 45, 66, 0.22)" strokeWidth="1.5" />

          {locations.map((loc) => {
            const { x, y } = projectPoint(loc.latitude, loc.longitude);
            const isSelected = loc.city === activeLocation?.city;
            const radius = Math.max(9, Math.min(22, Math.sqrt(loc.learners_trained) * 1.1));
            const labelOffsetX = loc.city === 'Dakar' || loc.city === 'Accra' ? 14 : 12;
            const labelOffsetY = loc.city === 'Kigali' ? 14 : -4;

            return (
              <g
                key={loc.business_id}
                className="map-marker-btn"
                tabIndex={0}
                role="button"
                aria-label={`${loc.city}, ${loc.country}: ${loc.learners_trained} learners`}
                onClick={() => setSelectedCity(loc.city)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedCity(loc.city);
                  }
                }}
              >
                {isSelected ? (
                  <circle
                    cx={x}
                    cy={y}
                    r={radius + 6}
                    fill="rgba(240, 163, 74, 0.28)"
                    stroke="#F0A34A"
                    strokeWidth="1.5"
                  />
                ) : null}
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={isSelected ? '#F0A34A' : '#347A68'}
                  fillOpacity={0.88}
                  stroke="#142D42"
                  strokeWidth="1.5"
                />
                <text
                  x={x + labelOffsetX}
                  y={y + labelOffsetY}
                  fontSize="11"
                  fontWeight={isSelected ? '700' : '600'}
                  fill="#142D42"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  {loc.city}
                </text>
              </g>
            );
          })}
        </svg>

        {activeLocation ? (
          <div className="map-tooltip-card" aria-live="polite">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--navy)' }}>
                <MapPin size={15} aria-hidden="true" />
                {activeLocation.city}, {activeLocation.country}
              </div>
              <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--slate)', marginTop: '2px' }}>
                {activeLocation.latitude.toFixed(4)}°, {activeLocation.longitude.toFixed(4)}° ·{' '}
                {activeLocation.cohorts_completed} cohorts · {activeLocation.women_pct}% women
              </div>
            </div>
            <div className="meta-inline tabular-nums">
              <span>
                <strong>{activeLocation.learners_trained}</strong> learners
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong>{activeLocation.graduates}</strong> graduates
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong>{activeLocation.employed_or_freelancing}</strong> employed (
                {activeLocation.employment_rate_pct}%)
              </span>
            </div>
          </div>
        ) : null}

        {compact ? (
          <div className="segmented-control" aria-label="Quick hub selector">
            {locations.map((loc) => (
              <button
                key={loc.business_id}
                type="button"
                className={`segmented-btn${loc.city === activeLocation?.city ? ' is-active' : ''}`}
                onClick={() => setSelectedCity(loc.city)}
              >
                {loc.city}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {!compact ? (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <button type="button" className="table-sort-btn" onClick={() => toggleSort('city')}>
                    Hub <ArrowUpDown size={13} aria-hidden="true" />
                  </button>
                </th>
                <th className="num">
                  <button
                    type="button"
                    className="table-sort-btn"
                    onClick={() => toggleSort('learners_trained')}
                  >
                    Learners <ArrowUpDown size={13} aria-hidden="true" />
                  </button>
                </th>
                <th className="num">
                  <button
                    type="button"
                    className="table-sort-btn"
                    onClick={() => toggleSort('graduates')}
                  >
                    Graduates <ArrowUpDown size={13} aria-hidden="true" />
                  </button>
                </th>
                <th className="num">
                  <button
                    type="button"
                    className="table-sort-btn"
                    onClick={() => toggleSort('employment_rate_pct')}
                  >
                    Employed <ArrowUpDown size={13} aria-hidden="true" />
                  </button>
                </th>
                <th className="num">
                  <button
                    type="button"
                    className="table-sort-btn"
                    onClick={() => toggleSort('women_pct')}
                  >
                    Women <ArrowUpDown size={13} aria-hidden="true" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedLocations.map((loc) => {
                const isSelected = loc.city === activeLocation?.city;
                return (
                  <tr
                    key={loc.business_id}
                    className={isSelected ? 'is-selected' : undefined}
                    onClick={() => setSelectedCity(loc.city)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <strong style={{ color: 'var(--navy)' }}>{loc.city}</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--slate)' }}>{loc.country}</div>
                    </td>
                    <td className="num">{loc.learners_trained.toLocaleString()}</td>
                    <td className="num">{loc.graduates.toLocaleString()}</td>
                    <td className="num">
                      {loc.employed_or_freelancing} ({loc.employment_rate_pct}%)
                    </td>
                    <td className="num">{loc.women_pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
};

export default ImpactMap;
