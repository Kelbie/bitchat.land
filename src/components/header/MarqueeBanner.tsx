import React, { useState, useEffect, useRef } from "react";
import { globalStyles } from "../../styles";

interface MarqueeBannerProps {
  theme: "matrix" | "material";
}

  const styles = globalStyles["MarqueeBanner"];

export function MarqueeBanner({ theme }: MarqueeBannerProps) {
  const marqueeRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(0);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const animate = (currentTime: number) => {
      if (lastTimeRef.current !== 0) {
        const deltaTime = currentTime - lastTimeRef.current;
        const speed = 0.002;
        setPosition((prev) => {
          const newPos = prev - speed * deltaTime;
          return newPos <= -100 ? 100 : newPos;
        });
      }
      lastTimeRef.current = currentTime;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const handleClick = () => {
    window.open("https://sovran.money/esims", "_blank", "noopener,noreferrer");
  };

  return (
    <div
      onClick={handleClick}
      className={`border-y h-[30px] flex items-center overflow-hidden relative z-[1000] cursor-pointer transition-colors ${styles[theme].container}`}
    >
      <div
        ref={marqueeRef}
        className={`flex items-center whitespace-nowrap text-xs font-bold will-change-transform ${styles[theme].text}`}
        style={{ transform: `translateX(${position}vw)` }}
      >
        {Array(4)
          .fill(null)
          .map((_, index) => (
            <span key={index} className="pr-[50px] min-w-max">
              🌍 GET GLOBAL eSIMS FOR BITCOIN • PRIVACY • NO KYC • INSTANT
              ACTIVATION •{" "}
              <span className={styles[theme].highlight}>
                SOVRAN.MONEY/ESIMS
              </span>{" "}
              • STAY CONNECTED WORLDWIDE • PAY WITH BITCOIN ₿ • TRAVEL WITHOUT
              LIMITS • ANONYMOUS CONNECTIVITY •{" "}
            </span>
          ))}
      </div>
    </div>
  );
}

