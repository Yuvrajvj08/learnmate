import math
import re
from typing import List, Tuple
from sqlalchemy.orm import Session
from app.db import models

STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both",
    "but", "by", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't",
    "doing", "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't",
    "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
    "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll",
    "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's",
    "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once",
    "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same",
    "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
    "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there",
    "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those",
    "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd",
    "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where",
    "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't",
    "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours",
    "yourself", "yourselves", "explain", "describe", "tell", "what", "how", "please"
}


def tokenize(text: str) -> List[str]:
    """Extract lowercased alphanumeric words."""
    return re.findall(r"\b[a-zA-Z0-9_]{2,}\b", text.lower())


class RetrievalService:
    """Fast lexical and keyword chunk retrieval with relevance scoring."""

    @classmethod
    def retrieve_relevant_chunks(
        cls,
        db: Session,
        material_id: str,
        query: str,
        top_k: int = 4,
        min_score_threshold: float = 0.8,
    ) -> Tuple[List[models.MaterialChunk], bool]:
        """
        Retrieve the most relevant chunks for a question.
        Returns:
            Tuple of (chunks, is_sufficient)
        """
        all_chunks = (
            db.query(models.MaterialChunk)
            .filter(models.MaterialChunk.material_id == material_id)
            .order_by(models.MaterialChunk.chunk_position)
            .all()
        )

        if not all_chunks:
            return [], False

        query_tokens = [t for t in tokenize(query) if t not in STOPWORDS]
        if not query_tokens:
            query_tokens = tokenize(query)

        scored_chunks: List[Tuple[float, models.MaterialChunk]] = []
        normalized_query = query.lower().strip()

        for chunk in all_chunks:
            content_lower = chunk.content.lower()
            chunk_tokens = tokenize(chunk.content)
            if not chunk_tokens:
                continue

            score = 0.0

            # 1. Exact phrase match bonus
            if len(normalized_query) > 5 and normalized_query in content_lower:
                score += 10.0

            # 2. Token overlap & frequency
            token_count = len(chunk_tokens)
            matched_keywords = set()

            for q_tok in query_tokens:
                matches = content_lower.count(q_tok)
                if matches > 0:
                    matched_keywords.add(q_tok)
                    # TF term with dampening
                    score += (1.0 + math.log(matches)) * 2.0

            # 3. Keyword diversity bonus (if multiple keywords matched)
            if len(query_tokens) > 1:
                coverage_ratio = len(matched_keywords) / len(query_tokens)
                score *= (1.0 + coverage_ratio)

            if score > 0:
                scored_chunks.append((score, chunk))

        # Sort descending by score
        scored_chunks.sort(key=lambda x: x[0], reverse=True)

        # If no keywords matched at all
        if not scored_chunks:
            # If the material is very short (e.g. 1-2 chunks), still return them for context, but mark evidence check
            if len(all_chunks) <= 2:
                return all_chunks, False
            return [], False

        top_score = scored_chunks[0][0]
        selected_chunks = [chunk for score, chunk in scored_chunks[:top_k]]
        is_sufficient = top_score >= min_score_threshold

        return selected_chunks, is_sufficient
