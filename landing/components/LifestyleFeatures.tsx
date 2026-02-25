
import React from 'react';
import { Droplets, Moon, Sun, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

const lifestyleFeatures = [
  {
    icon: <Zap className="w-8 h-8 text-primary" />,
    title: 'Deep Work Mode',
    description: 'Personalized reminders for hydration and stretching when you enter your flow state. Stay productive without sacrificing your health.',
    tag: 'Focus',
    link: '/features/deep-work'
  },
  {
    icon: <Moon className="w-8 h-8 text-primary" />,
    title: 'Nightowl Sync',
    description: 'A fitness app that understands your rhythm. Sync your activity goals and tracking to your actual wake-up time, not the clock.',
    tag: 'Circadian',
    link: '/features/nightowl'
  },
  {
    icon: <Sun className="w-8 h-8 text-primary" />,
    title: 'Hustle Recovery',
    description: 'Personalized sleep reminders designed for workaholic hustlers. Smart wind-down routines that respect your ambition.',
    tag: 'Recovery',
    link: '/features/hustle-recovery'
  }
];

const LifestyleFeatures: React.FC = () => {
  return (
    <section className="py-24 bg-background-dark relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
      
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-16">
          <h2 className="text-white text-3xl md:text-5xl font-heading font-black tracking-tighter mb-4">
            Built for your <span className="text-primary italic">Lifestyle</span>
          </h2>
          <p className="text-[#9db9a8] text-lg max-w-2xl">
            Stryde goes beyond the track. We've engineered features that adapt to how you actually live and work.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {lifestyleFeatures.map((feature, idx) => (
            <Link 
              to={feature.link}
              key={idx}
            >
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="relative group p-8 rounded-3xl bg-slate-card/30 border border-white/5 hover:border-primary/30 transition-all duration-500 h-full cursor-pointer"
              >
                <div className="absolute top-4 right-4 text-[10px] font-black uppercase tracking-widest text-primary/40 group-hover:text-primary transition-colors">
                  {feature.tag}
                </div>
                
                <div className="mb-6 p-4 rounded-2xl bg-primary/5 w-fit group-hover:scale-110 transition-transform duration-500">
                  {feature.icon}
                </div>
                
                <h3 className="text-white text-xl font-heading font-bold mb-3 tracking-tight">
                  {feature.title}
                </h3>
                
                <p className="text-[#9db9a8] leading-relaxed">
                  {feature.description}
                </p>
                
                <div className="mt-8 flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  Learn More 
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LifestyleFeatures;
