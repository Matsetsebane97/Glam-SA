// Location-based artist discovery and public profile entry points.
import { useEffect, useState } from "react";
import { getNearbyArtists } from "../api";
import NearbyMap from "../components/NearbyMap";
import { IconCompass, IconNavigation, IconPin, IconVerified, IconWhatsApp } from "../components/Icons";
import type { Coordinates, CurrentUser, NearbyArtist } from "../types";
import { formatDistance } from "../utils/geo";
import { requestUserLocation } from "../utils/geolocation";
import DirectionsConfirmModal from "../components/DirectionsConfirmModal";

type DiscoverPageProps = {
  currentUser: CurrentUser | null;
  onNavigate: (path: string) => void;
};

function DiscoverPage({ currentUser, onNavigate }: DiscoverPageProps) {
  const [coords, setCoords] = useState<Coordinates | null>(
    currentUser?.latitude != null && currentUser?.longitude != null
      ? { latitude: currentUser.latitude, longitude: currentUser.longitude }
      : null,
  );
  const [artists, setArtists] = useState<NearbyArtist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState("");
  const [directionsArtist, setDirectionsArtist] = useState<NearbyArtist | null>(null);

  const loadArtists = async (nextCoords: Coordinates) => {
    setIsLoading(true);
    setError("");
    try {
      const nearby = await getNearbyArtists({ ...nextCoords, radius: 50 });
      setArtists(nearby.filter((artist) => artist.handle !== currentUser?.handle));
    } catch {
      setError("We could not load nearby artists right now.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (coords) void loadArtists(coords);
  }, [coords?.latitude, coords?.longitude]);

  const enableLocation = async () => {
    setIsLocating(true);
    setError("");
    try {
      const result = await requestUserLocation();
      setCoords({ latitude: result.latitude, longitude: result.longitude });
    } catch (locationError) {
      setError(
        locationError instanceof Error ? locationError.message : "Could not get your location.",
      );
    } finally {
      setIsLocating(false);
    }
  };

  const directionsUrl = (artist: NearbyArtist) =>
    `https://www.google.com/maps/dir/?api=1&destination=${artist.latitude},${artist.longitude}`;

  return (
    <div className="page-content discover-page">
      {/* Editorial Header */}
      <section className="discover-hero">
        <div className="hero-badge">
          <IconCompass size={14} />
          <span>RADAR DISCOVERY · BEAUTY NEAR YOU</span>
        </div>
        <h1>
          Find exceptional artists <em>close to you</em>
        </h1>
        <p className="hero-subtitle">
          Explore talented hair braiders, lash techs, nail artists, and barbers located in your neighbourhood.
        </p>
      </section>

      {!coords ? (
        <div className="location-prompt-card">
          <div className="location-prompt-icon-ring">
            <IconPin size={32} className="text-gold" />
          </div>
          <h2>Enable Location Radar</h2>
          <p>We use your device GPS coordinates to calculate real-time distance and show verified artists nearest to you.</p>
          <div className="location-action-buttons">
            <button
              className="btn-primary"
              type="button"
              onClick={enableLocation}
              disabled={isLocating}
            >
              {isLocating ? "Acquiring GPS Signal..." : "Use My Current Location"}
            </button>
            {!currentUser && (
              <button
                className="btn-ghost"
                type="button"
                onClick={() => onNavigate("/login")}
              >
                Or Sign In with Saved City
              </button>
            )}
          </div>
          {error && <p className="form-message form-message-error">{error}</p>}
        </div>
      ) : (
        <div className="discover-interactive-view">
          {/* Map View */}
          <div className="discover-map-wrapper">
            <NearbyMap
              center={coords}
              artists={artists}
            />
          </div>

          {/* Nearby List */}
          <section className="discover-artists-section">
            <div className="feed-header-bar">
              <div>
                <h2>Verified Artists Nearby</h2>
                <p>Showing beauty creators within 50 km</p>
              </div>
              <button
                className="btn-ghost btn-sm"
                type="button"
                onClick={enableLocation}
                disabled={isLocating}
              >
                <IconPin size={14} />
                <span>{isLocating ? "Updating..." : "Recalibrate GPS"}</span>
              </button>
            </div>

            {isLoading && (
              <div className="empty-state">
                <div className="loading-spinner" />
                <p>Scanning your area for registered artists...</p>
              </div>
            )}

            {!isLoading && error && <div className="empty-state error"><p>{error}</p></div>}

            {!isLoading && !error && artists.length === 0 && (
              <div className="empty-state">
                <h3>No artists nearby yet</h3>
                <p>Be the pioneering beauty artist in your area to post your portfolio on Glam SA.</p>
                <button
                  className="btn-primary"
                  type="button"
                  onClick={() => onNavigate("/upload")}
                >
                  Share Your Work
                </button>
              </div>
            )}

            <div className="artist-card-grid">
              {artists.map((artist) => (
                <article key={artist.id} className="artist-portfolio-card" role="button" tabIndex={0} onClick={() => onNavigate(`/profile/${artist.id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onNavigate(`/profile/${artist.id}`); }}>
                  <div className="artist-avatar-large">
                    {artist.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="artist-card-body">
                    <div className="artist-title-row">
                      <strong>{artist.name}</strong>
                      <IconVerified size={14} />
                    </div>
                    <span className="artist-handle-sub">{artist.handle}</span>
                    {artist.locationLabel && (
                      <span className="artist-loc-pill">
                        <IconPin size={11} />
                        {artist.locationLabel}
                      </span>
                    )}
                  </div>
                  <div className="artist-card-footer">
                    <div className="artist-distance-info">
                      <span className="distance-val">{formatDistance(artist.distanceKm)}</span>
                      <small>{artist.postCount} {artist.postCount === 1 ? "look" : "looks"}</small>
                    </div>
                    <a
                      href={directionsUrl(artist)}
                      className="take-me-there-btn"
                      onClick={(event) => event.stopPropagation()}
                      onClickCapture={(event) => {
                        event.preventDefault();
                        setDirectionsArtist(artist);
                      }}
                    >
                      <IconNavigation size={15} />
                      <span>Take me there</span>
                    </a>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Hi ${artist.name}, I found you on Glam SA and want to inquire about booking a session!`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-whatsapp-sm"
                      title="Contact on WhatsApp"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <IconWhatsApp size={15} />
                      <span>Contact</span>
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>
          {directionsArtist && (
            <DirectionsConfirmModal
              artistName={directionsArtist.name}
              locationLabel={directionsArtist.locationLabel}
              onCancel={() => setDirectionsArtist(null)}
              onConfirm={() => {
                window.open(directionsUrl(directionsArtist), "_blank", "noopener,noreferrer");
                setDirectionsArtist(null);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default DiscoverPage;
