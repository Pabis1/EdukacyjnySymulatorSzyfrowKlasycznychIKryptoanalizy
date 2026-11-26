import math
import random

import pytest
from core import (
    CaesarCipher,
    CharTrigramModel,
    VigenereCipher,
    get_language,
    rank_caesar_candidates,
    train_language_models,
)
from core.analysis.language_model import FOREIGN_LETTER, SEPARATOR, normalize

PLAINTEXTS = {
    "pl": ["Ala ma kota", "Spotkajmy się jutro o ósmej przy dworcu", "Tajne hasło"],
    "en": ["Hello world", "Meet me at the train station tomorrow", "Attack at dawn", "Secret"],
    "de": ["Hallo Welt", "Wir treffen uns morgen früh am Bahnhof", "Geheimnis"],
    "es": ["Hola mundo", "Nos vemos mañana en la estación de tren", "Secreto"],
    "el": ["Καλημέρα κόσμε", "Θα συναντηθούμε αύριο στο σταθμό", "Μυστικό"],
}


@pytest.fixture(scope="module")
def models():
    return train_language_models()


def test_normalize_maps_to_model_vocabulary():
    alphabet = get_language("en").alphabet
    assert (
        normalize("Hi, Łódź!  ok", alphabet)
        == f"{SEPARATOR}HI{SEPARATOR}{FOREIGN_LETTER * 2}D{FOREIGN_LETTER}{SEPARATOR}OK{SEPARATOR}"
    )


def test_every_language_has_a_model(models):
    assert set(models) == {"pl", "en", "de", "es", "el"}
    for code, model in models.items():
        assert model.alphabet == get_language(code).alphabet


def test_model_conditional_probabilities_sum_to_one():
    model = CharTrigramModel.train("ala ma kota, kot ma ale", "AKLMOT")
    vocab = [*"AKLMOT", FOREIGN_LETTER, SEPARATOR]
    for context in ["AL", "  ", "#A", "TT"]:
        total = sum(math.exp(model.log_probs[context + c]) for c in vocab)
        assert total == pytest.approx(1)


def test_model_prefers_its_own_language(models):
    assert models["pl"].log_likelihood("Ala ma kota") > models["en"].log_likelihood("Ala ma kota")
    assert models["en"].log_likelihood("the weather") > models["pl"].log_likelihood("the weather")


@pytest.mark.parametrize(("code", "plaintext"), [(code, text) for code, texts in PLAINTEXTS.items() for text in texts])
def test_plaintext_is_ranked_first(models, code, plaintext):
    cipher = CaesarCipher(alphabet=get_language(code).alphabet)
    ciphertext = cipher.encrypt(plaintext, 7).final_text

    ranking = rank_caesar_candidates(ciphertext, cipher, models[code])
    ranked = ranking.candidates
    assert len(ranked) == cipher.alphabet_len - 1
    assert (ranked[0].shift, ranked[0].text) == (7, plaintext)
    assert ranked[0].probability > 0.5
    assert ranking.not_caesar_probability < ranked[0].probability
    assert sum(c.probability for c in ranked) + ranking.not_caesar_probability == pytest.approx(1)
    assert [c.probability for c in ranked] == sorted((c.probability for c in ranked), reverse=True)


def test_atypical_plaintext_still_wins_among_shifts(models):
    # A pangram made of the rarest Polish letters looks less like Polish than random letters do, so
    # "not Caesar" may win. The correct shift must still be the most likely of the shifts.
    cipher = CaesarCipher()
    ranking = rank_caesar_candidates(cipher.encrypt("Zażółć gęślą jaźń", 7).final_text, cipher, models["pl"])
    assert (ranking.candidates[0].shift, ranking.candidates[0].text) == (7, "Zażółć gęślą jaźń")


VIGENERE_SAMPLES = {
    "pl": ("W Szczebrzeszynie chrząszcz brzmi w trzcinie i Szczebrzeszyn z tego słynie", "TAJNEHASLO"),
    "en": ("The quick brown fox jumps over the lazy dog and keeps running far away", "LEMONADE"),
}


@pytest.mark.parametrize("code", list(VIGENERE_SAMPLES))
def test_vigenere_ciphertext_is_not_caesar(models, code):
    # Without the "not Caesar" hypothesis the softmax gave ~100% to some shift even for Vigenère.
    plaintext, keyword = VIGENERE_SAMPLES[code]
    alphabet = get_language(code).alphabet
    ciphertext = VigenereCipher(alphabet=alphabet).encrypt(plaintext, keyword=keyword).final_text

    ranking = rank_caesar_candidates(ciphertext, CaesarCipher(alphabet=alphabet), models[code])
    assert ranking.not_caesar_probability > 0.99


def test_random_letters_are_not_caesar(models):
    rng = random.Random(0)
    alphabet = get_language("pl").alphabet
    gibberish = " ".join("".join(rng.choice(alphabet) for _ in range(6)) for _ in range(20))

    ranking = rank_caesar_candidates(gibberish, CaesarCipher(alphabet=alphabet), models["pl"])
    assert ranking.not_caesar_probability > 0.99


def test_text_without_letters_gets_uniform_probabilities(models):
    # Nothing to score, so every hypothesis (31 shifts and "not Caesar") is equally likely.
    cipher = CaesarCipher()
    ranking = rank_caesar_candidates("123 !?", cipher, models["pl"])
    assert [c.shift for c in ranking.candidates] == list(range(1, 32))
    assert all(c.probability == pytest.approx(1 / 32) for c in ranking.candidates)
    assert ranking.not_caesar_probability == pytest.approx(1 / 32)


def test_rank_rejects_mismatched_model(models):
    with pytest.raises(ValueError, match="same alphabet"):
        rank_caesar_candidates("ABC", CaesarCipher(), models["en"])
