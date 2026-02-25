
import React from 'react';

const steps = [
  {
    icon: 'settings_suggest',
    title: 'Calibration',
    description: 'Sync your unique gait pattern by taking a short 200-meter walk. Our engine models your stride length and frequency.'
  },
  {
    icon: 'map',
    title: 'Tracking',
    description: 'Real-time offline processing captures every movement. No GPS dropouts, no data loss in tunnels or deep woods.'
  },
  {
    icon: 'insights',
    title: 'Analysis',
    description: 'Review detailed performance metrics with beautiful, high-contrast visualizations that help you improve efficiency.'
  }
];

const HowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className="bg-primary/[0.02] py-32 border-y border-primary/5">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-24 items-start">
          <div className="lg:w-1/3 flex flex-col gap-8 sticky top-32">
            <div className="flex flex-col gap-4">
              <h2 className="text-white text-3xl md:text-5xl font-heading font-black leading-[1.1] tracking-tighter">THE PROCESS</h2>
              <p className="text-[#9db9a8] text-lg leading-relaxed">
                Setting up Stryde takes less than 60 seconds. Our intelligent engine learns your unique gait to provide unrivaled accuracy.
              </p>
            </div>
            
            <div className="p-6 rounded-2xl border border-primary/20 bg-primary/10 flex items-center gap-5">
              <div className="size-12 rounded-xl bg-primary flex items-center justify-center text-background-dark">
                <span className="material-symbols-outlined text-3xl font-bold">verified</span>
              </div>
              <div>
                <p className="text-white font-heading font-black text-sm tracking-tighter">Built for Accuracy</p>
                <p className="text-[#9db9a8] text-xs uppercase tracking-widest font-bold mt-1">Certified precision</p>
              </div>
            </div>
          </div>

          <div className="lg:w-2/3 w-full">
            <div className="relative flex flex-col">
              {steps.map((step, idx) => (
                <div key={idx} className="flex gap-8 group">
                  <div className="flex flex-col items-center">
                    <div className="z-10 text-primary bg-background-dark w-16 h-16 flex items-center justify-center rounded-2xl border border-primary/20 group-hover:border-primary/60 transition-colors">
                      <span className="material-symbols-outlined text-3xl">{step.icon}</span>
                    </div>
                    {idx !== steps.length - 1 && (
                      <div className="w-[1px] bg-gradient-to-b from-primary/30 to-transparent h-32 my-2"></div>
                    )}
                  </div>
                  <div className="flex flex-col pt-2 pb-16">
                    <h3 className="text-white text-xl font-heading font-black mb-3 tracking-tighter">{step.title}</h3>
                    <p className="text-[#9db9a8] text-lg leading-relaxed max-w-xl">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
