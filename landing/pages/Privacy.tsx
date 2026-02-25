
import React from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, EyeOff } from 'lucide-react';

const Privacy: React.FC = () => {
  return (
    <div className="pt-32 pb-24 px-4 max-w-4xl mx-auto">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col gap-12"
      >
        <div className="flex flex-col gap-4">
          <h1 className="text-white text-5xl md:text-7xl font-heading font-black tracking-tighter">
            Privacy First.
          </h1>
          <p className="text-primary font-mono text-sm tracking-widest uppercase">Last Updated: February 25, 2026</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
            <Shield className="text-primary mb-4" />
            <h3 className="text-white font-bold mb-2">Zero Tracking</h3>
            <p className="text-[#9db9a8] text-xs">No third-party trackers or analytics scripts.</p>
          </div>
          <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
            <Lock className="text-primary mb-4" />
            <h3 className="text-white font-bold mb-2">Local Encryption</h3>
            <p className="text-[#9db9a8] text-xs">Data is encrypted on-device before any sync.</p>
          </div>
          <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
            <EyeOff className="text-primary mb-4" />
            <h3 className="text-white font-bold mb-2">Anonymized</h3>
            <p className="text-[#9db9a8] text-xs">Syncing uses rotating identifiers to prevent profiling.</p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none text-[#9db9a8] leading-relaxed flex flex-col gap-8">
          <section>
            <h2 className="text-white text-2xl font-bold mb-4">1. Data Collection</h2>
            <p>
              Stryde collects activity data (steps, gait, location) primarily for the purpose of providing you with performance insights. This data is stored locally on your device by default.
            </p>
          </section>

          <section>
            <h2 className="text-white text-2xl font-bold mb-4">2. AI Analysis</h2>
            <p>
              Our gait analysis AI runs locally on your device's NPU (Neural Processing Unit) whenever possible. If cloud processing is required for complex models, data is anonymized and stripped of all personal identifiers before transmission.
            </p>
          </section>

          <section>
            <h2 className="text-white text-2xl font-bold mb-4">3. Your Rights</h2>
            <p>
              You have the right to export, delete, or modify your data at any time. We provide a "Nuclear Option" in settings that instantly wipes all local and cloud data associated with your account.
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  );
};

export default Privacy;
