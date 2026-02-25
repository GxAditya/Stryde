
import React from 'react';
import { CloudOff, Target, BatteryCharging } from 'lucide-react';

const featureList = [
  {
    icon: <CloudOff className="w-8 h-8" />,
    title: 'Offline-First',
    description: 'Your data stays on your device. Sync when you are ready without needing a constant connection. Perfect for remote trails.'
  },
  {
    icon: <Target className="w-8 h-8" />,
    title: 'Precision Sensor',
    description: 'Advanced filtering and calibration for zero phantom steps. We distinguish between a car ride and a run with 99.9% accuracy.'
  },
  {
    icon: <BatteryCharging className="w-8 h-8" />,
    title: 'Low Drain',
    description: 'Built with low-level sensor APIs to minimize drain even during ultra-marathon tracking. Lasts 4x longer than standard apps.'
  }
];

const Features: React.FC = () => {
  return (
    <section id="features" className="max-w-7xl mx-auto py-24 px-4">
      <div className="flex flex-col gap-16">
        <div className="flex flex-col gap-4 text-center max-w-3xl mx-auto">
          <h2 className="text-white tracking-tighter text-3xl md:text-5xl font-heading font-black">
            Engineered for Precision
          </h2>
          <p className="text-[#9db9a8] text-lg font-normal leading-relaxed">
            Experience the next generation of activity tracking built with our core technical pillars for athletes who demand data integrity.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featureList.map((f, idx) => (
            <div key={idx} className="group flex flex-col gap-6 rounded-[2rem] border border-primary/5 bg-[#1c2720]/40 p-10 hover:border-primary/40 hover:bg-[#1c2720] transition-all duration-500">
              <div className="text-primary w-14 h-14 flex items-center justify-center rounded-2xl bg-primary/10 group-hover:bg-primary group-hover:text-background-dark transition-all duration-500">
                {f.icon}
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-white text-xl font-heading font-bold tracking-tighter">{f.title}</h3>
                <p className="text-[#9db9a8] text-base font-normal leading-relaxed">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
