
import React from 'react';
import { motion } from 'motion/react';
import { Rocket, Zap, Bug } from 'lucide-react';

const Changelog: React.FC = () => {
  const updates = [
    {
      version: "v2.4.0",
      date: "Feb 20, 2026",
      type: "Major",
      changes: [
        { icon: <Rocket className="w-4 h-4" />, text: "Introduced AI Gait Analysis v2 with 40% higher precision." },
        { icon: <Zap className="w-4 h-4" />, text: "Deep Work mode now integrates with system focus settings." },
        { icon: <Bug className="w-4 h-4" />, text: "Fixed a bug where ultra-marathon sessions would occasionally clip data." }
      ]
    },
    {
      version: "v2.3.5",
      date: "Jan 15, 2026",
      type: "Patch",
      changes: [
        { icon: <Zap className="w-4 h-4" />, text: "Optimized battery drain for background sensor polling." },
        { icon: <Bug className="w-4 h-4" />, text: "Resolved UI flickering on high-refresh rate displays." }
      ]
    }
  ];

  return (
    <div className="pt-32 pb-24 px-4 max-w-4xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col gap-16"
      >
        <div className="flex flex-col gap-4">
          <h1 className="text-white text-5xl md:text-7xl font-heading font-black tracking-tighter">
            Changelog
          </h1>
          <p className="text-[#9db9a8] text-xl">The evolution of precision tracking.</p>
        </div>

        <div className="flex flex-col gap-12">
          {updates.map((update, idx) => (
            <div key={idx} className="relative pl-8 border-l border-primary/20">
              <div className="absolute left-[-5px] top-0 w-[9px] h-[9px] rounded-full bg-primary shadow-[0_0_10px_rgba(0,255,157,0.5)]" />
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-white text-2xl font-bold">{update.version}</h2>
                  <span className="text-primary font-mono text-xs px-2 py-1 bg-primary/10 rounded border border-primary/20">{update.type}</span>
                  <span className="text-[#9db9a8] text-sm">{update.date}</span>
                </div>
                <ul className="flex flex-col gap-4">
                  {update.changes.map((change, cIdx) => (
                    <li key={cIdx} className="flex items-start gap-3 text-[#9db9a8]">
                      <span className="mt-1 text-primary">{change.icon}</span>
                      <span className="text-sm leading-relaxed">{change.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Changelog;
