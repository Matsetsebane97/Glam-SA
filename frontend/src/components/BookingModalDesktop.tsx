import { IconVerified, IconPin, IconStar } from "./Icons";

type BookingModalDesktopPreviewProps = {
  creatorName: string;
  creatorHandle?: string;
  creatorLocation?: string;
  creatorAvatar?: string;
  creatorRating?: number;
  creatorReviews?: number;
};

/**
 * Desktop artist preview pane for BookingModal
 * Shows on right side of modal on desktop (>1200px)
 * Displays artist details, rating, and booking info
 */
export function BookingModalDesktopPreview({
  creatorName,
  creatorHandle,
  creatorLocation,
  creatorAvatar,
  creatorRating = 4.8,
  creatorReviews = 0,
}: BookingModalDesktopPreviewProps) {
  return (
    <aside className="booking-modal-desktop-preview">
      {/* Artist card */}
      <div className="preview-artist-card">
        {creatorAvatar ? (
          <img
            src={creatorAvatar}
            alt={creatorName}
            className="preview-artist-image"
          />
        ) : (
          <div className="preview-artist-avatar">
            {creatorName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="preview-artist-info">
          <div className="preview-artist-title">
            <h3>{creatorName}</h3>
            <IconVerified size={16} />
          </div>

          {creatorHandle && (
            <p className="preview-artist-handle">@{creatorHandle}</p>
          )}

          {creatorLocation && (
            <p className="preview-artist-location">
              <IconPin size={12} /> {creatorLocation}
            </p>
          )}

          {/* Rating */}
          <div className="preview-rating">
            <div className="rating-stars">
              {Array.from({ length: 5 }).map((_, i) => (
                <IconStar
                  key={i}
                  size={14}
                  className={i < Math.floor(creatorRating) ? "star-filled" : "star-empty"}
                />
              ))}
            </div>
            <span className="rating-text">
              {creatorRating.toFixed(1)} ({creatorReviews} reviews)
            </span>
          </div>
        </div>
      </div>

      {/* Booking info summary */}
      <div className="preview-booking-info">
        <h4>Before You Book</h4>
        <ul className="preview-info-list">
          <li>✓ Confirm availability before booking</li>
          <li>✓ Deposit may be required</li>
          <li>✓ Cancellations accepted 24 hrs before</li>
          <li>✓ Payment due at salon visit</li>
        </ul>
      </div>

      {/* Quick stats */}
      <div className="preview-stats">
        <div className="stat-item">
          <span className="stat-label">Avg Response</span>
          <span className="stat-value">2 hrs</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">From</span>
          <span className="stat-value">R200</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Experience</span>
          <span className="stat-value">5+ yrs</span>
        </div>
      </div>
    </aside>
  );
}
