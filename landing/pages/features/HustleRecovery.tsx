
import React from 'react';
import { motion } from 'motion/react';
import { Sun, Battery, Heart, Wind } from 'lucide-react';

const HustleRecovery: React.FC = () => {
  return (
    <div className="pt-32 pb-24 px-4 max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-16"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-3 text-primary font-mono text-xs tracking-widest uppercase">
              <Sun className="w-4 h-4" />
              High-Performance Recovery
            </div>
            <h1 className="text-white text-5xl md:text-7xl font-heading font-black tracking-tighter leading-[0.9]">
              Hustle <br />
              <span className="text-primary italic">Recovery</span>
            </h1>
            <p className="text-[#9db9a8] text-xl leading-relaxed">
              You work hard, but you can't perform without recovery. Stryde builds smart wind-down routines that respect your ambition and your schedule.
            </p>
            <div className="flex gap-4">
              <button className="bg-primary text-background-dark px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform">
                Start Recovery
              </button>
            </div>
          </div>
          <div className="relative aspect-square rounded-[40px] overflow-hidden bg-primary/5 border border-primary/10 p-8 flex items-center justify-center">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50"></div>
             <Sun className="w-48 h-48 text-primary/20 absolute" />
             <div className="relative z-10 grid grid-cols-1 gap-4 w-full max-w-xs">
                <div className="bg-background-dark/80 backdrop-blur-md p-6 rounded-3xl border border-white/5 flex justify-between items-center">
                   <div className="flex items-center gap-3">
                      <Battery className="text-primary" />
                      <span className="text-white font-bold text-sm">Readiness</span>
                   </div>
                   <span className="text-primary font-mono font-bold">88%</span>
                </div>
                <div className="bg-background-dark/80 backdrop-blur-md p-6 rounded-3xl border border-white/5 flex justify-between items-center">
                   <div className="flex items-center gap-3">
                      <Heart className="text-primary" />
                      <span className="text-white font-bold text-sm">HRV Status</span>
                   </div>
                   <span className="text-primary font-mono font-bold">Optimal</span>
                </div>
                <div className="bg-background-dark/80 backdrop-blur-md p-6 rounded-3xl border border-white/5 flex justify-between items-center">
                   <div className="flex items-center gap-3">
                      <Wind className="text-primary" />
                      <span className="text-white font-bold text-sm">Breathwork</span>
                   </div>
                   <span className="text-primary font-mono font-bold">Ready</span>
                </div>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 py-16 border-y border-white/5">
          <div className="flex flex-col gap-4">
            <h3 className="text-white text-2xl font-bold">Ambition-Aware Sleep</h3>
            <p className="text-[#9db9a8] text-sm leading-relaxed">
              We know you can't always get 8 hours. Stryde optimizes for sleep quality over quantity, providing protocols to maximize REM and Deep sleep when time is short.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <h3 className="text-white text-2xl font-bold">Stress Management</h3>
            <p className="text-[#9db9a8] text-sm leading-relaxed">
              Real-time HRV (Heart Rate Variability) monitoring alerts you when your physiological stress levels are too high for effective cognitive work, suggesting 2-minute "reset" protocols.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <h3 className="text-white text-2xl font-bold">Smart Wind-Down</h3>
            <p className="text-[#9db9a8] text-sm leading-relaxed">
              Custom routines that help you transition from high-intensity work to restorative rest without the typical "mind-racing" that plagues high achievers.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default HustleRecovery;
