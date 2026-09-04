import { useEffect, useState, useRef } from "react";
import type { FormEvent, DragEvent } from "react";
import { suggestCategory } from "../api";
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
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [caption, setCaption] = useState("");
  const [media, setMedia] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const visibleCategories = categories.filter((item) => item !== "For you").length > 0
    ? categories.filter((item) => item !== "For you")
    : fallbackCategories;

  useEffect(() => {
    if (!media) {
      setPreviewUrl("");
      return undefined;
    }

    const nextPreviewUrl = URL.createObjectURL(media);
    setPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [media]);

  useEffect(() => {
    const serviceName = service.trim();
    if (serviceName.length < 3) {
      setSuggestedCategory(null);
      return undefined;
    }

    let isCurrent = true;
    const timer = window.setTimeout(() => {
      setIsSuggestingCategory(true);
      void suggestCategory(serviceName)
        .then(({ category: predictedCategory }) => {
          if (isCurrent && predictedCategory) setSuggestedCategory(predictedCategory);
        })
        .catch(() => {
          if (isCurrent) setSuggestedCategory(null);
        })
        .finally(() => {
          if (isCurrent) setIsSuggestingCategory(false);
        });
    }, 350);

    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [service]);

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
    setCategory("");
    setSuggestedCategory(null);
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
      setMessage("Please enter a service name.");
      return;
    }

    if (!category) {
      setMessage("Please select a category.");
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
    formData.append("category", category);
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
                <span>Ready</span>
              </div>
            </div>
          ) : (
            <div className="dropzone-empty-state">
              <div className="dropzone-icon-circle">
                <IconCamera size={32} />
              </div>
              <h3>Add media</h3>
              <p>Photo or video</p>
              <button
                className="btn-outline-sm"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Browse
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
            <span className="upload-author">{handle}</span>
            <h2>Post details</h2>
          </div>

          <div className="form-field-group">
            <div className="upload-booking-fields" aria-label="Booking details">
              <label className="studio-label">
                <span>Category</span>
                <select className="studio-input" value={category} onChange={(event) => setCategory(event.target.value)} required>
                  <option value="" disabled>Select</option>
                  {visibleCategories.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                {suggestedCategory && suggestedCategory !== category && (
                  <button className="category-suggestion" type="button" onClick={() => { setCategory(suggestedCategory); setSuggestedCategory(null); }}>
                    {isSuggestingCategory ? "Checking..." : `Use ${suggestedCategory}`}
                  </button>
                )}
              </label>
              <label className="studio-label upload-service-field">
                <span>Service</span>
                <input className="studio-input" value={service} onChange={(event) => setService(event.target.value)} placeholder="Knotless braids" required />
              </label>
              <label className="studio-label">
                <span>Price</span>
                <input className="studio-input" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="850" required />
              </label>
              <label className="studio-label">
                <span>Time</span>
                <input className="studio-input" type="number" min="15" step="15" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} required />
              </label>
            </div>

            <label className="studio-label">
              <span>Caption</span>
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Short note for clients"
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
            <span>{isSubmitting ? "Publishing..." : "Publish"}</span>
          </button>

          {message && (
            <p className="form-message form-message-error" role="status">
              {message}
            </p>
          )}
        </form>
      </section>

      {showSuccessPopup && (
        <div className="success-modal-backdrop" onClick={onUploaded}>
          <div className="success-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="success-modal-icon-wrap">
              <IconCheck size={28} />
            </div>

            <div className="success-modal-text">
              <h3>Published</h3>
              <p>Your work is live on the feed.</p>
            </div>

            <div className="success-modal-actions">
              <button
                className="btn-primary"
                type="button"
                onClick={onUploaded}
              >
                View feed
              </button>

              <button
                className="btn-ghost"
                type="button"
                onClick={resetForm}
              >
                Add another
              </button>
            </div>

            <button
              className="success-modal-close"
              type="button"
              onClick={onUploaded}
              aria-label="Close"
            >
              <IconClose size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default UploadSection;
