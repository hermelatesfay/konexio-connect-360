import { useCallback, useEffect, useState } from 'react';
import Navbar from './components/navbar';
import Footer from './components/footer';
import ContactSection from './components/contact';
import LoginPage from './auth/login';
import SignUpPage from './auth/signUp';
import HomePage from './pages/homePage';
import AboutPage from './pages/about';
import ProgrammesPage from './pages/programmes';
import ImpactsPage from './pages/impacts';
import AlumniPage from './pages/alumni';
import TeamsPage from './pages/teams';
import GetInvolvedPage from './pages/getInvolved';
import DashboardPage from './pages/dashboard';
import AdminPage from './pages/admin';
import LegalPage from './pages/legal';

type LocationState = {
  pathname: string;
  search: string;
};

function readLocation(): LocationState {
  return {
    pathname: window.location.pathname || '/',
    search: window.location.search || '',
  };
}

function App() {
  const [location, setLocation] = useState<LocationState>(readLocation);

  // Preserved visitor webhook from initial repository
  useEffect(() => {
    const sendVisitorWebhook = async () => {
      try {
        const response = await fetch(
          'https://hook.us2.make.com/5yg1flixiqx6xxbip21v5btnbsqifchj',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              timestamp: new Date().toISOString(),
              new_visitor: true,
            }),
          },
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (error) {
        console.error('Webhook failed:', error);
      }
    };
    sendVisitorWebhook();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setLocation(readLocation());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((rawTarget: string) => {
    const [pathWithSearch, hash] = rawTarget.split('#');
    const url = new URL(pathWithSearch || '/', window.location.origin);
    const nextUrl = `${url.pathname}${url.search}${hash ? `#${hash}` : ''}`;

    window.history.pushState({}, '', nextUrl);
    setLocation({ pathname: url.pathname, search: url.search });

    if (hash) {
      window.setTimeout(() => {
        const targetEl = document.getElementById(hash);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const renderPage = () => {
    const { pathname, search } = location;

    if (pathname === '/' || pathname === '') {
      return <HomePage onNavigate={navigate} />;
    }
    if (pathname === '/about') {
      return <AboutPage onNavigate={navigate} />;
    }
    if (pathname === '/programmes') {
      return <ProgrammesPage onNavigate={navigate} />;
    }
    if (pathname === '/impact') {
      return <ImpactsPage onNavigate={navigate} />;
    }
    if (pathname === '/alumni') {
      return <AlumniPage key={`dir-${search}`} onNavigate={navigate} initialSearch={search} />;
    }
    if (pathname.startsWith('/alumni/')) {
      const businessId = decodeURIComponent(pathname.slice('/alumni/'.length).replace(/\/+$/, ''));
      return <AlumniPage key={businessId} onNavigate={navigate} businessId={businessId} />;
    }
    if (pathname === '/team') {
      return <TeamsPage onNavigate={navigate} />;
    }
    if (pathname === '/get-involved') {
      return <GetInvolvedPage key={search} onNavigate={navigate} initialSearch={search} />;
    }
    if (pathname === '/contact') {
      const topic = new URLSearchParams(search).get('topic') ?? '';
      return <ContactSection key={search} initialTopic={topic} onNavigate={navigate} />;
    }
    if (pathname === '/login') {
      return <LoginPage onNavigate={navigate} />;
    }
    if (pathname === '/signup') {
      return <SignUpPage key={search} onNavigate={navigate} initialSearch={search} />;
    }
    if (pathname === '/dashboard') {
      return <DashboardPage onNavigate={navigate} />;
    }
    if (pathname === '/admin') {
      return <AdminPage onNavigate={navigate} />;
    }
    if (pathname === '/privacy') {
      return <LegalPage mode="privacy" onNavigate={navigate} />;
    }
    if (pathname === '/terms') {
      return <LegalPage mode="terms" onNavigate={navigate} />;
    }

    return <HomePage onNavigate={navigate} />;
  };

  return (
    <div className="site-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Navbar currentPath={location.pathname} onNavigate={navigate} />
      <main id="main-content" className="main-content">
        {renderPage()}
      </main>
      <Footer onNavigate={navigate} />
    </div>
  );
}

export default App;
