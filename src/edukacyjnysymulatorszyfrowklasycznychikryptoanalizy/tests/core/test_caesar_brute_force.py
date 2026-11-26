import math

import pytest

from core import (
    CaesarCipher,
    CharTrigramModel,
    caesar_brute_force,
    get_language,
    rank_caesar_candidates,
)
from core.analysis import not_caesar_log_likelihood
from core.analysis.language_model import normalize


def test_brute_force_generates_all_keys():
    cipher = CaesarCipher()
    encrypted = cipher.encrypt("TAJNE", shift=5).final_text
    results = caesar_brute_force(encrypted)

    assert len(results) == 31
    assert results[5] == "TAJNE"


def test_brute_force_recovers_negative_shift():
    cipher = CaesarCipher()
    encrypted = cipher.encrypt("Tajna Wiadomość", shift=-3).final_text
    results = caesar_brute_force(encrypted)

    # Przesunięcie -3 w 32-literowym alfabecie odpowiada kluczowi +29
    assert results[29] == "Tajna Wiadomość"


def test_brute_force_ignores_punctuation_and_preserves_case():
    cipher = CaesarCipher()
    encrypted = cipher.encrypt("Aą B! 123", shift=1).final_text
    results = caesar_brute_force(encrypted)

    assert results[1] == "Aą B! 123"
    assert " " in results[15]
    assert "!" in results[15]
    assert "123" in results[15]


@pytest.mark.parametrize(
    ("lang_code", "plaintext", "expected_candidates"),
    [
        ("pl", "Zażółć gęślą jaźń", 31),
        ("en", "Attack at dawn", 25),
        ("de", "Pünktlich um zwölf", 28),
        ("es", "Mañana por la tarde", 26),
        ("el", "Καλημέρα κόσμε", 23),
    ],
)
def test_brute_force_supports_all_configured_languages(lang_code, plaintext, expected_candidates):
    alphabet = get_language(lang_code).alphabet
    cipher = CaesarCipher(alphabet=alphabet)
    encrypted = cipher.encrypt(plaintext, shift=4).final_text

    results = caesar_brute_force(encrypted, cipher_instance=cipher)
    assert len(results) == expected_candidates
    assert results[4] == plaintext


def test_brute_force_empty_string():
    results = caesar_brute_force("")
    assert len(results) == 31
    assert all(candidate == "" for candidate in results.values())


def test_not_caesar_log_likelihood_formula():
    alphabet = "ABCD"
    model = CharTrigramModel.train("AB CD AB CD AB", alphabet)
    text = "AB CD"

    assert model.vocab_size == 6  # 4 litery + '#' + ' '
    expected_positions = len(normalize(text, alphabet)) - 1
    assert model.scored_positions(text) == expected_positions
    assert not_caesar_log_likelihood(text, model) == pytest.approx(
        expected_positions * -math.log(model.vocab_size)
    )


def test_deterministic_trigram_ranking_identifies_shifted_text():
    alphabet = "ABCDEFGH"
    corpus = "ABCD EFGH ABCD EFGH ABCD EFGH " * 20
    model = CharTrigramModel.train(corpus, alphabet)
    cipher = CaesarCipher(alphabet=alphabet)

    ciphertext = cipher.encrypt("ABCD EFGH ABCD EFGH", shift=3).final_text
    ranking = rank_caesar_candidates(ciphertext, cipher, model)

    assert ranking.candidates[0].shift == 3
    assert ranking.candidates[0].text == "ABCD EFGH ABCD EFGH"
    total_prob = sum(c.probability for c in ranking.candidates) + ranking.not_caesar_probability
    assert total_prob == pytest.approx(1.0)
