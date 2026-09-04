import { useEffect, useState } from "react";
import { deletePost, getMyPosts, getUserProfile, updatePost } from "../api";
import { IconClose, IconEdit, IconGrid, IconPin, IconTrash, IconUpload, IconVerified } from "../components/Icons";
import type { CurrentUser, Post } from "../types";

type ProfilePageProps = {
  profileId?: number;
  currentUser: CurrentUser | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
};

type EditDraft = {
  service: string;
  caption: string;
  location: string;
};

function ProfilePage({ profileId, currentUser, onNavigate, onLogout }: ProfilePageProps) {
  const isOwnProfile = profileId == null;
  const canManageProfile = Boolean(currentUser && (isOwnProfile || profileId === currentUser.id));
  const [profile, setProfile] = useState<CurrentUser | null>(isOwnProfile ? currentUser : null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<EditDraft>({ service: "", caption: "", location: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [viewingPost, setViewingPost] = useState<Post | null>(null);

  // The owner endpoint supports editing; public profiles only need read-only data.
  useEffect(() => {
    setIsLoading(true);
    setError("");
    if (isOwnProfile) {
      setProfile(currentUser);
      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      void getMyPosts()
        .then(setPosts)
        .catch(() => setError("We could not load your work right now."))
        .finally(() => setIsLoading(false));
      return;
    }

    void getUserProfile(profileId)
      .then((nextProfile) => {
        setProfile(nextProfile);
        setPosts(nextProfile.posts);
      })
      .catch(() => setError("We could not load this profile right now."))
      .finally(() => setIsLoading(false));
  }, [currentUser, isOwnProfile, profileId]);

  const beginEditing = (post: Post) => {
    setEditingId(post.id);
    setDraft({ service: post.service, caption: post.caption, location: post.location });
    setError("");
  };

  const saveEdit = async (postId: number) => {
    if (!draft.service.trim()) {
      setError("Add a category before saving this look.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const updatedPost = await updatePost(postId, {
        service: draft.service.trim(),
        caption: draft.caption.trim(),
        location: draft.location.trim(),
      });
      setPosts((currentPosts) =>
        currentPosts.map((post) => (post.id === postId ? updatedPost : post)),
      );
      setEditingId(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save your changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const removePost = async (postId: number) => {
    if (!window.confirm("Delete this look from your portfolio? This cannot be undone.")) {
      return;
    }

    setDeletingId(postId);
    setError("");
    try {
      await deletePost(postId);
      setPosts((currentPosts) => currentPosts.filter((post) => post.id !== postId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete this look.");
    } finally {
      setDeletingId(null);
    }
  };

  // Let visitors dismiss the lightbox without reaching for the close button.
  useEffect(() => {
    if (!viewingPost) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewingPost(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewingPost]);

  if (isOwnProfile && !profile) {
    return (
      <section className="page-content profile-page">
        <div className="profile-login-state">
          <IconGrid size={34} />
          <h1>Your creator profile</h1>
          <p>Sign in to view and manage the looks you have shared with Glam SA.</p>
          <button className="btn-primary" type="button" onClick={() => onNavigate("/login")}>
            Sign in to continue
          </button>
        </div>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="page-content profile-page">
        <div className="empty-state"><p>Loading profile...</p></div>
      </section>
    );
  }

  return (
    <section className="page-content profile-page">
      <header className="profile-hero">
        <div className="profile-hero-avatar">
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <div className="profile-hero-copy">
          <div className="eyebrow"><IconVerified size={13} /> Creator profile</div>
          <h1>{profile.name}</h1>
          <p className="profile-hero-handle">{profile.handle}</p>
          {profile.locationLabel && (
            <p className="profile-hero-location">
              <IconPin size={14} /> {profile.locationLabel}
            </p>
          )}
        </div>
        {canManageProfile && (
          <div className="profile-hero-actions">
            <button className="btn-primary" type="button" onClick={() => onNavigate("/upload")}>
              <IconUpload size={17} /> Share a look
            </button>
            <button className="btn-ghost profile-logout-btn" type="button" onClick={onLogout}>
              Log out
            </button>
          </div>
        )}
      </header>

      <div className="profile-work-heading">
        <div>
          <div className="eyebrow"><IconGrid size={13} /> Portfolio</div>
          <h2>{isOwnProfile ? "Your work" : `${profile.name}'s work`}</h2>
        </div>
        <span className="profile-work-count">
          {posts.length} {posts.length === 1 ? "look" : "looks"}
        </span>
      </div>

      {error && <div className="profile-error" role="alert">{error}</div>}
      {isLoading && <div className="empty-state"><p>Loading your portfolio...</p></div>}
      {!isLoading && posts.length === 0 && (
        <div className="empty-state">
          <IconGrid size={32} />
          <h3>{isOwnProfile ? "Your portfolio is ready for its first look" : "This portfolio is waiting for its first look"}</h3>
          <p>{isOwnProfile ? "Share your latest hair, makeup, nail, or barbering work." : "There is no public work to show yet."}</p>
          {canManageProfile && (
            <button className="btn-primary" type="button" onClick={() => onNavigate("/upload")}>
              <IconUpload size={17} /> Share your first look
            </button>
          )}
        </div>
      )}

      {!isLoading && posts.length > 0 && (
        <div className="profile-work-grid">
          {posts.map((post) => (
            <article className={`profile-work-card${canManageProfile ? " is-manageable" : ""}`} key={post.id}>
              <div className="profile-work-media">
                {post.mediaUrl && post.mediaType.startsWith("video/") ? (
                  <video src={post.mediaUrl} controls preload="metadata" aria-label={post.service} />
                ) : post.mediaUrl || post.imageUrl ? (
                  <button
                    className="profile-image-viewer"
                    type="button"
                    onClick={() => setViewingPost(post)}
                    aria-label={`View ${post.service} image larger`}
                  >
                    <img src={post.mediaUrl || post.imageUrl} alt={post.service} loading="lazy" />
                    <span className="profile-image-viewer-label">View image</span>
                  </button>
                ) : (
                  <div className="media-placeholder"><span>{post.service}</span></div>
                )}
                <div className="profile-work-media-topline">
                  <span className="profile-work-media-label">Portfolio look</span>
                  {post.mediaType.startsWith("video/") && <span className="profile-work-media-label">Video</span>}
                </div>
                <span className="media-service-badge">{post.service}</span>
              </div>

              {editingId === post.id ? (
                <div className="profile-edit-form">
                  <label>
                    Category
                    <input value={draft.service} onChange={(event) => setDraft({ ...draft, service: event.target.value })} />
                  </label>
                  <label>
                    Location
                    <input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} />
                  </label>
                  <label>
                    Caption
                    <textarea rows={3} value={draft.caption} onChange={(event) => setDraft({ ...draft, caption: event.target.value })} />
                  </label>
                  <div className="profile-edit-actions">
                    <button className="btn-primary" type="button" disabled={isSaving} onClick={() => void saveEdit(post.id)}>
                      {isSaving ? "Saving..." : "Save changes"}
                    </button>
                    <button className="btn-ghost" type="button" disabled={isSaving} onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="profile-work-details">
                  <div className="profile-work-title-row">
                    <div>
                      <span className="profile-work-kicker">Featured work</span>
                      <h3>{post.service}</h3>
                    </div>
                    <time dateTime={post.createdAt}>
                      {new Date(post.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                    </time>
                  </div>
                  {post.location && <p className="profile-work-location"><IconPin size={13} /> {post.location}</p>}
                  {post.caption && <p className="profile-work-caption">{post.caption}</p>}

                  {/* Editing and deletion are intentionally unavailable on public profiles. */}
                  {canManageProfile && (
                    <div className="profile-work-actions">
                      <button className="btn-outline-sm" type="button" onClick={() => beginEditing(post)}>
                        <IconEdit size={14} /> Edit
                      </button>
                      <button className="btn-outline-sm danger-action" type="button" disabled={deletingId === post.id} onClick={() => void removePost(post.id)}>
                        <IconTrash size={14} /> {deletingId === post.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {viewingPost && (viewingPost.mediaUrl || viewingPost.imageUrl) && (
        <div className="portfolio-lightbox" role="dialog" aria-modal="true" aria-label={`${viewingPost.service} portfolio image`} onClick={() => setViewingPost(null)}>
          <button className="portfolio-lightbox-close" type="button" onClick={() => setViewingPost(null)} aria-label="Close image viewer">
            <IconClose size={22} />
          </button>
          <figure className="portfolio-lightbox-content" onClick={(event) => event.stopPropagation()}>
            <img src={viewingPost.mediaUrl || viewingPost.imageUrl} alt={viewingPost.service} />
            <figcaption>
              <strong>{viewingPost.service}</strong>
              {viewingPost.caption && <span>{viewingPost.caption}</span>}
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}

export default ProfilePage;