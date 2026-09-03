import { IconClose, IconNavigation } from "./Icons";

type DirectionsConfirmModalProps = {
  artistName: string;
  locationLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

function DirectionsConfirmModal({ artistName, locationLabel, onConfirm, onCancel }: DirectionsConfirmModalProps) {
  return (
    <div className="directions-modal-backdrop" role="presentation" onClick={onCancel}>
      <section
        className="directions-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="directions-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="directions-modal-close" type="button" onClick={onCancel} aria-label="Close directions confirmation">
          <IconClose size={18} />
        </button>
        <div className="directions-modal-icon"><IconNavigation size={24} /></div>
        <span className="eyebrow">Destination ready</span>
        <h2 id="directions-modal-title">Take me there?</h2>
        <p>Open Google Maps for directions to <strong>{artistName}</strong>{locationLabel ? ` in ${locationLabel}` : ""}.</p>
        <div className="directions-modal-actions">
          <button className="btn-ghost" type="button" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" type="button" onClick={onConfirm}>
            <IconNavigation size={16} />
            <span>Open Google Maps</span>
          </button>
        </div>
      </section>
    </div>
  );
}

export default DirectionsConfirmModal;