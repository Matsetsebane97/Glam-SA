import { useEffect, useState, useRef } from "react";
import type { FormEvent, DragEvent } from "react";
import { fallbackCategories } from "../constants";
import { IconCamera, IconCheck, IconClose, IconUpload } from "./Icons";

type UploadSectionProps = {
  userName: string;
  handle: string;
  categories: string[];
  onUploaded: () => void;
};

function UploadSection({ userName, handle, categories, onUploaded }: UploadSectionProps) {
  const [service, setService] = useState("");
  const [price, setPrice] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [caption, setCaption] = useState("");
  const [media, setMedia] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const serviceOptions = categories.filter((category) => category !== "For you");
  const visibleServiceOptions = serviceOptions.length > 0 ? serviceOptions : fallbackCategories;

  useEffect(() => {
    if (!media) {
      setPreviewUrl("");
      return undefined;
    }

    const nextPreviewUrl = URL.createObjectURL(media);
    setPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [media]);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setMedia(e.dataTransfer.files[0]);
    }
  };

  const resetForm = () => {
    setService("");
    setPrice("");
    setDurationMinutes("60");
    setCaption("");
    setMedia(null);
    setMessage("");
    setShowSuccessPopup(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!media) {
      setMessage("Please choose or drop an image/video to showcase.");
      return;
    }

    if (!service) {
      setMessage("Please select a specialty or style category.");
      return;
    }

    if (!price || Number(price) < 0 || Number(durationMinutes) < 15) {
      setMessage("Enter a valid price and an estimated time of at least 15 minutes.");
      return;
    }

    setMessage("");
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("creator", userName);
    formData.append("handle", handle);
    formData.append("service", service);
    formData.append("price", price);
    formData.append("durationMinutes", durationMinutes);
    formData.append("caption", caption);
    formData.append("media", media);

    try {
      const response = await fetch("/api/posts/", { method: "POST", body: formData });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Your work could not be shared.");
      
      setShowSuccessPopup(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your work could not be shared.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <section className="upload-studio-card" aria-label="Creator Upload Studio">
        <div
          className={`upload-dropzone ${isDragging ? "dragging" : ""} ${previewUrl ? "has-preview" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !previewUrl && fileInputRef.current?.click()}
        >
          {previewUrl ? (
            <div className="preview-container">
              {media?.type.startsWith("video/") ? (
                <video src={previewUrl} controls className="studio-preview-media" />
              ) : (
                <img src={previewUrl} alt="Selected look preview" className="studio-preview-media" />
              )}
              <button
                className="preview-remove-btn"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMedia(null);
                }}
                title="Remove media"
              >
                <IconClose size={16} />
              </button>
              <div className="preview-status-pill">
                <IconCheck size={12} />
                <span>Ready to publish</span>
              </div>
            </div>
          ) : (
            <div className="dropzone-empty-state">
              <div className="dropzone-icon-circle">
                <IconCamera size={32} />
              </div>
              <h3>Drop your photo or video here</h3>
              <p>Support for high-res JPG, PNG, WEBP, or MP4 videos</p>
              <button
                className="btn-outline-sm"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Browse Files
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden-file-input"
            onChange={(event) => setMedia(event.target.files?.[0] || null)}
          />
        </div>

        <form className="upload-studio-form" onSubmit={submit}>
          <div className="form-header">
            <div className="eyebrow">
              <span>PORTFOLIO SHOWCASE</span>
            </div>
            <h2>Publish to Glam SA</h2>
            <p>Share details so clients near you can discover and request this style.</p>
          </div>

          <div className="form-field-group">
            <label className="studio-label">
              <span>Style Specialty Category</span>
              <select
                value={service}
                onChange={(event) => setService(event.target.value)}
                required
                className="studio-input"
              >
                <option value="" disabled>Select category (e.g. Tattoos, Knotless Braids, Nails)</option>
                {visibleServiceOptions.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </label>

            <div className="upload-booking-fields">
              <label className="studio-label">
                <span>Price (ZAR)</span>
                <input className="studio-input" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="e.g. 850.00" required />
              </label>
              <label className="studio-label">
                <span>Estimated time (minutes)</span>
                <input className="studio-input" type="number" min="15" step="15" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} required />
              </label>
            </div>

            <label className="studio-label">
              <span>Caption & Technique Notes</span>
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="e.g. Fine line floral tattoo on forearm. Completed in 3 hours at our Rosebank studio."
                rows={3}
                className="studio-input studio-textarea"
              />
            </label>
          </div>

          <button
            className="btn-primary studio-submit-btn"
            type="submit"
            disabled={isSubmitting || !media}
          >
            <IconUpload size={18} />
            <span>{isSubmitting ? "Publishing Look..." : "Publish Look to Feed"}</span>
          </button>

          {message && (
            <p className="form-message form-message-error" role="status">
              {message}
            </p>
          )}
        </form>
      </section>

      {/* Success Popup Modal */}
      {showSuccessPopup && (
        <div className="success-modal-backdrop" onClick={onUploaded}>
          <div className="success-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="success-modal-icon-wrap">
              <IconCheck size={28} />
            </div>

            <div className="success-modal-text">
              <h3>Look Published Successfully!</h3>
              <p>Your work is now live on the Glam SA community feed and searchable by clients across South Africa.</p>
            </div>

            <div className="success-modal-actions">
              <button
                className="btn-primary"
                type="button"
                onClick={onUploaded}
              >
                View on Feed
              </button>

              <button
                className="btn-ghost"
                type="button"
                onClick={resetForm}
              >
                Upload Another Look
              </button>
            </div>

            <button
              className="success-modal-close"
              type="button"
              onClick={onUploaded}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default UploadSection;
