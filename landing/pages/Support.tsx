
import React from 'react';
import { motion } from 'motion/react';
import { Mail, MessageCircle, HelpCircle } from 'lucide-react';

const Support: React.FC = () => {
  return (
    <div className="pt-32 pb-24 px-4 max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-16"
      >
        <div className="max-w-3xl">
          <h1 className="text-white text-5xl md:text-7xl font-heading font-black tracking-tighter mb-6">
            Support Center
          </h1>
          <p className="text-[#9db9a8] text-xl leading-relaxed">
            Need help with Stryde? Our technical team is here to ensure your performance tracking never misses a beat.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-[#1c2720]/40 border border-primary/10 p-8 rounded-3xl flex flex-col gap-6">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-white text-xl font-bold mb-2">Email Support</h3>
              <p className="text-[#9db9a8] text-sm mb-4">Response time: &lt; 24 hours</p>
              <a href="mailto:support@stryde.app" className="text-primary font-bold hover:underline">support@stryde.app</a>
            </div>
          </div>

          <div className="bg-[#1c2720]/40 border border-primary/10 p-8 rounded-3xl flex flex-col gap-6">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-white text-xl font-bold mb-2">Community Discord</h3>
              <p className="text-[#9db9a8] text-sm mb-4">Join 10k+ athletes</p>
              <button className="text-primary font-bold hover:underline">Join Server</button>
            </div>
          </div>

          <div className="bg-[#1c2720]/40 border border-primary/10 p-8 rounded-3xl flex flex-col gap-6">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-white text-xl font-bold mb-2">Documentation</h3>
              <p className="text-[#9db9a8] text-sm mb-4">API & Sensor guides</p>
              <button className="text-primary font-bold hover:underline">Read Docs</button>
            </div>
          </div>
        </div>

        <div className="max-w-3xl flex flex-col gap-8">
          <h2 className="text-white text-3xl font-heading font-black tracking-tighter">Frequently Asked Questions</h2>
          <div className="flex flex-col gap-6">
            {[
              { q: "How does offline tracking work?", a: "Stryde stores all sensor data locally in an encrypted database. It only syncs to our servers when you explicitly choose to, or when a secure connection is established." },
              { q: "Is my gait data shared with third parties?", a: "Never. Your biometric data is yours. We do not sell data to insurance companies or advertisers." },
              { q: "Can I export my raw sensor data?", a: "Yes, Stryde allows CSV and JSON exports of all raw accelerometer and GPS data for your own analysis." }
            ].map((faq, i) => (
              <div key={i} className="border-b border-white/5 pb-6">
                <h4 className="text-white font-bold mb-2">{faq.q}</h4>
                <p className="text-[#9db9a8] text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Support;
