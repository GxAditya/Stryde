
import React from 'react';
import { Link } from 'react-router-dom';
import { useDownload } from '../hooks/useDownload';

const Navbar: React.FC = () => {
  const { download, isLoading } = useDownload();
  return (
    <nav className="sticky top-0 z-50 w-full bg-background-dark/80 backdrop-blur-md border-b border-primary/10">
      <div className="max-w-7xl mx-auto flex items-center p-4 justify-between">
        <Link to="/" className="flex items-center gap-2 cursor-pointer group">
          <div className="flex size-10 items-center justify-center rounded-lg group-hover:bg-white/10 transition-all overflow-hidden">
            <img src="/icon.png" alt="Stryde Icon" className="w-8 h-8 object-contain" />
          </div>
          <h2 className="text-white text-xl font-heading font-bold leading-tight tracking-tighter">Stryde</h2>
        </Link>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-8 text-[10px] font-bold uppercase tracking-widest text-[#9db9a8]">
            <a className="hover:text-primary transition-colors" href="/#features">Features</a>
            <a className="hover:text-primary transition-colors" href="/#how-it-works">Process</a>
            <Link className="hover:text-primary transition-colors" to="/privacy">Privacy</Link>
          </div>
          <button 
            onClick={download}
            disabled={isLoading}
            className="bg-primary text-background-dark px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-70"
          >
            Get Android
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
