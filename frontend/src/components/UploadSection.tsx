import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent, FormEvent } from "react";
import { suggestCategory } from "../api";
import { fallbackCategories } from "../constants";
import { formatDuration } from "../utils/geo";
import { IconCamera, IconCheck, IconChevronRight, IconClose, IconUpload } from "./Icons";

type UploadSectionProps = {
  userName: string;
  handle: string;
  categories: string[];
  onUploaded: () => void;
};

type UploadStep = 1 | 2 | 3;

const DURATION_OPTIONS = [30, 60, 90, 120, 180, 240];

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadSection({ userName, handle, categories, onUploaded }: UploadSectionProps) {
  const [step, setStep] = useState<UploadStep>(1);
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

  const hasMedia = Boolean(media);
  const hasDetails = Boolean(service.trim() && category && price && Number(price) >= 0 && Number(durationMinutes) >= 15);
  const canPublish = hasMedia && hasDetails;
  const priceLabel = price ? `R${Number(price).toLocaleString("en-ZA")}` : "Set a price";
  const durationLabel = durationMinutes ? formatDuration(Number(durationMinutes)) : "Set a time";

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
    setMessage("");
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
    setStep(1);
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

  const goToStep = (nextStep: UploadStep) => {
    setMessage("");
    setStep(nextStep);
  };

  const publishPost = async () => {
    if (!media) {
      setMessage("Add a photo or video first.");
      goToStep(1);
      return;
    }

    if (!service.trim()) {
      setMessage("Add a service name.");
      goToStep(2);
      return;
    }

    if (!category) {
      setMessage("Choose a category.");
      goToStep(2);
      return;
    }

    if (!price || Number(price) < 0 || Number(durationMinutes) < 15) {
      setMessage("Check the price and time.");
      goToStep(2);
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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (step === 1) {
      if (!hasMedia) {
        setMessage("Add a photo or video first.");
        return;
      }
      goToStep(2);
      return;
    }

    if (step === 2) {
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
      goToStep(3);
      return;
    }

    await publishPost();
  };

  return (
    <>
      <form className="upload-composer" onSubmit={submit} aria-label="Create a listing">
        <ol className="upload-steps" aria-label="Upload steps">
          <li className={step === 1 ? "active" : hasMedia ? "done" : ""}>
            <span>1</span>
            Look
          </li>
          <li className={step === 2 ? "active" : hasDetails ? "done" : ""}>
            <span>2</span>
            Details
          </li>
          <li className={step === 3 ? "active" : ""}>
            <span>3</span>
            Review
          </li>
        </ol>

        {step === 1 && (
          <section className="upload-step-panel">
            <div className="upload-step-copy">
              <h2>Show the look</h2>
              <p>Clients book from the photo. Drop a file here or choose one from your device.</p>
            </div>

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
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedMedia(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    title="Remove media"
                  >
                    <IconClose size={16} />
                  </button>
                </div>
              ) : (
                <div className="dropzone-empty-state">
                  <div className="dropzone-icon-circle">
                    <IconCamera size={22} />
                  </div>
                  <h3>Drop a photo or video</h3>
                  <p>JPG, PNG, or MP4. Tap to choose a file.</p>
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
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden-file-input"
              onChange={(event) => setSelectedMedia(event.target.files?.[0] || null)}
            />

            {media && (
              <div className="upload-file-meta">
                <div>
                  <strong>{media.name}</strong>
                  <span>{formatFileSize(media.size)} · {media.type.startsWith("video/") ? "Video" : "Photo"}</span>
                </div>
                <button className="btn-ghost" type="button" onClick={() => fileInputRef.current?.click()}>
                  Change
                </button>
              </div>
            )}
          </section>
        )}

        {step === 2 && (
          <section className="upload-step-panel">
            <div className="upload-step-copy">
              <h2>Make it bookable</h2>
              <p>Name the service and set what clients will pay and how long it takes.</p>
            </div>

            <label className="studio-label upload-service-field">
              <span>Service</span>
              <input
                className="studio-input"
                value={service}
                onChange={(event) => handleServiceChange(event.target.value)}
                placeholder="Knotless braids"
                required
              />
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
              {(isSuggestingCategory || (suggestedCategory && suggestedCategory !== category)) && (
                <button
                  className="category-suggestion"
                  type="button"
                  disabled={isSuggestingCategory || !suggestedCategory}
                  onClick={() => {
                    if (!suggestedCategory) return;
                    setCategory(suggestedCategory);
                    setSuggestedCategory(null);
                  }}
                >
                  {isSuggestingCategory ? "Checking category..." : `Use ${suggestedCategory}`}
                </button>
              )}
            </div>

            <div className="upload-rate-row">
              <label className="studio-label">
                <span>Price</span>
                <div className="upload-price-field">
                  <span>R</span>
                  <input
                    className="studio-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    placeholder="850"
                    required
                  />
                </div>
              </label>
              <label className="studio-label">
                <span>Duration</span>
                <input
                  className="studio-input"
                  type="number"
                  min="15"
                  step="15"
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(event.target.value)}
                  required
                />
              </label>
            </div>

            <div className="upload-duration-chips" aria-label="Duration shortcuts">
              {DURATION_OPTIONS.map((minutes) => (
                <button
                  key={minutes}
                  className={`duration-choice ${Number(durationMinutes) === minutes ? "selected" : ""}`}
                  type="button"
                  onClick={() => setDurationMinutes(String(minutes))}
                >
                  {formatDuration(minutes)}
                </button>
              ))}
            </div>

            <label className="studio-label">
              <span>Note</span>
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="Hair type, extras, or anything clients should know"
                rows={3}
                className="studio-input studio-textarea"
              />
            </label>
          </section>
        )}

        {step === 3 && (
          <section className="upload-step-panel">
            <div className="upload-step-copy">
              <h2>Check the listing</h2>
              <p>This is how clients will see your look before you publish.</p>
            </div>

            <article className="upload-review-card">
              <div className="upload-review-media">
                {previewUrl && media?.type.startsWith("video/") ? (
                  <video src={previewUrl} controls className="studio-preview-media" />
                ) : previewUrl ? (
                  <img src={previewUrl} alt="Listing preview" className="studio-preview-media" />
                ) : null}
              </div>
              <div className="upload-review-body">
                <span className="upload-review-handle">{handle}</span>
                <h3>{service.trim() || "Untitled look"}</h3>
                {caption.trim() ? <p>{caption.trim()}</p> : <p className="upload-review-muted">No extra note added.</p>}
                <div className="upload-preview-meta">
                  <b>{category || "Category"}</b>
                  <b>{priceLabel}</b>
                  <b>{durationLabel}</b>
                </div>
                <div className="upload-review-edits">
                  <button className="btn-ghost" type="button" onClick={() => goToStep(1)}>Change look</button>
                  <button className="btn-ghost" type="button" onClick={() => goToStep(2)}>Edit details</button>
                </div>
              </div>
            </article>
          </section>
        )}

        <div className="upload-action-dock">
          {step > 1 ? (
            <button className="btn-ghost upload-clear-btn" type="button" onClick={() => goToStep((step - 1) as UploadStep)}>
              Back
            </button>
          ) : (
            <button className="btn-ghost upload-clear-btn" type="button" onClick={resetForm} disabled={!media && !service && !category && !price && !caption}>
              Clear
            </button>
          )}

          {step < 3 ? (
            <button
              className="btn-primary studio-submit-btn"
              type="submit"
              disabled={step === 1 ? !hasMedia : !hasDetails}
            >
              <span>Continue</span>
              <IconChevronRight size={16} />
            </button>
          ) : (
            <button className="btn-primary studio-submit-btn" type="submit" disabled={isSubmitting || !canPublish}>
              <IconUpload size={18} />
              <span>{isSubmitting ? "Publishing..." : "Publish listing"}</span>
            </button>
          )}
        </div>

        {message && (
          <p className="form-message form-message-error" role="status">
            {message}
          </p>
        )}
      </form>

      {showSuccessPopup && (
        <div className="success-modal-backdrop" onClick={onUploaded}>
          <div className="success-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="success-modal-icon-wrap">
              <IconCheck size={28} />
            </div>

            <div className="success-modal-text">
              <h3>Your look is live</h3>
              <p>Clients can now find this listing in the feed and send booking inquiries.</p>
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
