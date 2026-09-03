// Compact visual reel for featured community content.
import { useState } from "react";
import { IconVerified, IconClose } from "./Icons";

interface StoryItem {
  id: string;
  artist: string;
  handle: string;
  tag: string;
  avatar: string;
  image: string;
  city: string;
}

const FEATURED_STORIES: StoryItem[] = [
  {
    id: "s1",
    artist: "Naledi Hair Art",
    handle: "@naledi_braids",
    tag: "Knotless Braids",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    image: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=800&auto=format&fit=crop&q=80",
    city: "Johannesburg",
  },
  {
    id: "s2",
    artist: "Lerato Glow Studio",
    handle: "@lerato_beauty",
    tag: "Bridal Glam",
    avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80",
    image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&auto=format&fit=crop&q=80",
    city: "Cape Town",
  },
  {
    id: "s3",
    artist: "The Durban Barber",
    handle: "@durban_fadez",
    tag: "Precision Fade",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    image: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800&auto=format&fit=crop&q=80",
    city: "Durban",
  },
  {
    id: "s4",
    artist: "Pretoria Nail Bar",
    handle: "@pta_luxury_nails",
    tag: "Chrome Gel Art",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    image: "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&auto=format&fit=crop&q=80",
    city: "Pretoria",
  },
  {
    id: "s5",
    artist: "Soweto Crown Locs",
    handle: "@soweto_locs",
    tag: "Loc Styling",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80",
    image: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=800&auto=format&fit=crop&q=80",
    city: "Soweto",
  },
];

export function StoriesReel() {
  const [activeStory, setActiveStory] = useState<StoryItem | null>(null);

  return (
    <>
      <div className="stories-container">
        <div className="stories-header">
          <div className="stories-title">
            <span>Spotlight Creators</span>
          </div>
          <span className="stories-badge">SA Trends</span>
        </div>

        <div className="stories-track">
          {FEATURED_STORIES.map((story) => (
            <button
              key={story.id}
              className="story-ring-item"
              onClick={() => setActiveStory(story)}
              type="button"
            >
              <div className="story-avatar-wrap">
                <img src={story.avatar} alt={story.artist} className="story-avatar-img" />
              </div>
              <span className="story-artist-name">{story.artist.split(" ")[0]}</span>
              <span className="story-tag">{story.city}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Story Lightbox Modal */}
      {activeStory && (
        <div className="story-modal-backdrop" onClick={() => setActiveStory(null)}>
          <div className="story-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="story-modal-close"
              type="button"
              onClick={() => setActiveStory(null)}
              aria-label="Close spotlight"
            >
              <IconClose size={20} />
            </button>
            <div className="story-modal-header">
              <img src={activeStory.avatar} alt={activeStory.artist} className="story-modal-avatar" />
              <div>
                <div className="story-modal-author">
                  <strong>{activeStory.artist}</strong>
                  <IconVerified size={14} />
                </div>
                <span>{activeStory.handle} · {activeStory.city}</span>
              </div>
            </div>
            <div className="story-modal-media">
              <img src={activeStory.image} alt={activeStory.tag} />
              <div className="story-modal-overlay">
                <span className="story-modal-service">{activeStory.tag}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default StoriesReel;
