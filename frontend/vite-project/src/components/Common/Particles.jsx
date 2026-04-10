import React, { useEffect } from 'react';

const Particles = () => {
  useEffect(() => {
    const particles = [];
    const container = document.body;
    
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.className = 'floating-particle';
      particle.style.position = 'fixed';
      particle.style.pointerEvents = 'none';
      particle.style.fontSize = `${Math.random() * 30 + 20}px`;
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.animationDuration = `${Math.random() * 20 + 10}s`;
      particle.style.animationDelay = `${Math.random() * 5}s`;
      particle.style.opacity = '0.08';
      particle.innerHTML = ['🍽️', '🥘', '🍛', '🥗', '🍜'][Math.floor(Math.random() * 5)];
      container.appendChild(particle);
      particles.push(particle);
    }
    
    return () => {
      particles.forEach(p => p.remove());
    };
  }, []);
  
  return null;
};

export default Particles;