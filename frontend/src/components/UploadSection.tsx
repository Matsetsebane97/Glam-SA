import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent, FormEvent } from "react";
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
  const previewObjectUrlRef = useRef("");
  const suggestionTimerRef = useRef<number | null>(null);

  const visibleCategories = useMemo(() => {
    const cleanedCategories = categories.filter((item) => item !== "For you");
    return cleanedCategories.length > 0 ? cleanedCategories : fallbackCategories;
  }, [categories]);

  const canPublish = Boolean(media && service.trim() && category && price && Number(price) >= 0 && Number(durationMinutes) >= 15);
  const priceLabel = price ? `R${Number(price).toLocaleString("en-ZA")}` : "Price";
  const durationLabel = durationMinutes ? `${durationMinutes} min` : "Time";

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) URL.revokeObjectURL(previewObjectUrlRef.current);
      if (suggestionTimerRef.current) window.clearTimeout(suggestionTimerRef.current);
    };
  }, []);

  const setSelectedMedia = (file: File | null) => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = "";
    }

    setMedia(file);
    if (!file) {
      setPreviewUrl("");
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    previewObjectUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
  };

  const handleServiceChange = (nextService: string) => {
    setService(nextService);
    if (suggestionTimerRef.current) window.clearTimeout(suggestionTimerRef.current);

    const serviceName = nextService.trim();
    if (serviceName.length < 3) {
      setSuggestedCategory(null);
      setIsSuggestingCategory(false);
      return;
    }

    suggestionTimerRef.current = window.setTimeout(() => {
      setIsSuggestingCategory(true);
      void suggestCategory(serviceName)
        .then(({ category: predictedCategory }) => {
          setSuggestedCategory(predictedCategory || null);
        })
        .catch(() => {
          setSuggestedCategory(null);
        })
        .finally(() => {
          setIsSuggestingCategory(false);
        });
    }, 350);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      setSelectedMedia(event.dataTransfer.files[0]);
    }
  };

  const resetForm = () => {
    setService("");
    setCategory("");
    setSuggestedCategory(null);
    setPrice("");
    setDurationMinutes("60");
    setCaption("");
    setSelectedMedia(null);
    setMessage("");
    setShowSuccessPopup(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!media) {
      setMessage("Add a photo or video first.");
      return;
    }

    if (!service.trim()) {
      setMessage("Add a service name.");
      return;
    }

    if (!category) {
      setMessage("Choose a category.");
      return;
    }

    if (!price || Number(price) < 0 || Number(durationMinutes) < 15) {
      setMessage("Check the price and time.");
      return;
    }

    setMessage("");
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("creator", userName);
    formData.append("handle", handle);
    formData.append("service", service.trim());
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
      <form className="upload-launchpad" onSubmit={submit} aria-label="Creator Upload Studio">
        <div
          className={`upload-media-stage ${isDragging ? "dragging" : ""} ${previewUrl ? "has-preview" : ""}`}
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
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedMedia(null);
                }}
                title="Remove media"
              >
                <IconClose size={16} />
              </button>
            </div>
          ) : (
            <div className="upload-media-empty">
              <IconCamera size={34} />
              <strong>Drop work here</strong>
              <button
                className="btn-outline-sm"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Choose file
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden-file-input"
            onChange={(event) => setSelectedMedia(event.target.files?.[0] || null)}
          />

          <div className="upload-preview-plate">
            <span>{handle}</span>
            <h2>{service.trim() || "Untitled look"}</h2>
            <div className="upload-preview-meta">
              <b>{category || "Category"}</b>
              <b>{priceLabel}</b>
              <b>{durationLabel}</b>
            </div>
          </div>
        </div>

        <section className="upload-control-panel">
          <div className="upload-panel-head">
            <span>Creator post</span>
            <h2>Make it bookable</h2>
          </div>

          <label className="studio-label upload-service-field">
            <span>Service</span>
            <input className="studio-input" value={service} onChange={(event) => handleServiceChange(event.target.value)} placeholder="Knotless braids" required />
          </label>

          <div className="studio-label">
            <span>Category</span>
            <div className="category-chip-grid" aria-label="Category">
              {visibleCategories.map((item) => (
                <button
                  key={item}
                  className={`category-choice ${category === item ? "selected" : ""}`}
                  type="button"
                  onClick={() => setCategory(item)}
                >
                  {category === item && <IconCheck size={13} />}
                  <span>{item}</span>
                </button>
              ))}
            </div>
            {suggestedCategory && suggestedCategory !== category && (
              <button className="category-suggestion" type="button" onClick={() => { setCategory(suggestedCategory); setSuggestedCategory(null); }}>
                {isSuggestingCategory ? "Checking..." : `Use ${suggestedCategory}`}
              </button>
            )}
          </div>

          <div className="upload-rate-row">
            <label className="studio-label">
              <span>Price</span>
              <input className="studio-input" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="850" required />
            </label>
            <label className="studio-label">
              <span>Minutes</span>
              <input className="studio-input" type="number" min="15" step="15" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} required />
            </label>
          </div>

          <label className="studio-label">
            <span>Note</span>
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Optional"
              rows={3}
              className="studio-input studio-textarea"
            />
          </label>

          <div className="upload-action-dock">
            <button className="btn-ghost upload-clear-btn" type="button" onClick={resetForm}>
              Clear
            </button>
            <button className="btn-primary studio-submit-btn" type="submit" disabled={isSubmitting || !canPublish}>
              <IconUpload size={18} />
              <span>{isSubmitting ? "Publishing..." : "Publish"}</span>
            </button>
          </div>

          {message && (
            <p className="form-message form-message-error" role="status">
              {message}
            </p>
          )}
        </section>
      </form>

      {showSuccessPopup && (
        <div className="success-modal-backdrop" onClick={onUploaded}>
          <div className="success-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="success-modal-icon-wrap">
              <IconCheck size={28} />
            </div>

            <div className="success-modal-text">
              <h3>Live</h3>
              <p>Your post is ready for clients.</p>
            </div>

            <div className="success-modal-actions">
              <button className="btn-primary" type="button" onClick={onUploaded}>
                View feed
              </button>
              <button className="btn-ghost" type="button" onClick={resetForm}>
                New post
              </button>
            </div>

            <button className="success-modal-close" type="button" onClick={onUploaded} aria-label="Close">
              <IconClose size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default UploadSection;
