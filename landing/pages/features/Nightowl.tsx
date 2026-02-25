
import React from 'react';
import { motion } from 'motion/react';
import { Moon, Clock, Zap, Coffee } from 'lucide-react';

const Nightowl: React.FC = () => {
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
              <Moon className="w-4 h-4" />
              Circadian Alignment
            </div>
            <h1 className="text-white text-5xl md:text-7xl font-heading font-black tracking-tighter leading-[0.9]">
              Nightowl <br />
              <span className="text-primary italic">Sync</span>
            </h1>
            <p className="text-[#9db9a8] text-xl leading-relaxed">
              The world doesn't run on a 9-to-5 schedule, and neither should your fitness goals. Stryde adapts to your unique internal clock.
            </p>
            <div className="flex gap-4">
              <button className="bg-primary text-background-dark px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform">
                Sync My Rhythm
              </button>
            </div>
          </div>
          <div className="relative aspect-square rounded-[40px] overflow-hidden bg-primary/5 border border-primary/10 p-8 flex items-center justify-center">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50"></div>
             <Moon className="w-48 h-48 text-primary/20 absolute" />
             <div className="relative z-10 flex flex-col gap-4 w-full max-w-sm">
                <div className="bg-background-dark/80 backdrop-blur-md p-6 rounded-3xl border border-white/5 flex items-center gap-4">
                   <Clock className="text-primary" />
                   <div>
                      <h4 className="text-white font-bold text-sm">Goal Shifting</h4>
                      <p className="text-[#9db9a8] text-[10px]">Daily reset at 4:00 AM, not midnight.</p>
                   </div>
                </div>
                <div className="bg-background-dark/80 backdrop-blur-md p-6 rounded-3xl border border-white/5 flex items-center gap-4 ml-8">
                   <Coffee className="text-primary" />
                   <div>
                      <h4 className="text-white font-bold text-sm">Caffeine Window</h4>
                      <p className="text-[#9db9a8] text-[10px]">Optimized for late-night productivity.</p>
                   </div>
                </div>
                <div className="bg-background-dark/80 backdrop-blur-md p-6 rounded-3xl border border-white/5 flex items-center gap-4">
                   <Zap className="text-primary" />
                   <div>
                      <h4 className="text-white font-bold text-sm">Peak Energy</h4>
                      <p className="text-[#9db9a8] text-[10px]">Workouts scheduled for your prime.</p>
                   </div>
                </div>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 py-16 border-y border-white/5">
          <div className="flex flex-col gap-4">
            <h3 className="text-white text-2xl font-bold">Dynamic Resets</h3>
            <p className="text-[#9db9a8] text-sm leading-relaxed">
              Standard apps reset your progress at midnight, killing the motivation of late-night athletes. Stryde lets you define your "Day End" based on your actual sleep patterns.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <h3 className="text-white text-2xl font-bold">Blue Light Coaching</h3>
            <p className="text-[#9db9a8] text-sm leading-relaxed">
              Get reminders to manage light exposure based on your intended sleep time, helping you maintain a consistent circadian rhythm even if it's non-traditional.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <h3 className="text-white text-2xl font-bold">Shift-Worker Friendly</h3>
            <p className="text-[#9db9a8] text-sm leading-relaxed">
              Whether you're a night nurse or a global trader, Stryde's algorithms adjust to ensure your activity tracking remains accurate and meaningful.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Nightowl;
