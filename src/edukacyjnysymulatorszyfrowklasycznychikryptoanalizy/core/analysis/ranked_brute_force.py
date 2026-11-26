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


@dataclass(frozen=True)
class CaesarRanking:
    candidates: list[RankedCandidate]
    # Probability that no shift yields natural language, i.e. the text is not a Caesar ciphertext
    # (e.g. Vigenère, Playfair or random letters).
    not_caesar_probability: float
    not_caesar_log_likelihood: float


def not_caesar_log_likelihood(text: str, model: CharTrigramModel) -> float:
    """
    Log-likelihood of 'text' under the "not Caesar" hypothesis: every symbol is drawn uniformly at random.

    It scores the same positions as 'CharTrigramModel.log_likelihood', so the two are directly comparable.
    """
    return model.scored_positions(text) * -math.log(model.vocab_size)


def rank_caesar_candidates(ciphertext: str, cipher: CaesarCipher, model: CharTrigramModel) -> CaesarRanking:
    """
    Brute forces a Caesar ciphertext and ranks the candidates from most to least likely plaintext.

    'cipher' and 'model' must use the same language. Besides one hypothesis per shift, the softmax includes
    a "not Caesar" hypothesis (uniformly random symbols). Without it the softmax always gives ~100% to some
    shift, even for gibberish, because it has to pick one of them. All the probabilities sum to 1, with every
    hypothesis assumed equally likely a priori.
    """
    if cipher.alphabet != model.alphabet:
        raise ValueError("Cipher and language model must use the same alphabet.")

    scored = [
        (shift, text, model.log_likelihood(text))
        for shift, text in caesar_brute_force(ciphertext, cipher_instance=cipher).items()
    ]
    null_ll = not_caesar_log_likelihood(ciphertext, model)

    # Softmax over log-likelihoods, shifted by the maximum for numerical stability.
    best = max([null_ll, *(ll for *_, ll in scored)])
    weights = [math.exp(ll - best) for *_, ll in scored]
    null_weight = math.exp(null_ll - best)
    total = sum(weights) + null_weight

    ranked = [
        RankedCandidate(shift=shift, text=text, log_likelihood=ll, probability=weight / total)
        for (shift, text, ll), weight in zip(scored, weights, strict=True)
    ]
    # Ties (e.g. a ciphertext without letters) keep the shift order thanks to the stable sort.
    ranked.sort(key=lambda c: c.log_likelihood, reverse=True)
    return CaesarRanking(
        candidates=ranked,
        not_caesar_probability=null_weight / total,
        not_caesar_log_likelihood=null_ll,
    )
