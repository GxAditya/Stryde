
import React from 'react';

const MapSection: React.FC = () => {
  return (
    <section className="max-w-7xl mx-auto py-24 px-4">
      <div className="rounded-[2.5rem] overflow-hidden bg-[#1c2720]/40 border border-primary/10 flex flex-col md:flex-row min-h-[500px] shadow-2xl">
        <div className="md:w-1/2 p-12 md:p-20 flex flex-col justify-center gap-8 z-10">
          <div className="flex flex-col gap-4">
            <h3 className="text-4xl md:text-5xl font-black text-white leading-tight">Track anywhere <br/>on Earth.</h3>
            <p className="text-[#9db9a8] text-lg leading-relaxed">
              From the streets of Tokyo to the trails of the Alps, Stryde provides pinpoint accuracy without a cellular signal.
            </p>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 group">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-background-dark transition-all">
                <span className="material-symbols-outlined text-2xl">location_on</span>
              </div>
              <span className="text-white font-bold text-lg tracking-tight">Currently active in 140+ countries</span>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-background-dark transition-all">
                <span className="material-symbols-outlined text-2xl">public</span>
              </div>
              <span className="text-white font-bold text-lg tracking-tight">Zero-connectivity map caching</span>
            </div>
          </div>
        </div>

        <div className="md:w-1/2 h-[400px] md:h-auto relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-background-dark via-transparent to-transparent z-10 hidden md:block"></div>
          <div 
            className="w-full h-full bg-cover bg-center grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-1000 scale-110 hover:scale-100" 
            style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuD0-5GVLbsqX1jciZmb0KSdc8Y-qTRRFBe4MH05uQt2OeJ-S5uAo-EhEmI6ZM_rCSxF1IwAJoilGHnJHM2MJnWnvYqhmKrGyzGsAZRDqx5qsvomsQlnDaZm4vgfCVoxJHvMKX3XO1fz3EvnJbnL6vdK0Gt5K2leasHGje4gxg5ui8MWryTs7QGsN2aXtGYhFfYABHEGdyWYPgvxvFaN5QtA2Xjz2w96vIz_PBfx-5MFlXB5tgGRWUwb6y9gAszOiyG63dnDSAFqmCfK')` }}
          ></div>
        </div>
      </div>
    </section>
  );
};

export default MapSection;
