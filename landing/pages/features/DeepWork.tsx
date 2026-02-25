
import React from 'react';
import { motion } from 'motion/react';
import { Zap, Droplets, Timer, Brain } from 'lucide-react';

const DeepWork: React.FC = () => {
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
              <Zap className="w-4 h-4" />
              Focus Optimization
            </div>
            <h1 className="text-white text-5xl md:text-7xl font-heading font-black tracking-tighter leading-[0.9]">
              Deep Work <br />
              <span className="text-primary italic">Mode</span>
            </h1>
            <p className="text-[#9db9a8] text-xl leading-relaxed">
              Engineered for developers, writers, and creators. Stryde detects when you've entered a state of flow and manages your physical health so you don't have to.
            </p>
            <div className="flex gap-4">
              <button className="bg-primary text-background-dark px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform">
                Enable in App
              </button>
            </div>
          </div>
          <div className="relative aspect-square rounded-[40px] overflow-hidden bg-primary/5 border border-primary/10 p-8 flex items-center justify-center">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50"></div>
             <Zap className="w-48 h-48 text-primary/20 absolute" />
             <div className="relative z-10 grid grid-cols-2 gap-4 w-full">
                <div className="bg-background-dark/80 backdrop-blur-md p-6 rounded-3xl border border-white/5">
                   <Droplets className="text-primary mb-4" />
                   <h4 className="text-white font-bold text-sm">Hydration</h4>
                   <p className="text-[#9db9a8] text-[10px] mt-1">Smart intervals based on room temp.</p>
                </div>
                <div className="bg-background-dark/80 backdrop-blur-md p-6 rounded-3xl border border-white/5 mt-8">
                   <Timer className="text-primary mb-4" />
                   <h4 className="text-white font-bold text-sm">Micro-breaks</h4>
                   <p className="text-[#9db9a8] text-[10px] mt-1">20-second eye strain relief.</p>
                </div>
                <div className="bg-background-dark/80 backdrop-blur-md p-6 rounded-3xl border border-white/5 -mt-4">
                   <Brain className="text-primary mb-4" />
                   <h4 className="text-white font-bold text-sm">Flow State</h4>
                   <p className="text-[#9db9a8] text-[10px] mt-1">Auto-silence notifications.</p>
                </div>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 py-16 border-y border-white/5">
          <div className="flex flex-col gap-4">
            <h3 className="text-white text-2xl font-bold">Intelligent Detection</h3>
            <p className="text-[#9db9a8] text-sm leading-relaxed">
              Using accelerometer data and app usage patterns, Stryde identifies when you are stationary and focused. It suppresses non-critical alerts while ensuring you stay hydrated.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <h3 className="text-white text-2xl font-bold">Posture Correction</h3>
            <p className="text-[#9db9a8] text-sm leading-relaxed">
              Subtle haptic feedback through your smartwatch or phone when our sensors detect prolonged slouching during your deep work sessions.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <h3 className="text-white text-2xl font-bold">Focus Analytics</h3>
            <p className="text-[#9db9a8] text-sm leading-relaxed">
              Understand the correlation between your physical activity and your most productive hours. See how a 5-minute walk boosts your creative output.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DeepWork;
