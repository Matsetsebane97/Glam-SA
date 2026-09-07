# Glam Assistant API Reference

## Core Functions

### `parseQuestion(question: string, synonyms?: Record<string, string[]>): ParsedQuestion`

Parses a user query into structured components.

**Parameters:**
- `question` - User's natural language query
- `synonyms` (optional) - Synonym map from backend for extended matching

**Returns:**
```typescript
{
  category?: string;           // "Hair", "Nails", "Makeup", etc.
  location?: string;           // "Sandton", "Johannesburg", etc.
  maxPrice?: number;           // Budget limit
  searchTerms: string[];       // Remaining keywords after parsing
  wantsNearby: boolean;        // True if "near me" detected
  preferredWeekday?: number;   // 0-6 for Mon-Sun
  preferredDateLabel?: string; // "Monday", "Friday", etc.
}
```

**Example:**
```typescript
const parsed = parseQuestion("Hair near me under R500 on Friday");
// Returns:
// {
//   category: "Hair",
//   location: undefined,
//   maxPrice: 500,
//   searchTerms: [],
//   wantsNearby: true,
//   preferredWeekday: 5,
//   preferredDateLabel: "Friday"
// }
```

---

### `matchesQuestion(post: Post, parsed: ParsedQuestion, synonyms?: Record<string, string[]>): boolean`

Checks if a post matches the parsed question criteria.

**Parameters:**
- `post` - Post object to evaluate
- `parsed` - ParsedQuestion from `parseQuestion()`
- `synonyms` (optional) - Synonym map for extended matching

**Returns:** Boolean - true if post matches all criteria

**Matching Logic:**
1. Category must match (or be undefined)
2. Location must be subset of post location (or be undefined)
3. Price must be ≤ maxPrice (or maxPrice undefined)
4. All search terms must appear somewhere in post content

---

### `answerQuestion(question, posts, currentUser, synonyms?): Promise<Answer>`

Main AI function - processes query and returns results with smart suggestions.

**Parameters:**
- `question` - User query string
- `posts` - Array of all available posts
- `currentUser` - Current user object (needed for location-based searches)
- `synonyms` (optional) - Synonym map from backend

**Returns:**
```typescript
Promise<{
  text: string;                  // Assistant response text
  matches?: ArtistMatch[];       // Up to 3 matching artists
  quickReplies?: string[];       // Suggested follow-up queries
  fullResultCount?: number;      // Total matches if > 3
  fullResultQuery?: string;      // Original query for "View All"
}>
```

**Example:**
```typescript
const answer = await answerQuestion(
  "Hair near me",
  allPosts,
  currentUser,
  synonyms
);

// Returns:
// {
//   text: "Here are 3 nearby artists within 50 km.",
//   matches: [
//     { id: "owner-42", name: "Sarah", service: "Braids", ... },
//     { id: "owner-51", name: "Naledi", service: "Locs", ... },
//     { id: "owner-18", name: "Thabo", service: "Waves", ... }
//   ],
//   quickReplies: ["Hair under R300", "Show Hair in Sandton"],
//   fullResultCount: 12,
//   fullResultQuery: "Hair near me"
// }
```

---

### `getSessionContext(): SessionContext`

Retrieves the current session context from localStorage.

**Returns:**
```typescript
{
  lastCategory?: string;        // Last category searched
  lastLocation?: string;        // Last location searched
  lastMaxPrice?: number;        // Last budget limit
  queryCount: number;           // Total queries in session
  noResultsCount: number;       // How many queries returned 0 results
}
```

---

### `updateSessionContext(updates: Partial<SessionContext>): void`

Updates session context in localStorage. Called automatically by `answerQuestion()`.

**Parameters:**
- `updates` - Partial SessionContext object with fields to update

**Example:**
```typescript
updateSessionContext({
  lastCategory: "Hair",
  lastMaxPrice: 500
});
// Automatically increments queryCount
```

---

### `applySessionContextToQuery(question: string, context: SessionContext): string`

Detects multi-turn refinements and expands them with session context.

**Parameters:**
- `question` - User query (e.g., "cheaper")
- `context` - SessionContext from `getSessionContext()`

**Returns:** Expanded query string (e.g., "Hair under R300")

**Supported Refinements:**

| Pattern | Result |
|---------|--------|
| "cheaper" / "less expensive" | `{lastCategory} under R{lastPrice - 200}` |
| "more expensive" / "higher budget" | `{lastCategory} under R{lastPrice + 500}` |
| "different location" + location | `{lastCategory} in {location}` |
| "another area" + location | `{lastCategory} in {location}` |

**Example:**
```typescript
const context = {
  lastCategory: "Hair",
  lastMaxPrice: 500,
  queryCount: 3,
  noResultsCount: 0
};

const expanded = applySessionContextToQuery("cheaper", context);
// Returns: "Hair under R300"

const expanded2 = applySessionContextToQuery("in Sandton", context);
// Returns: "Hair in Sandton"
```

---

### `generateSmartQuickReplies(parsed: ParsedQuestion, resultCount: number, context: SessionContext): string[]`

Generates context-aware quick-reply suggestions.

**Parameters:**
- `parsed` - ParsedQuestion from `parseQuestion()`
- `resultCount` - Number of results found
- `context` - SessionContext from `getSessionContext()`

**Returns:** Array of 1-3 suggested queries

**Logic:**

**When no results (resultCount === 0):**
- Suggest higher budget: `"Hair under R1000"`
- Suggest fallback: `"Browse the full feed"`
- Suggest alternative: `"Hair anywhere"` (if location search failed)

**When results found (resultCount > 0):**
- Suggest cheaper option: `"Hair under R300"` (if budget not specified)
- Suggest nearby: `"Show Hair near me"` (if not a nearby search)
- Suggest related: `"Try Barbering"` (if Hair category)
- Fallback: `"Browse the full feed"`

**Example:**
```typescript
const replies = generateSmartQuickReplies(
  { category: "Hair", location: undefined, maxPrice: 500, ... },
  12,  // 12 results found
  { lastCategory: "Hair", lastMaxPrice: 500, ... }
);
// Returns: ["Hair under R300", "Show Hair near me", "Try Barbering"]
```

---

## Type Definitions

### `ArtistMatch`
```typescript
{
  id: string;                    // Unique identifier
  ownerId?: number;              // User ID (if available)
  postId?: number;               // Post ID for booking
  name: string;                  // Artist name
  handle: string;                // @handle
  service?: string;              // "Braids", "Nails", etc.
  category?: string;             // "Hair", "Nails", etc.
  location?: string;             // City/area
  whatsappNumber?: string;       // For direct messaging
  distanceKm?: number;           // Distance from user
  minPrice?: number;             // Lowest service price
  maxPrice?: number;             // Highest service price
  resultCount: number;           // Posts by this artist
  preferredWeekday?: number;     // User's preferred day
  preferredDateLabel?: string;   // "Friday", "Saturday"
}
```

### `ParsedQuestion`
```typescript
{
  category?: string;             // "Hair", "Nails", "Makeup", etc.
  location?: string;             // Location term
  maxPrice?: number;             // Budget limit
  searchTerms: string[];         // Remaining keywords
  wantsNearby: boolean;          // "Near me" detected?
  preferredWeekday?: number;     // 0-6 (Sun-Sat)
  preferredDateLabel?: string;   // Day name
}
```

### `SessionContext`
```typescript
{
  lastCategory?: string;         // Last category searched
  lastLocation?: string;         // Last location searched
  lastMaxPrice?: number;         // Last price limit
  queryCount: number;            // Total queries in session
  noResultsCount: number;        // Zero-result queries
}
```

### `ChatMessage`
```typescript
{
  id: number;                    // Unique message ID
  author: "assistant" | "user";  // Message sender
  text: string;                  // Message content
  matches?: ArtistMatch[];       // Artist results
  quickReplies?: string[];       // Suggested follow-ups
  fullResultCount?: number;      // Total matches if > 3
  fullResultQuery?: string;      // Original query for "View All"
}
```

---

## Usage in Components

### AssistantPanel Integration

```typescript
import {
  answerQuestion,
  applySessionContextToQuery,
  getSessionContext,
  type ChatMessage
} from "../utils/assistantLogic";
import { getSearchSynonyms } from "../api";

function AssistantPanel() {
  const [synonyms, setSynonyms] = useState<Record<string, string[]> | undefined>();

  // Load synonyms on mount
  useEffect(() => {
    void getSearchSynonyms()
      .then(setSynonyms)
      .catch(() => {}); // Silently fail
  }, []);

  const ask = async (question: string) => {
    // Get session context for multi-turn refinements
    const sessionContext = getSessionContext();
    const expandedQuestion = applySessionContextToQuery(question, sessionContext);

    // Get answer with all improvements
    const answer = await answerQuestion(
      expandedQuestion,
      posts,
      currentUser,
      synonyms  // Optional, enables synonym matching
    );

    // Process answer (render messages, quick-replies, etc.)
    displayAnswer(answer);
  };
}
```

---

## Backend Integration

### Fetching Synonyms

**Endpoint:** `GET /api/search-synonyms/`

**Response:**
```json
{
  "synonyms": [
    {
      "term": "haircut",
      "synonyms": ["hairstyle", "trim", "cut"]
    },
    {
      "term": "blowout",
      "synonyms": ["blow dry", "dry bar", "styling"]
    }
  ]
}
```

### Creating Synonyms (Admin)

```bash
# Django shell
python manage.py shell

from api.models import SearchSynonym

SearchSynonym.objects.create(
    term="haircut",
    synonyms=["hairstyle", "trim", "cut"]
)

SearchSynonym.objects.create(
    term="manicure",
    synonyms=["nails", "nail art", "nail polish"]
)
```

---

## Performance Considerations

### Optimization Tips

1. **Synonyms Caching**: AssistantPanel caches synonyms on mount - only one fetch per session
2. **Fuzzy Matching**: Uses edit distance capped at 2 for performance
3. **Session Storage**: LocalStorage is fast, no network overhead
4. **Post Filtering**: Runs client-side only on loaded posts (pagination not implemented)

### Known Limitations

- Fuzzy matching can be slow with thousands of synonyms (currently O(n²) in worst case)
- Session context persists per-device/browser only
- All filtering happens client-side (not backend)
- Synonym fetches don't provide type hints for new terms

---

## Troubleshooting

### No Results When Synonyms Are Added

**Issue**: Added synonym via admin but searches don't match

**Solutions:**
1. Clear browser localStorage: `localStorage.removeItem('glamAssistantSessionContext')`
2. Hard refresh (Ctrl+Shift+R) to bust frontend cache
3. Verify `SearchSynonym` record was created: `python manage.py shell` → `SearchSynonym.objects.all()`
4. Check `/api/search-synonyms/` endpoint returns data

### Session Context Not Persisting

**Issue**: Multi-turn refinements don't remember previous searches

**Solutions:**
1. Check browser allows localStorage (not in private/incognito mode)
2. Verify storage quota isn't full
3. Check localStorage in DevTools: `Storage > Local Storage > <domain>`
4. Manually trigger: `localStorage.setItem('glamAssistantSessionContext', JSON.stringify({...}))`

### Fuzzy Matching Too Loose/Strict

**Issue**: Matching "hair" to unrelated terms or not matching close typos

**Solutions:**
- Adjust edit distance in `isFuzzyMatch()` function
- Add explicit aliases in `categoryAliases` constant
- Use SearchSynonym for domain-specific mappings

---

## Future Enhancement Hooks

These functions are designed to be extensible:

- `parseQuestion()` can be enhanced to detect intent beyond simple keywords
- `generateSmartQuickReplies()` can incorporate user history and booking data
- `applySessionContextToQuery()` can be expanded with more refinement patterns
- A backend LLM could replace the NLP logic while maintaining the same interface
