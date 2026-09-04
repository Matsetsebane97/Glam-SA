import { useEffect, useState } from "react";
import { getNearbyArtists } from "../api";
import { IconChevronRight, IconCompass, IconPin, IconVerified } from "./Icons";
import type { CurrentUser, NearbyArtist } from "../types";
import { formatDistance } from "../utils/geo";

type RightRailProps = {
  currentUser: CurrentUser | null;
  onNavigate: (path: string) => void;
};

function RightRail({ currentUser, onNavigate }: RightRailProps) {
  const [artists, setArtists] = useState<NearbyArtist[]>([]);

  useEffect(() => {
    if (currentUser?.latitude == null || currentUser?.longitude == null) {
      return;
    }

    void getNearbyArtists({
      latitude: currentUser.latitude,
      longitude: currentUser.longitude,
      radius: 50,
    })
      .then((nearby) => nearby.filter((artist) => artist.handle !== currentUser.handle).slice(0, 5))
      .then(setArtists)
      .catch(() => setArtists([]));
  }, [currentUser?.latitude, currentUser?.longitude, currentUser?.handle]);

  return (
    <aside className="right-rail">
      {/* Local Talent Radar */}
      <section className="rail-card">
        <div className="rail-card-head">
          <div className="rail-title-row">
            <IconCompass size={18} />
            <h3>Artists Near You</h3>
          </div>
        </div>

        {currentUser?.locationLabel && (
          <div className="rail-location-indicator">
            <IconPin size={13} />
            <span>{currentUser.locationLabel}</span>
          </div>
        )}

        {artists.length === 0 ? (
          <div className="rail-empty-box">
            <p>
              {currentUser?.latitude != null
                ? "No other artists registered nearby yet."
                : "Enable GPS location to discover beauty artists in your area."}
            </p>
          </div>
        ) : (
          <ul className="rail-artist-list">
            {artists.map((artist) => (
              <li key={artist.id} className="rail-artist-item" role="button" tabIndex={0} onClick={() => onNavigate(`/profile/${artist.id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onNavigate(`/profile/${artist.id}`); }}>
                <div className="rail-artist-avatar" aria-hidden="true">
                  {artist.name.charAt(0).toUpperCase()}
                </div>
                <div className="rail-artist-meta">
                  <div className="rail-artist-name-row">
                    <strong>{artist.name}</strong>
                    <IconVerified size={12} />
                  </div>
                  <span>{formatDistance(artist.distanceKm)} · {artist.postCount} {artist.postCount === 1 ? "look" : "looks"}</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button
          className="rail-explore-btn"
          type="button"
          onClick={() => onNavigate("/discover")}
        >
          <span>View on Map</span>
          <IconChevronRight size={16} />
        </button>
      </section>

      {/* Brand Footer */}
      <footer className="rail-footer">
        <div className="footer-links">
          <button type="button" onClick={() => onNavigate("/about")}>About</button>
          <span>·</span>
          <button type="button" onClick={() => onNavigate("/terms")}>Terms</button>
          <span>·</span>
          <button type="button" onClick={() => onNavigate("/privacy")}>Privacy</button>
        </div>
        <p className="footer-copy">© 2026 Glam SA</p>
      </footer>
    </aside>
  );
}

export default RightRail;
