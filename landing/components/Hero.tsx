
import React from 'react';
import { Zap } from 'lucide-react';

const Hero: React.FC = () => {
  return (
    <section className="relative hero-gradient pt-8 md:pt-16 pb-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col gap-12 lg:flex-row items-center">
          <div className="flex flex-col gap-8 lg:w-1/2 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit">
              <Zap className="w-3 h-3 text-primary fill-primary" />
              <span className="text-primary text-[10px] font-black uppercase tracking-widest">New: Android V2.0</span>
            </div>
            
            <div className="flex flex-col gap-6">
              <h1 className="text-white text-4xl md:text-6xl font-heading font-black leading-[1.1] tracking-tighter">
                Accuracy that goes the distance, <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">even offline.</span>
              </h1>
              <p className="text-[#9db9a8] text-lg md:text-xl font-normal leading-relaxed max-w-[580px]">
                The performance tracker that prioritizes your data reliability and battery life. Precision engineering, built exclusively for Android.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 mt-2">
              <button className="flex min-w-[240px] cursor-pointer items-center justify-center rounded-2xl h-14 px-8 bg-primary text-background-dark text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                Download for Android
              </button>
            </div>

            <div className="flex items-center gap-4 mt-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <img 
                    key={i}
                    src={`https://picsum.photos/seed/${i + 10}/40/40`} 
                    alt="User" 
                    className="w-10 h-10 rounded-full border-2 border-background-dark" 
                  />
                ))}
              </div>
              <p className="text-sm text-[#9db9a8]">
                <span className="text-white font-bold">500k+</span> athletes trust Stryde
              </p>
            </div>
          </div>

          <div className="w-full lg:w-1/2 relative">
            <div className="relative mx-auto w-full max-w-[420px] aspect-[4/5] bg-center bg-no-repeat bg-cover rounded-[2.5rem] shadow-2xl border border-white/5 overflow-hidden group"
                 style={{ backgroundImage: `url('https://picsum.photos/seed/stryde-app/1000/1250?blur=1')` }}>
              <div className="absolute inset-0 bg-gradient-to-t from-background-dark/90 via-transparent to-transparent"></div>
              
              {/* Mock App UI Overlay */}
              <div className="absolute inset-0 p-8 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                   <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                      <Zap className="w-6 h-6 text-primary fill-primary" />
                   </div>
                   <div className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-md">
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">Active</span>
                   </div>
                </div>

                <div className="space-y-4">
                  <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10">
                    <p className="text-[10px] text-[#9db9a8] font-bold uppercase tracking-widest mb-2">Distance</p>
                    <p className="text-4xl font-black text-white">12.42 <span className="text-lg font-medium text-[#9db9a8]">km</span></p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10">
                      <p className="text-[10px] text-[#9db9a8] font-bold uppercase tracking-widest mb-1">Pace</p>
                      <p className="text-xl font-black text-white">4'12"</p>
                    </div>
                    <div className="p-4 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10">
                      <p className="text-[10px] text-[#9db9a8] font-bold uppercase tracking-widest mb-1">Battery</p>
                      <p className="text-xl font-black text-white">98%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px] -z-10"></div>
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] -z-10"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
