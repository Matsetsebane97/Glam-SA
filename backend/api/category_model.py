import math
import re
from collections import Counter


TRAINING_EXAMPLES = {
    "Hair": (
        "braids knotless braids box braids cornrows hair extensions weave wig install wash cut blowout silk press relaxer dreadlocks locs twists"
    ),
    "Nails": (
        "gel nails acrylic manicure pedicure nail art tips polish french tips builder gel extensions"
    ),
    "Barbering": (
        "barber fade haircut trim beard lineup shape up shave taper men's cut"
    ),
    "Makeup": (
        "makeup glam bridal makeup natural makeup soft glam lashes foundation contour wedding face beat"
    ),
    "Skincare": (
        "facial skincare acne treatment cleanser massage exfoliation peel moisturising wax threading"
    ),
    "Tattoos": (
        "tattoo ink fine line sleeve piercing floral tattoo lettering realism tattoo design"
    ),
}


def _tokens(text):
    return re.findall(r"[a-z0-9]+", text.lower())


class CategoryClassifier:
    def __init__(self):
        self.category_token_counts = {}
        self.category_totals = {}
        self.vocabulary = set()
        self.category_count = len(TRAINING_EXAMPLES)

        for category, examples in TRAINING_EXAMPLES.items():
            token_counts = Counter(_tokens(examples))
            self.category_token_counts[category] = token_counts
            self.category_totals[category] = sum(token_counts.values())
            self.vocabulary.update(token_counts)

    def predict(self, text):
        tokens = _tokens(text)
        if not tokens:
            return None, 0.0

        vocabulary_size = len(self.vocabulary)
        scores = {}
        for category, token_counts in self.category_token_counts.items():
            score = math.log(1 / self.category_count)
            denominator = self.category_totals[category] + vocabulary_size
            for token in tokens:
                score += math.log((token_counts[token] + 1) / denominator)
            scores[category] = score

        ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
        best_category, best_score = ranked[0]
        second_score = ranked[1][1]
        confidence = 1 / (1 + math.exp(min(0, second_score - best_score)))
        return best_category, round(confidence, 2)


classifier = CategoryClassifier()
