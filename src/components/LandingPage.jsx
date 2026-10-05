import { useState } from 'react'
import Logo from './Logo.jsx'
import Icon from './Icons.jsx'
import SearchForm from './SearchForm.jsx'

const transportModes = [
  ['train', 'Trains'],
  ['bus', 'Buses'],
  ['flight', 'Flights'],
  ['ferry', 'Ferries'],
]

const offers = [
  {
    eyebrow: 'Today only',
    title: '10% off',
    text: 'your next trip',
    button: 'Search today’s deals',
    mode: 'all',
  },
  {
    eyebrow: 'One search',
    title: '2,000+ partners',
    text: 'compared across every transport mode',
    button: 'Compare connections',
    mode: 'all',
  },
  {
    eyebrow: 'Need the coast?',
    title: 'Ferry fares',
    text: 'with live seat availability in this demo',
    button: 'Browse ferry routes',
    mode: 'ferry',
  },
]

export default function LandingPage({
  search,
  locations,
  dateBounds,
  onSearch,
  onSearchChange,
  onPlan,
}) {
  const [offerIndex, setOfferIndex] = useState(0)
  const offer = offers[offerIndex]

  function chooseMode(mode) {
    onSearchChange({ ...search, mode })
    document.getElementById('travel-search')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <main className="landing-page">
      <section className="hero" aria-labelledby="hero-title">
        <header className="landing-header page-shell">
          <Logo inverse />
          <nav aria-label="Transport modes">
            {transportModes.map(([mode, label]) => (
              <button type="button" key={mode} onClick={() => chooseMode(mode)}>
                {label}
              </button>
            ))}
          </nav>
          <div className="landing-header__actions">
            <span>€</span>
            <span>EN</span>
            <span className="demo-label demo-label--inverse">Synthetic demo</span>
          </div>
        </header>

        <div className="hero__content page-shell">
          <h1 id="hero-title">Global travel all in one place</h1>
          <p>Book train, bus, flight and ferry tickets</p>
        </div>

        <div id="travel-search" className="hero__search page-shell">
          <SearchForm
            search={search}
            locations={locations}
            dateBounds={dateBounds}
            onChange={onSearchChange}
            onSubmit={onSearch}
            onPlan={onPlan}
          />
        </div>
      </section>

      <section className="offers-section page-shell" aria-labelledby="offers-title">
        <div className="offers-copy">
          <p className="section-kicker">Fares for every kind of trip</p>
          <h2 id="offers-title">Omio offers</h2>
          <p>
            Discover exclusive prices on <strong>trains, buses, flights, and ferries</strong>,
            all in one place.
          </p>
        </div>

        <div className="offer-carousel" aria-live="polite">
          <button
            className="carousel-arrow carousel-arrow--left"
            type="button"
            aria-label="Previous offer"
            onClick={() => setOfferIndex((offerIndex - 1 + offers.length) % offers.length)}
          >
            <Icon name="arrow" size={22} />
          </button>
          <article className="offer-card">
            <span>{offer.eyebrow}</span>
            <strong>{offer.title}</strong>
            <p>{offer.text}</p>
            <button
              type="button"
              onClick={() => onSearch({ ...search, mode: offer.mode, page: 1 })}
            >
              {offer.button}
            </button>
          </article>
          <button
            className="carousel-arrow"
            type="button"
            aria-label="Next offer"
            onClick={() => setOfferIndex((offerIndex + 1) % offers.length)}
          >
            <Icon name="arrow" size={22} />
          </button>
          <div className="carousel-dots" aria-label="Select offer">
            {offers.map((item, index) => (
              <button
                key={item.title}
                type="button"
                className={index === offerIndex ? 'is-active' : ''}
                aria-label={`Offer ${index + 1}`}
                aria-current={index === offerIndex}
                onClick={() => setOfferIndex(index)}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="app-section" id="mobile-app" aria-labelledby="app-title">
        <div className="app-section__inner page-shell">
          <div className="app-visual">
            <p>Scan to get the Omio app</p>
            <img
              className="app-visual__scene"
              src="/assets/omio/app-background.svg"
              alt="Phone showing the Omio mobile app with train, bus, and plane illustrations"
            />
            <span className="app-visual__qr">
              <img
                src="/assets/omio/app-qr.svg"
                alt="QR code to download the Omio app"
              />
              <img
                src="/assets/omio/scanner-frame.svg"
                alt=""
              />
            </span>
          </div>

          <div className="app-copy">
            <h2 id="app-title">Our free app</h2>
            <p>One app for every step of your journey. Travel planning has never been easier.</p>
            <div className="app-features">
              <span>
                <img
                  src="/assets/omio/mobile-tickets.svg"
                  alt=""
                />
                Mobile tickets
              </span>
              <span>
                <img
                  src="/assets/omio/compass.svg"
                  alt=""
                />
                Travel inspiration
              </span>
              <span>
                <img
                  src="/assets/omio/updates.svg"
                  alt=""
                />
                Live journey updates
              </span>
            </div>
            <div className="app-badges">
              <a href="https://www.omio.com/apps" target="_blank" rel="noreferrer">
                <img
                  src="/assets/omio/app-store.svg"
                  alt="Download on the App Store"
                />
              </a>
              <a href="https://www.omio.com/apps" target="_blank" rel="noreferrer">
                <img
                  src="/assets/omio/google-play.svg"
                  alt="Get it on Google Play"
                />
              </a>
              <a href="https://www.omio.com/apps" target="_blank" rel="noreferrer">
                <img
                  src="/assets/omio/app-gallery.svg"
                  alt="Explore it on AppGallery"
                />
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
