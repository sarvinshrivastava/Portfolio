import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Home } from './pages/Home';
import { Projects } from './pages/Projects';
import { MyJourney } from './pages/MyJourney';
import { Experience } from './pages/Experience';
import { HelpOverlay } from './components/ui/HelpOverlay';
import { useTheme } from './hooks/useTheme';
import { useKeyboardNav } from './hooks/useKeyboardNav';
import { fetchAbout } from './services/notion';
import { AboutContext } from './context/AboutContext';
import type { About } from './types';

function AppInner() {
  const { theme, toggle } = useTheme();
  const [about, setAbout] = useState<About | null>(null);
  const { showHelp, setShowHelp } = useKeyboardNav({ onThemeToggle: toggle, resumeUrl: about?.resumeUrl });

  useEffect(() => {
    fetchAbout().then(setAbout).catch(console.warn);
  }, []);

  return (
    <AboutContext.Provider value={about}>
      <a href="#main" className="skip-to-content">Skip to content</a>
      <Navbar theme={theme} onThemeToggle={toggle} resumeUrl={about?.resumeUrl} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/my-journey" element={<MyJourney />} />
        <Route path="/experience" element={<Experience />} />
      </Routes>
      <Footer />
      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}
    </AboutContext.Provider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
