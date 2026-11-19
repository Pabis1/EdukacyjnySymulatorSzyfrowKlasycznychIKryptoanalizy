"""Character trigram language models trained on NLTK corpora, used to rank cryptanalysis candidates."""

import math
from collections import Counter
from dataclasses import dataclass

from ..languages import LANGUAGES, Language

NLTK_CORPUS = "udhr2"

# Every character is mapped to one of: a letter of the language alphabet, 'FOREIGN_LETTER' for any other
# letter (e.g. 'á' in Spanish or 'ł' scored as English), or 'SEPARATOR' for everything else.
# Keeping foreign letters as a token (instead of dropping them) means a language cannot look more likely
# just because it ignores the letters it does not know.
FOREIGN_LETTER = "#"
SEPARATOR = " "

# Interpolation weights for trigram, bigram and unigram estimates.
_WEIGHTS = (0.6, 0.3, 0.1)


def normalize(text: str, alphabet: str) -> str:
    """Maps 'text' to the model vocabulary: uppercase alphabet letters, 'FOREIGN_LETTER' and single separators."""
    letters = set(alphabet)
    tokens = [SEPARATOR]
    for char in text:
        upper = char.upper()
        if upper in letters:
            tokens.append(upper)
        elif char.isalpha():
            tokens.append(FOREIGN_LETTER)
        elif tokens[-1] != SEPARATOR:
            tokens.append(SEPARATOR)
    if tokens[-1] != SEPARATOR:
        tokens.append(SEPARATOR)
    return "".join(tokens)


@dataclass(frozen=True)
class CharTrigramModel:
    alphabet: str
    log_probs: dict[str, float]  # trigram 'abc' -> log P(c | ab)

    @classmethod
    def train(cls, corpus: str, alphabet: str) -> CharTrigramModel:
        text = normalize(corpus, alphabet)
        vocab = [*alphabet, FOREIGN_LETTER, SEPARATOR]

        unigrams = Counter(text)
        bigrams = Counter(text[i : i + 2] for i in range(len(text) - 1))
        trigrams = Counter(text[i : i + 3] for i in range(len(text) - 2))
        total = len(text)

        # Context counts: how often a unigram / bigram is followed by any character.
        bigram_contexts = Counter(text[i] for i in range(len(text) - 1))
        trigram_contexts = Counter(text[i : i + 2] for i in range(len(text) - 2))

        w3, w2, w1 = _WEIGHTS
        log_probs = {}
        # The vocabulary is small (at most a few dozen symbols), so the full table is precomputed once.
        for a in vocab:
            for b in vocab:
                ab = a + b
                for c in vocab:
                    # Add-one smoothing keeps unseen characters possible but unlikely.
                    p1 = (unigrams[c] + 1) / (total + len(vocab))
                    p2 = bigrams[b + c] / bigram_contexts[b] if bigram_contexts[b] else p1
                    p3 = trigrams[ab + c] / trigram_contexts[ab] if trigram_contexts[ab] else p2
                    log_probs[ab + c] = math.log(w3 * p3 + w2 * p2 + w1 * p1)
        return cls(alphabet=alphabet, log_probs=log_probs)

    def log_likelihood(self, text: str) -> float:
        """Total natural-log probability of 'text' (the separator padding on both ends is included)."""
        tokens = SEPARATOR + normalize(text, self.alphabet)
        return sum(self.log_probs[tokens[i : i + 3]] for i in range(len(tokens) - 2))


def load_corpus(language: Language) -> str:
    """Reads the language's training text from NLTK, downloading the corpus on first use if it is missing."""
    import nltk
    from nltk.corpus import udhr2

    try:
        nltk.data.find(f"corpora/{NLTK_CORPUS}")
    except LookupError:
        if not nltk.download(NLTK_CORPUS, quiet=True):
            raise RuntimeError(
                f"NLTK corpus '{NLTK_CORPUS}' is missing and could not be downloaded. "
                f"Run 'python -m nltk.downloader {NLTK_CORPUS}'."
            ) from None
    return udhr2.raw(language.corpus_fileid)


def train_language_models() -> dict[str, CharTrigramModel]:
    """Trains one model per configured language. Meant to be called once and cached (see the backend)."""
    return {code: CharTrigramModel.train(load_corpus(lang), lang.alphabet) for code, lang in LANGUAGES.items()}
