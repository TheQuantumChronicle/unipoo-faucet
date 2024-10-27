// src/components/Background.js

import React, { useMemo, memo } from 'react';
import './Background.css';

function Background() {
  const totalPoops = 10;
  const totalSparkles = 20;

  const poops = useMemo(() => {
    return Array.from({ length: totalPoops }).map((_, index) => {
      const leftPosition = Math.random() * 100;
      const animationDelay = Math.random() * -30;
      const animationDuration = Math.random() * 20 + 40; // Duration between 40s and 60s
      const size = Math.random() * 10 + 30;

      const style = {
        left: `${leftPosition}%`,
        animationDelay: `${animationDelay}s`,
        animationDuration: `${animationDuration}s`,
        width: `${size}px`,
        height: `${size}px`,
        opacity: 0.3,
      };

      return (
        <div key={`poop-${index}`} className="poop" style={style}>
          <img src="/logo.png" alt="Rainbow Poop" />
        </div>
      );
    });
  }, []);

  const sparkles = useMemo(() => {
    return Array.from({ length: totalSparkles }).map((_, index) => {
      const leftPosition = Math.random() * 100;
      const topPosition = Math.random() * 100;
      const animationDelay = Math.random() * -20;
      const animationDuration = Math.random() * 5 + 5; // Duration between 5s and 10s
      const size = Math.random() * 3 + 2;

      const style = {
        left: `${leftPosition}%`,
        top: `${topPosition}%`,
        animationDelay: `${animationDelay}s`,
        animationDuration: `${animationDuration}s`,
        width: `${size}px`,
        height: `${size}px`,
        opacity: 0.5,
      };

      return (
        <div key={`sparkle-${index}`} className="sparkle" style={style}></div>
      );
    });
  }, []);

  return (
    <div className="background">
      {/* Falling Poops */}
      {poops}

      {/* Sparkles */}
      {sparkles}
    </div>
  );
}

export default memo(Background);
