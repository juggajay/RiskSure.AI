'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';

// Hook for scroll-triggered animations
export function useScrollAnimation(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once visible, stop observing
          if (ref.current) {
            observer.unobserve(ref.current);
          }
        }
      },
      { threshold, rootMargin: '0px 0px -50px 0px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

// Component wrapper for scroll animations
interface AnimateOnScrollProps {
  children: ReactNode;
  animation?: 'fade-up' | 'fade-left' | 'fade-right' | 'scale-up' | 'blur-in';
  delay?: number;
  className?: string;
  threshold?: number;
}

export function AnimateOnScroll({
  children,
  animation = 'fade-up',
  delay = 0,
  className = '',
  threshold = 0.1,
}: AnimateOnScrollProps) {
  const { ref, isVisible } = useScrollAnimation(threshold);

  return (
    <div
      ref={ref}
      data-animate={animation}
      data-delay={delay > 0 ? delay.toString() : undefined}
      className={`${isVisible ? 'is-visible' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

// Staggered children animation wrapper
interface StaggerChildrenProps {
  children: ReactNode;
  className?: string;
  threshold?: number;
}

export function StaggerChildren({
  children,
  className = '',
  threshold = 0.1,
}: StaggerChildrenProps) {
  const { ref, isVisible } = useScrollAnimation(threshold);

  return (
    <div
      ref={ref}
      data-animate-stagger
      className={`${isVisible ? 'is-visible' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

// Animated counter component
interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  suffix = '',
  prefix = '',
  duration = 1500,
  className = '',
}: AnimatedCounterProps) {
  const { ref, isVisible } = useScrollAnimation(0.2);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Easing function (ease-out-expo)
      const easeOutExpo = 1 - Math.pow(2, -10 * progress);

      setDisplayValue(Math.floor(easeOutExpo * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [isVisible, value, duration]);

  return (
    <span ref={ref} className={`counter-animate ${isVisible ? 'is-visible' : ''} ${className}`}>
      {prefix}{displayValue}{suffix}
    </span>
  );
}

// Animated gauge component for the mockup
interface AnimatedGaugeProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function AnimatedGauge({
  percentage,
  size = 48,
  strokeWidth = 3,
  className = '',
}: AnimatedGaugeProps) {
  const { ref, isVisible } = useScrollAnimation(0.2);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div ref={ref} className={className}>
      <svg className={`-rotate-90`} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(40,15%,92%)"
          strokeWidth={strokeWidth}
        />
        {/* Animated progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(152,60%,45%)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={isVisible ? offset : circumference}
          style={{
            transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </svg>
    </div>
  );
}

// Initialize scroll observer for data-animate elements
export function ScrollAnimationInit() {
  useEffect(() => {
    const animatedElements = document.querySelectorAll('[data-animate]');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    animatedElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return null;
}
