import { useState } from "react";
import { IconClose, IconMessage, IconSend } from "./Icons";
import type { Post } from "../types";

type AssistantPanelProps = {
  posts: Post[];
  onNavigate: (path: string) => void;
};

type ChatMessage = {
  id: number;
  author: "assistant" | "user";
  text: string;
};

const categoryAliases: Record<string, string> = {
  braid: "Hair",
  braids: "Hair",
  hair: "Hair",
  nail: "Nails",
  nails: "Nails",
  manicure: "Nails",
  pedicure: "Nails",
  barber: "Barbering",
  barbers: "Barbering",
  barbering: "Barbering",
  makeup: "Makeup",
  facial: "Skincare",
  skincare: "Skincare",
  tattoo: "Tattoos",
  tattoos: "Tattoos",
};

function answerQuestion(question: string, posts: Post[]) {
  const normalizedQuestion = question.toLowerCase();
  const categoryToken = normalizedQuestion.match(/\b(braids?|hair|nails?|manicure|pedicure|barber(?:ing|s)?|makeup|facials?|skincare|tattoos?)\b/);
  const priceMatch = normalizedQuestion.match(/(?:under|below|less than)\s*r?\s*(\d+(?:\.\d+)?)/);
  const locationMatch = normalizedQuestion.match(/\bnear\s+([a-z][a-z\s-]*?)(?=\s+(?:under|below|less than)\b|$)/);
  const category = categoryToken ? categoryAliases[categoryToken[1]] : undefined;
  const location = locationMatch?.[1].trim();
  const maxPrice = priceMatch ? Number(priceMatch[1]) : undefined;
  const matchingPosts = posts.filter((post) => {
    const matchesCategory = !category || post.category.toLowerCase() === category.toLowerCase();
    const matchesLocation = !location || post.location.toLowerCase().includes(location);
    const matchesPrice = maxPrice == null || Number(post.price) <= maxPrice;
    return matchesCategory && matchesLocation && matchesPrice;
  });

  if (matchingPosts.length === 0) {
    return "I could not find a matching look yet. Try a broader location, category, or budget.";
  }

  const matches = matchingPosts.slice(0, 3).map((post) => `${post.service} by ${post.creator} (R${post.price})`).join("; ");
  const suffix = matchingPosts.length > 3 ? ` I found ${matchingPosts.length} in total.` : "";
  return `Here are some matches: ${matches}.${suffix}`;
}

function AssistantPanel({ posts, onNavigate }: AssistantPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, author: "assistant", text: "Hi, I can help you find beauty services by category, location, or budget." },
  ]);

  const ask = () => {
    const question = draft.trim();
    if (!question) return;
    setMessages((currentMessages) => [
      ...currentMessages,
      { id: Date.now(), author: "user", text: question },
      { id: Date.now() + 1, author: "assistant", text: answerQuestion(question, posts) },
    ]);
    setDraft("");
  };

  return (
    <div className="assistant-widget">
      {isOpen && (
        <section className="assistant-panel" aria-label="Glam SA assistant">
          <header className="assistant-header">
            <div>
              <strong>Glam SA assistant</strong>
              <span>Discovery help</span>
            </div>
            <button className="icon-btn" type="button" onClick={() => setIsOpen(false)} aria-label="Close assistant">
              <IconClose size={16} />
            </button>
          </header>
          <div className="assistant-messages" aria-live="polite">
            {messages.map((message) => (
              <div className={`assistant-message ${message.author}`} key={message.id}>
                {message.text}
              </div>
            ))}
          </div>
          <form className="assistant-compose" onSubmit={(event) => { event.preventDefault(); ask(); }}>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Try: makeup near Sandton under R800"
              aria-label="Ask Glam SA assistant"
            />
            <button className="icon-btn" type="submit" disabled={!draft.trim()} aria-label="Send question">
              <IconSend size={16} />
            </button>
          </form>
          <button className="assistant-feed-link" type="button" onClick={() => { setIsOpen(false); onNavigate("/"); }}>
            Browse the full feed
          </button>
        </section>
      )}
      {!isOpen && (
        <button className="assistant-launcher" type="button" onClick={() => setIsOpen(true)} aria-label="Open Glam SA assistant">
          <IconMessage size={19} />
          <span>Ask Glam</span>
        </button>
      )}
    </div>
  );
}

export default AssistantPanel;
