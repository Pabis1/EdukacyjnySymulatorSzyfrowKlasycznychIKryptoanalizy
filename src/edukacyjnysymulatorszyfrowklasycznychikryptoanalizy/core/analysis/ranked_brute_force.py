import math
from dataclasses import dataclass

from ..ciphers.caesar import CaesarCipher
from .caesar_brute_force import caesar_brute_force
from .language_model import CharTrigramModel


@dataclass(frozen=True)
class RankedCandidate:
    shift: int
    text: str
    log_likelihood: float
    probability: float


def rank_caesar_candidates(ciphertext: str, cipher: CaesarCipher, model: CharTrigramModel) -> list[RankedCandidate]:
    """
    Brute forces a Caesar ciphertext and ranks the candidates from most to least likely plaintext.

    'cipher' and 'model' must use the same language. 'probability' is the posterior over all shifts,
    assuming every shift is equally likely a priori, so the probabilities sum to 1.
    """
    if cipher.alphabet != model.alphabet:
        raise ValueError("Cipher and language model must use the same alphabet.")

    scored = [
        (shift, text, model.log_likelihood(text))
        for shift, text in caesar_brute_force(ciphertext, cipher_instance=cipher).items()
    ]
    if not scored:
        return []

    # Softmax over log-likelihoods, shifted by the maximum for numerical stability.
    best = max(ll for *_, ll in scored)
    weights = [math.exp(ll - best) for *_, ll in scored]
    total = sum(weights)

    ranked = [
        RankedCandidate(shift=shift, text=text, log_likelihood=ll, probability=weight / total)
        for (shift, text, ll), weight in zip(scored, weights, strict=True)
    ]
    # Ties (e.g. a ciphertext without letters) keep the shift order thanks to the stable sort.
    ranked.sort(key=lambda c: c.log_likelihood, reverse=True)
    return ranked
