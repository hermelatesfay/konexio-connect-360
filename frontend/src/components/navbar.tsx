import { useEffect, useState } from 'react';
import { LogOut, Menu, Search, Shield, User, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const KONEXIO_LOGO_SRC = '/assets/aistudio/konexio_africa_placeholder_logo_9c0e099e.png';

export type NavItem = {
  label: string;
  path: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  { label: 'Programmes', path: '/programmes' },
  { label: 'Impact', path: '/impact' },
  { label: 'Alumni', path: '/alumni' },
  { label: 'Team', path: '/team' },
  { label: 'Get Involved', path: '/get-involved' },
  { label: 'Contact', path: '/contact' },
];

type NavbarProps = {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenSearch?: () => void;
};

const Navbar = ({ currentPath, onNavigate, onOpenSearch }: NavbarProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (!drawerOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen]);

  const handleGo = (path: string) => {
    setDrawerOpen(false);
    onNavigate(path);
  };

  const isRouteActive = (itemPath: string) => {
    if (itemPath === '/') return currentPath === '/';
    return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
  };

  return (
      <header className="site-header">
        <div className="container header-inner">
          <button
            type="button"
            className="brand-button"
            aria-label="Konexio Africa home"
            onClick={() => handleGo('/')}
          >
            <img src={KONEXIO_LOGO_SRC} alt="Konexio Africa" className="brand-logo" />
          </button>

          <nav className="desktop-nav" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.path}
                type="button"
                className={`nav-link${isRouteActive(item.path) ? ' is-active' : ''}`}
                aria-current={isRouteActive(item.path) ? 'page' : undefined}
                onClick={() => handleGo(item.path)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="header-actions">
            {onOpenSearch ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                aria-label="Search Konexio Africa (Ctrl+K)"
                title="Search site & talent (Ctrl+K)"
                onClick={onOpenSearch}
              >
                <Search size={15} aria-hidden="true" />
                <span>Search</span>
              </button>
            ) : null}
            {isAuthenticated && user ? (
              <>
                {user.role === 'admin' ? (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleGo('/admin')}
                  >
                    <Shield size={15} aria-hidden="true" />
                    Admin
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleGo('/dashboard')}
                  >
                    <User size={15} aria-hidden="true" />
                    Dashboard
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  aria-label="Sign out"
                  onClick={() => {
                    logout();
                    handleGo('/');
                  }}
                >
                  <LogOut size={15} aria-hidden="true" />
                  Sign Out
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => handleGo('/login')}
              >
                Sign In
              </button>
            )}

            <button
              type="button"
              className="btn btn-amber btn-sm"
              onClick={() => handleGo('/get-involved')}
            >
              Apply Now
            </button>
          </div>

          <button
            type="button"
            className="mobile-toggle"
            aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={drawerOpen}
            aria-controls="mobile-navigation-drawer"
            onClick={() => setDrawerOpen((prev) => !prev)}
          >
            {drawerOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>

        {drawerOpen ? (
          <nav
            id="mobile-navigation-drawer"
            className="mobile-drawer"
            aria-label="Mobile navigation"
          >
            {NAV_ITEMS.map((item) => (
              <button
                key={item.path}
                type="button"
                className={`nav-link${isRouteActive(item.path) ? ' is-active' : ''}`}
                aria-current={isRouteActive(item.path) ? 'page' : undefined}
                onClick={() => handleGo(item.path)}
              >
                {item.label}
              </button>
            ))}

            <div className="mobile-drawer-actions">
              {onOpenSearch ? (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setDrawerOpen(false);
                    onOpenSearch();
                  }}
                >
                  <Search size={15} aria-hidden="true" />
                  Search
                </button>
              ) : null}
              {isAuthenticated && user ? (
                <>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleGo(user.role === 'admin' ? '/admin' : '/dashboard')}
                  >
                    {user.role === 'admin' ? 'Admin' : 'Dashboard'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      logout();
                      handleGo('/');
                    }}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => handleGo('/login')}
                >
                  Sign In
                </button>
              )}

              <button
                type="button"
                className="btn btn-amber btn-sm"
                onClick={() => handleGo('/get-involved')}
              >
                Apply Now
              </button>
            </div>
          </nav>
        ) : null}
      </header>
  );
};

export default Navbar;