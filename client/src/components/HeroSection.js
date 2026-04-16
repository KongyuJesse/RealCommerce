import { useState } from 'react';
import { useEffect } from 'react';

const HeroSection = ({ heroSlides = [], onNavigate }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = heroSlides[activeIndex] || heroSlides[0];

  // Auto-advance
  useEffect(() => {
    if (heroSlides.length < 2) return undefined;
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % heroSlides.length);
    }, 5500);
    return () => window.clearInterval(id);
  }, [heroSlides.length]);

  // Keep index in bounds when slide list changes
  useEffect(() => {
    if (!heroSlides.length) { setActiveIndex(0); return; }
    setActiveIndex((i) => i % heroSlides.length);
  }, [heroSlides.length]);

  // Keyboard arrow navigation
  useEffect(() => {
    if (!heroSlides.length) return undefined;
    const handleKey = (e) => {
      if (e.key === 'ArrowRight') setActiveIndex((i) => (i + 1) % heroSlides.length);
      if (e.key === 'ArrowLeft')  setActiveIndex((i) => (i - 1 + heroSlides.length) % heroSlides.length);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [heroSlides.length]);

  if (!heroSlides.length || !activeSlide) return null;

  return (
    <section className="hero-section" aria-label="Featured promotions">
      {heroSlides.map((slide, index) => (
        <div
          key={slide.id}
          className={`hero-slide ${index === activeIndex ? 'is-active' : ''}`}
          style={{ backgroundImage: `url(${slide.imageUrl})` }}
          role="img"
          aria-label={slide.alt || slide.title}
        />
      ))}

      <div className="hero-overlay">
        <div className="hero-copy">
          {activeSlide.eyebrow && (
            <span className="hero-copy-eyebrow">{activeSlide.eyebrow}</span>
          )}
          <h1>{activeSlide.title}</h1>
          {activeSlide.copy && <p>{activeSlide.copy}</p>}
          {activeSlide.subtitle && <p>{activeSlide.subtitle}</p>}
          {(activeSlide.ctaLabel || activeSlide.categorySlug) && (
            <button
              className="hero-cta"
              type="button"
              onClick={() => onNavigate && onNavigate('catalog', activeSlide.categorySlug || '')}
            >
              {activeSlide.ctaLabel || 'Shop now'} →
            </button>
          )}
        </div>

        <div className="hero-dots" role="tablist" aria-label="Hero slides">
          {heroSlides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={index === activeIndex ? 'is-active' : ''}
              onClick={() => setActiveIndex(index)}
              aria-label={`Show slide ${index + 1}`}
              aria-pressed={index === activeIndex}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
