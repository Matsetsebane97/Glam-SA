// Right rail — dark glass panels for nearby artists and brand footer.
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
    if (currentUser?.latitude == null || currentUser?.longitude == null) return;
    void getNearbyArtists({ latitude: currentUser.latitude, longitude: currentUser.longitude, radius: 50 })
      .then((nearby) => nearby.filter((a) => a.handle !== currentUser.handle).slice(0, 5))
      .then(setArtists)
      .catch(() => setArtists([]));
  }, [currentUser?.latitude, currentUser?.longitude, currentUser?.handle]);

  return (
    <aside className="right-rail">
      {/* Nearby artists card */}
      <section className="rail-panel">
        <div className="rail-panel-head">
          <div className="rail-panel-title">
            <IconCompass size={16} />
            <h3>Artists Near You</h3>
          </div>
          {currentUser?.locationLabel && (
            <div className="rail-location-tag">
              <IconPin size={11} />
              <span>{currentUser.locationLabel}</span>
            </div>
          )}
        </div>

        {artists.length === 0 ? (
          <div className="rail-empty">
            <p>
              {currentUser?.latitude != null
                ? "No other artists nearby yet."
                : "Enable location to discover nearby beauty artists."}
            </p>
          </div>
        ) : (
          <ul className="rail-artist-list">
            {artists.map((artist) => (
              <li
                key={artist.id}
                className="rail-artist-row"
                role="button"
                tabIndex={0}
                onClick={() => onNavigate(`/profile/${artist.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onNavigate(`/profile/${artist.id}`);
                }}
              >
                <div className="rail-artist-avatar" aria-hidden="true">
                  {artist.name.charAt(0).toUpperCase()}
                </div>
                <div className="rail-artist-meta">
                  <div className="rail-artist-name">
                    <strong>{artist.name}</strong>
                    <IconVerified size={11} />
                  </div>
                  <span className="rail-artist-info">
                    {formatDistance(artist.distanceKm)} · {artist.postCount}{" "}
                    {artist.postCount === 1 ? "look" : "looks"}
                  </span>
                </div>
                <IconChevronRight size={14} className="rail-artist-chevron" />
              </li>
            ))}
          </ul>
        )}

        <button
          className="rail-map-btn"
          type="button"
          onClick={() => onNavigate("/discover")}
        >
          <IconCompass size={14} />
          <span>View on Map</span>
          <IconChevronRight size={13} />
        </button>
      </section>

      {/* Brand footer */}
      <footer className="rail-footer">
        <div className="rail-footer-links">
          <button type="button" onClick={() => onNavigate("/about")}>About</button>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={() => onNavigate("/terms")}>Terms</button>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={() => onNavigate("/privacy")}>Privacy</button>
        </div>
        <p className="rail-footer-copy">© 2026 Glam SA</p>
      </footer>
    </aside>
  );
}

export default RightRail;
