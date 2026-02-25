
import React from 'react';
import Hero from '../components/Hero';
import Features from '../components/Features';
import HowItWorks from '../components/HowItWorks';
import LifestyleFeatures from '../components/LifestyleFeatures';

const Home: React.FC = () => {
  return (
    <>
      <Hero />
      <Features />
      <LifestyleFeatures />
      <HowItWorks />
    </>
  );
};

export default Home;
