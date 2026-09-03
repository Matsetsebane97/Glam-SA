// Draws nearby artists and the current location on the discovery map.
import { useState } from "react";
import type { Coordinates, NearbyArtist } from "../types";
import { boundsFromCenter, osmTileUrl, toMapPercent } from "../utils/geo";
import { IconNavigation, IconPin, IconVerified } from "./Icons";

type NearbyMapProps = {
  center: Coordinates;
  artists: NearbyArtist[];
  radiusKm?: number;
  showYou?: boolean;
  onSelectArtist?: (artist: NearbyArtist) => void;
};

function NearbyMap({ center, artists, radiusKm = 50, showYou = true, onSelectArtist }: NearbyMapProps) {
  const [activePin, setActivePin] = useState<NearbyArtist | null>(null);
  const bounds = boundsFromCenter(center.latitude, center.longitude, radiusKm);
  const youPosition = toMapPercent(center.latitude, center.longitude, bounds);

  const handlePinClick = (artist: NearbyArtist) => {
    setActivePin(artist);
    if (onSelectArtist) onSelectArtist(artist);
  };

  const directionsUrl = (artist: NearbyArtist) =>
    `https://www.google.com/maps/dir/?api=1&destination=${artist.latitude},${artist.longitude}`;

  return (
    <div className="nearby-map-container" aria-label="Interactive Map of Nearby Beauty Artists">
      <img
        className="nearby-map-tile"
        src={osmTileUrl(center.latitude, center.longitude)}
        alt="Map area"
        draggable={false}
      />
      <div className="nearby-map-overlay" />
      <div className="map-radar-pulse" style={{ left: `${youPosition.x}%`, top: `${youPosition.y}%` }} />

      {showYou && (
        <div
          className="map-marker map-marker-you"
          style={{ left: `${youPosition.x}%`, top: `${youPosition.y}%` }}
          title="Your Current Location"
        >
          <div className="you-pulse" />
          <span>You</span>
        </div>
      )}

      {artists.map((artist) => {
        const position = toMapPercent(artist.latitude, artist.longitude, bounds);
        const isSelected = activePin?.handle === artist.handle;

        return (
          <button
            key={artist.handle}
            type="button"
            className={`map-marker map-marker-artist ${isSelected ? "selected" : ""}`}
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
            onClick={() => handlePinClick(artist)}
            title={`${artist.name} · ${artist.distanceKm} km away`}
          >
            <span className="artist-marker-letter">{artist.name.charAt(0)}</span>
          </button>
        );
      })}

      {/* Floating Info Card when an artist pin is selected */}
      {activePin && (
        <div className="map-artist-popup">
          <div className="popup-author">
            <div className="popup-avatar">{activePin.name.charAt(0)}</div>
            <div>
              <div className="popup-name">
                <strong>{activePin.name}</strong>
                <IconVerified size={13} />
              </div>
              <small>{activePin.handle} · {activePin.locationLabel || "Local Artist"}</small>
            </div>
          </div>
          <div className="popup-meta">
            <span><IconPin size={11} /> {activePin.distanceKm} km away</span>
            <span>{activePin.postCount} looks</span>
          </div>
          <a
            className="take-me-there-btn"
            href={directionsUrl(activePin)}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
          >
            <IconNavigation size={15} />
            <span>Take me there</span>
          </a>
          <button
            className="popup-close-btn"
            type="button"
            onClick={() => setActivePin(null)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export default NearbyMap;
