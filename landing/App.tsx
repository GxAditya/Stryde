
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Support from './pages/Support';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Changelog from './pages/Changelog';
import DeepWork from './pages/features/DeepWork';
import Nightowl from './pages/features/Nightowl';
import HustleRecovery from './pages/features/HustleRecovery';

const App: React.FC = () => {
  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-screen bg-background-dark overflow-x-hidden flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/support" element={<Support />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/changelog" element={<Changelog />} />
            <Route path="/features/deep-work" element={<DeepWork />} />
            <Route path="/features/nightowl" element={<Nightowl />} />
            <Route path="/features/hustle-recovery" element={<HustleRecovery />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
