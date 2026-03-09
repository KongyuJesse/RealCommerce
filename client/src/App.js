import { useEffect, useState } from 'react';
import './App.css';
import MarketplaceCard from './components/MarketplaceCard';
import {
  CaretDownIcon,
  CartIcon,
  FlagUsaIcon,
  MapPinIcon,
  MenuIcon,
  SearchIcon,
} from './components/MarketplaceIcons';
import marketplaceHomeData from './marketplaceHomeData';
import { fetchHomepage } from './lib/api';
import { adaptHomepageToMarketplaceData } from './lib/homepageAdapter';

function App() {
  const [pageData, setPageData] = useState(marketplaceHomeData);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const activeHeroSlide =
    pageData.heroSlides[activeHeroIndex] || pageData.heroSlides[0];

  useEffect(() => {
    const controller = new AbortController();

    async function loadHomepage() {
      try {
        const homepageData = await fetchHomepage(controller.signal);
        setPageData(adaptHomepageToMarketplaceData(homepageData, marketplaceHomeData));
      } catch (error) {
        if (error.name !== 'AbortError') {
          setPageData(marketplaceHomeData);
        }
      }
    }

    loadHomepage();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!pageData.heroSlides.length) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveHeroIndex((current) => (current + 1) % pageData.heroSlides.length);
    }, 5200);

    return () => window.clearInterval(intervalId);
  }, [pageData.heroSlides.length]);

  useEffect(() => {
    if (!pageData.heroSlides.length) {
      setActiveHeroIndex(0);
      return;
    }

    setActiveHeroIndex((current) => current % pageData.heroSlides.length);
  }, [pageData.heroSlides.length]);

  return (
    <div className="amazon-shell">
      <header>
        <div className="navbar-top">
          <div className="nav-left">
            <a className="logo" href="#shop" aria-label="RealCommerce home">
              <span className="logo-text">realcommerce</span>
              <span className="logo-dot">.</span>
              <span>com</span>
            </a>

            <div className="deliver-to">
              <MapPinIcon size={18} />
              <div className="deliver-text">
                <span className="deliver-line1">Deliver to</span>
                <span className="deliver-line2">{pageData.location}</span>
              </div>
            </div>
          </div>

          <label className="nav-search" aria-label="Search RealCommerce">
            <span className="search-category">All</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search RealCommerce"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
            <button className="search-btn" type="button" aria-label="Search">
              <SearchIcon size={19} />
            </button>
          </label>

          <div className="nav-right">
            <div className="lang-flag">
              <FlagUsaIcon size={18} />
              <span>{pageData.language}</span>
              <CaretDownIcon size={12} />
            </div>

            <div className="account">
              <span>Hello, sign in</span>
              <span className="bold">Account & Lists</span>
            </div>

            <div className="returns">
              <span>Returns</span>
              <span className="bold">& Orders</span>
            </div>

            <div className="cart">
              <CartIcon size={24} />
              <span className="bold">Cart</span>
            </div>
          </div>
        </div>

        <div className="nav-secondary">
          <div className="nav-all">
            <MenuIcon size={16} />
            <span>All</span>
          </div>

          <div className="nav-options">
            {pageData.secondaryLinks.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>

          <div className="nav-deals">{pageData.spotlightLabel}</div>
        </div>
      </header>

      <main className="main-content" id="shop">
        <section className="hero-section" aria-label="Featured promotions">
          {pageData.heroSlides.map((slide, index) => (
            <div
              className={`hero-slide ${index === activeHeroIndex ? 'is-active' : ''}`}
              key={slide.id}
              style={{ backgroundImage: `url(${slide.imageUrl})` }}
              role="img"
              aria-label={slide.alt}
            />
          ))}

          <div className="hero-overlay">
            <div className="hero-copy">
              <span className="hero-copy-eyebrow">{activeHeroSlide.eyebrow}</span>
              <h1>{activeHeroSlide.title}</h1>
              <p>{activeHeroSlide.subtitle}</p>
            </div>

            <div className="hero-dots" role="tablist" aria-label="Hero slides">
              {pageData.heroSlides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  className={index === activeHeroIndex ? 'is-active' : ''}
                  onClick={() => setActiveHeroIndex(index)}
                  aria-label={`Show hero slide ${index + 1}`}
                  aria-pressed={index === activeHeroIndex}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="card-grid card-grid-floating" aria-label="Featured shopping sections">
          {pageData.featuredCards.map((card) => (
            <MarketplaceCard card={card} key={card.id} />
          ))}
        </section>

        <section className="card-grid card-grid-secondary" aria-label="More shopping sections">
          {pageData.secondaryCards.map((card) => (
            <MarketplaceCard card={card} key={card.id} />
          ))}
        </section>

        <section className="signin-strip">
          <p>See personalized recommendations</p>
          <button className="signin-btn" type="button">
            Sign in
          </button>
          <small>
            New customer? <a href="#shop">Start here.</a>
          </small>
        </section>
      </main>

      <button
        className="back-top"
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        Back to top
      </button>

      <footer>
        <div className="footer-links">
          {pageData.footerColumns.map((column) => (
            <div className="footer-col" key={column.title}>
              <p>{column.title}</p>
              <ul>
                {column.links.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer-divider" />

        <div className="footer-bottom">
          <div className="footer-logo">realcommerce</div>
          <div className="footer-copyright">
            <span>(c) 2026 RealCommerce, Inc. or its affiliates</span>
            <span>Conditions of Use</span>
            <span>Privacy Notice</span>
            <span>Your Ads Privacy Choices</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
