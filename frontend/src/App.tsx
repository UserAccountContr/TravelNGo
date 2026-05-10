import React, { useState, useEffect, useRef } from "react";
import type { RouteOption } from "./types";
import "./styles.css";

export const App: React.FC = () => {
  const [city, setCity] = useState("");
  const [transportMode, setTransportMode] = useState("walking");
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [cityFacts, setCityFacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [timeStart, setTimeStart] = useState("09:00");
  const [timeEnd, setTimeEnd] = useState("17:00");
  const [persona, setPersona] = useState("Tourist");
  const [budget, setBudget] = useState(50);
  const [groupSize, setGroupSize] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const summaryText = [
    city || "No city selected",
    `${timeStart}–${timeEnd}`,
    persona,
    transportMode.charAt(0).toUpperCase() + transportMode.slice(1),
    `€${budget}`,
    `${groupSize} ${groupSize > 1 ? 'people' : 'person'}`
  ].join(" • ");

  async function generateRoutes() {
    if (!city.trim()) {
      setError("Please enter a city before generating routes.");
      return;
    }

    setLoading(true);
    setError(null);

    try {

      const res = await fetch('http://localhost:4000/api/generate-routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          timeStart,
          timeEnd,
          persona,
          budget,
          groupSize,
          transportMode,
        }),
      });

      if (!res.ok) {
        // console.log(res);
        const errorData = await res.json();
        throw new Error(`${errorData.details || res.statusText}`);
      }
        
      const data = await res.json();
      
      if (!data.routes || !data.routes.routeOptions || !data.routes.cityFacts || data.routes.routeOptions.length === 0) {
        throw new Error("No routes found. Please try different preferences.");
      }
      // console.log(data);
      setRoutes(data.routes.routeOptions);
      setCityFacts(data.routes.cityFacts);
    } catch (err) {
      setError((err as Error).message || "Something went wrong. Please try again.");
      setRoutes([]);
      setCityFacts([]);
    }

    setLoading(false);
  }

  const carouselRef = useRef(null);

  const loopedRoutes = [
    routes[routes.length - 1], // clone last
    ...routes,
    routes[0], // clone first
  ];

  const handleCardClick = (e, route) => {
    const el = e.currentTarget;
    const container = carouselRef.current;

    if (!container) return;

    if (el.classList.contains("active")) {
      setSelectedRoute(route);
    } else {
      // Calculate the center of the card relative to the track
      const cardCenter = el.offsetLeft + el.offsetWidth / 2;
      // Calculate the center point of the visible container
      const containerCenterOffset = container.offsetWidth / 2;
      
      container.scrollTo({
        left: cardCenter - containerCenterOffset,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    if (selectedRoute) {
      // Disable page scroll
      document.body.style.overflow = "hidden";
    } else {
      // Re-enable scroll
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [selectedRoute]);


  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;

    const updateActive = () => {
      const items = container.querySelectorAll(".carousel-item");
      const containerCenter = container.scrollLeft + container.offsetWidth / 2;

      items.forEach((card) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        // Precision threshold: 50px is usually perfect for 300px cards
        if (Math.abs(containerCenter - cardCenter) < 60) {
          card.classList.add("active");
        } else {
          card.classList.remove("active");
        }
      });
    };

    const handleInfiniteLoop = () => {
      const { scrollLeft, scrollWidth, offsetWidth } = container;
      
      // Jump from Start-Clone to Real-End
      if (scrollLeft <= 5) {
        // Jump to the item before the last clone
        const lastRealItem = container.children[0].children[routes.length];
        container.scrollTo({ 
          left: lastRealItem.offsetLeft + (lastRealItem.offsetWidth / 2) - (offsetWidth / 2), 
          behavior: "auto" 
        });
      } 
      // Jump from End-Clone to Real-Start
      else if (scrollLeft + offsetWidth >= scrollWidth - 5) {
        const firstRealItem = container.children[0].children[1];
        container.scrollTo({ 
          left: firstRealItem.offsetLeft + (firstRealItem.offsetWidth / 2) - (offsetWidth / 2), 
          behavior: "auto" 
        });
      }
    };

    const onScroll = () => {
      updateActive();
      handleInfiniteLoop();
    };

    container.addEventListener("scroll", onScroll);
    
    // Initial position: Center on the first "Real" card (index 1 in loopedRoutes)
    const timer = setTimeout(() => {
      const firstReal = container.querySelectorAll(".carousel-item")[1];
      if (firstReal) {
        container.scrollTo({
          left: firstReal.offsetLeft + (firstReal.offsetWidth / 2) - (container.offsetWidth / 2),
          behavior: "auto"
        });
        updateActive();
      }
    }, 50);

    return () => {
      container.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, [routes]);


  return (
    <div className="app-container">

      <div className="background-gradient" >

      {/* HEADER */}
      <div className="header">
        <div className="logo">Travel&Go</div>
        <div className="header-icons">
          {/* <span className="bell">🔔</span> */}
          <div className="guest-icon">👤</div>
          {/* <img className="profile-img" src="/profile.png" alt="profile" /> */}
        </div>
      </div>

      <div className="welcome">
        <p className="welcome-title">Welcome back, Traveler!</p>
        {/* <p className="welcome-name">Traveler</p> */}
      </div>
      </div>

      <div className={`search-summary-container ${searchOpen ? "open" : ""}`}>
  
      {/* SUMMARY BAR */}
      <div className="search-summary" onClick={() => setSearchOpen(!searchOpen)}>
        {!searchOpen && (
          <div className="summary-text">{summaryText}</div>
        )}
        {/* When expanded → show Search caption */}
        {searchOpen && (
          <div className="search-caption">Search</div>
        )}
        <button className="expand-btn">{searchOpen ? "▲" : "▼"}</button>
      </div>

      {/* EXPANDED FIELDS */}
      <div className={`search-expanded-inline ${searchOpen ? "show" : ""}`}>
        <label>City</label>
        <input
          type="text"
          placeholder="Enter city..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />

        <label>Budget (€)</label>
        <input
          type="number"
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
        />

        <label>Group Size</label>
        <input
          type="number"
          value={groupSize}
          onChange={(e) => setGroupSize(Number(e.target.value))}
        />

        <label>Transport Mode</label>
        <select
          value={transportMode}
          onChange={(e) => setTransportMode(e.target.value)}
        >
          <option value="walking">Walking</option>
          <option value="transit">Transit</option>
          <option value="driving">Driving</option>
          <option value="bicycling">Cycling</option>
        </select>

        <label>Persona</label>
        <select value={persona} onChange={(e) => setPersona(e.target.value)}>
          <option value="Tourist">Tourist</option>
          <option value="Food">Food Lover</option>
          <option value="Business">Business Traveler</option>
        </select>

        <label>Start Time</label>
        <input
          type="time"
          value={timeStart}
          onChange={(e) => setTimeStart(e.target.value)}
        />

        <label>End Time</label>
        <input
          type="time"
          value={timeEnd}
          onChange={(e) => setTimeEnd(e.target.value)}
        />

        <button
          className="apply-btn"
          disabled={!city.trim()}
          onClick={() => {
            if (!city.trim()) return;
            setSearchOpen(false);
            generateRoutes();
          }}
        >
          Generate Routes
        </button>
      </div>
    </div>
      {/* ROUTE CARDS */}
      <div className="routes-section">
        {loading && (
          <div className="carousel-coverflow skeleton-coverflow">
            <div className="carousel-track skeleton-track">
              <div key="1" className="carousel-item skeleton-card"></div>
              <div key="2" className="carousel-item skeleton-card active"></div>
              <div key="3" className="carousel-item skeleton-card"></div>
            </div>
          </div>
        )}

        {/* WELCOME MESSAGE WHEN NO ROUTES */}
        {!loading && routes.length === 0 && !error && (
          <div className="welcome-message">
            <h2>Welcome to Travel&Go</h2>
            <p>Start by entering a city and your preferences above.</p>
            <p>We'll generate personalized routes just for you.</p>
          </div>
        )}

        {/* ERROR MESSAGE */}
        {!loading && error && (
          <div className="welcome-message error">
            <h2>Oops!</h2>
            <p>{error}</p>
          </div>
        )}

        {/* ROUTES LIST AS CAROUSEL */}
        {!loading && routes.length > 0 && (
          <div className="carousel-coverflow" ref={carouselRef}>
            <div className="carousel-track">
              {loopedRoutes.map((route, i) => (
                <div key={i} className="carousel-item" 
                onClick={(e) => handleCardClick(e, route)}>
                  <img className="carousel-image" src={route.imageUrl} />
                  <div className="carousel-info">
                    <div>
                      <h3>{route.routeName}</h3>
                      <p>{route.personaFitSummary}</p>
                    </div>
                  </div>
                  <div className="carousel-extra">
                    <span>🔘 {route.itinerary.length} stops</span>
                    <span>💶 €{route.totalEstimatedCost}</span>
                  </div>
                  <div className="carousel-flags">
                    {route.itinerary.some(s => s.tickets_required_online) && <span>🎟️ Tickets</span>}
                    {route.itinerary.some(s => s.reservation_recommended) && <span>📅 Reservations</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CITY FACTS */}
      {!loading && cityFacts.length > 0 && (
        <div className="city-facts-section">
          <h2 className="facts-title">Did you know?</h2>

          {cityFacts.map((fact, i) => (
            <div key={i} className="city-fact-card">
              <div className="fact-icon">{fact.icon}</div>
              <div className="fact-content">
                <h3>{fact.title}</h3>
                <p>{fact.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}


      {/* BOTTOM NAV */}
      {/* <nav className="bottom-nav">
        <span>🏠</span>
        <span>❤️</span>
        <span>👤</span>
      </nav> */}

      {selectedRoute && (
        <div className="route-details-overlay">
          <div className="route-details">

            <div className="details-header">
              <h2>Route Details</h2>
              <button className="close-btn" onClick={(e) => {
                const page = e.target.parentNode.parentNode;
                page.classList.add("closing");
                const overlay = page.parentNode;
                overlay.classList.add("closing");
                setTimeout(() => {
                  setSelectedRoute(null);
                }, 400);
                }}>✕</button>
            </div>
            
            <div className="details-content">
              <img className="details-image" src={selectedRoute.imageUrl} alt="" />

              <h2 className="details-title">{selectedRoute.routeName}</h2>
              <p className="details-summary">{selectedRoute.personaFitSummary}</p>

              <div className="details-meta">
                <span>🔘 {selectedRoute.itinerary.length} stops</span>
                <span>💶 €{selectedRoute.totalEstimatedCost}</span>
                <span>⏱ {selectedRoute.totalDurationMinutes} min</span>
                <span>🚶 {selectedRoute.transportMode.charAt(0).toUpperCase() + selectedRoute.transportMode.slice(1)}</span>
              </div>

              <h3>Stops</h3>
              <ul className="stops-list">
                {selectedRoute.itinerary.map((stop, i) => (
                  <li key={i} className="stop-item">
                    <strong>{stop.name}</strong>
                    <p>{stop.address}</p>
                    <p>{stop.notes}</p>
                    <div className="stop-meta">
                      <span>⏱ {stop.startTime}–{stop.endTime}</span>
                      <span>💶 €{stop.estimatedCost}</span>
                    </div>

                    <div className="stop-flags">
                      {stop.tickets_required_online && (
                        <span className="flag">🎟️ Online tickets required</span>
                      )}
                      {stop.reservation_recommended && (
                        <span className="flag">📅 Reservation recommended</span>
                      )}
                    </div>

                    {stop.local_tips && (
                      <p className="stop-tips">💡 {stop.local_tips}</p>
                    )}
                  </li>
                ))}
              </ul>

              <a className="book-btn" href={selectedRoute.googleMapsUrl} target="_blank">
                OPEN IN MAPS
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
