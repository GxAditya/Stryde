
import React from 'react';
import { Link } from 'react-router-dom';
import { useDownload } from '../hooks/useDownload';

const Footer: React.FC = () => {
  const { download, isLoading } = useDownload();
  return (
    <footer className="bg-background-dark pt-32 pb-16 border-t border-primary/10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col items-center text-center gap-12 mb-24">
          <div className="flex flex-col gap-6 max-w-3xl">
            <h2 className="text-4xl md:text-7xl font-heading font-black text-white tracking-tighter">Ready to move?</h2>
            <p className="text-[#9db9a8] text-xl">Join 500,000+ athletes tracking with precision and privacy.</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6">
            <button 
              onClick={download}
              disabled={isLoading}
              className="bg-white text-background-dark px-12 py-6 rounded-2xl flex items-center gap-5 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5 group border border-transparent hover:border-primary/20 disabled:opacity-70"
            >
              <span className="material-symbols-outlined text-5xl group-hover:rotate-12 transition-transform">android</span>
              <div className="text-left">
                <p className="text-[10px] uppercase font-black leading-none tracking-widest opacity-60">Available for Download</p>
                <p className="text-2xl font-heading font-black leading-none mt-2 tracking-tighter">Android APK</p>
              </div>
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-10 pt-12 border-t border-white/5">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl overflow-hidden">
              <img src="/icon.png" alt="Stryde Icon" className="w-8 h-8 object-contain" />
            </div>
            <span className="text-white font-heading font-black text-2xl tracking-tighter">Stryde</span>
          </Link>

          <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 text-[10px] font-bold uppercase tracking-widest text-[#9db9a8]">
            <Link className="hover:text-primary transition-colors" to="/support">Support</Link>
            <Link className="hover:text-primary transition-colors" to="/privacy">Privacy</Link>
            <Link className="hover:text-primary transition-colors" to="/terms">Terms</Link>
            <Link className="hover:text-primary transition-colors" to="/changelog">Changelog</Link>
          </div>

          <div className="flex flex-col items-center md:items-end gap-1">
            <p className="text-[#9db9a8] text-[10px] font-bold uppercase tracking-widest">© 2026 Stryde Inc.</p>
            <p className="text-primary text-[10px] font-black uppercase tracking-widest">Precision Performance</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
