import React from 'react';
import './Background.css';

function Background() {
  const totalPoops = 10; 
  const totalSparkles = 20; 
  
  const poops = Array.from({ length: totalPoops });
  const sparkles = Array.from({ length: totalSparkles });

  return (
    <div className="background">
      {/* Falling Poops */}
      {poops.map((_, index) => {
        const leftPosition = Math.random() * 100;
        const animationDelay = Math.random() * -30;
        const animationDuration = Math.random() * 20 + 40;
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
      })}

      {/* Sparkles */}
      {sparkles.map((_, index) => {
        const leftPosition = Math.random() * 100;
        const topPosition = Math.random() * 100;
        const animationDelay = Math.random() * -20;
        const animationDuration = Math.random() * 5 + 5;
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
      })}
    </div>
  );
}

export default Background;
