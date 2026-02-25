
import React from 'react';
import { motion } from 'motion/react';

const Terms: React.FC = () => {
  return (
    <div className="pt-32 pb-24 px-4 max-w-4xl mx-auto">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col gap-12"
      >
        <div className="flex flex-col gap-4">
          <h1 className="text-white text-5xl md:text-7xl font-heading font-black tracking-tighter">
            Terms of Service
          </h1>
          <p className="text-primary font-mono text-sm tracking-widest uppercase">Effective Date: February 25, 2026</p>
        </div>

        <div className="text-[#9db9a8] leading-relaxed flex flex-col gap-8">
          <section>
            <h2 className="text-white text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p>
              By downloading or using the Stryde application, you agree to be bound by these terms. If you do not agree, do not use the service. Stryde is designed for high-performance athletes and requires a commitment to data accuracy.
            </p>
          </section>

          <section>
            <h2 className="text-white text-2xl font-bold mb-4">2. User Conduct</h2>
            <p>
              You agree not to use Stryde for any illegal purposes or to attempt to reverse engineer our proprietary gait analysis algorithms. Any attempt to spoof sensor data to manipulate leaderboard rankings will result in an immediate ban.
            </p>
          </section>

          <section>
            <h2 className="text-white text-2xl font-bold mb-4">3. Limitation of Liability</h2>
            <p>
              Stryde is a tool for performance tracking. We are not responsible for any injuries sustained during physical activity. Always consult a medical professional before beginning a new high-intensity training regimen.
            </p>
          </section>

          <section>
            <h2 className="text-white text-2xl font-bold mb-4">4. Subscription & Billing</h2>
            <p>
              Certain features require a Stryde Pro subscription. Subscriptions are billed monthly or annually and can be cancelled at any time through the app store. No refunds are provided for partial billing periods.
            </p>
          </section>
        </div>
      </motion.div>
    </div>
  );
};

export default Terms;
