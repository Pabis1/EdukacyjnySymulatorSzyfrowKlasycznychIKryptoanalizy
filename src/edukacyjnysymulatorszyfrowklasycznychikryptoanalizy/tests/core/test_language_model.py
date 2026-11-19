import math

import pytest
from core import (
    CaesarCipher,
    CharTrigramModel,
    get_language,
    rank_caesar_candidates,
    train_language_models,
)
from core.analysis.language_model import FOREIGN_LETTER, SEPARATOR, normalize

PLAINTEXTS = {
    "pl": ["Ala ma kota", "Zażółć gęślą jaźń", "Spotkajmy się jutro o ósmej przy dworcu", "Tajne hasło"],
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

    ranked = rank_caesar_candidates(ciphertext, cipher, models[code])
    assert len(ranked) == cipher.alphabet_len - 1
    assert (ranked[0].shift, ranked[0].text) == (7, plaintext)
    assert ranked[0].probability > 0.5
    assert sum(c.probability for c in ranked) == pytest.approx(1)
    assert [c.probability for c in ranked] == sorted((c.probability for c in ranked), reverse=True)


def test_text_without_letters_gets_uniform_probabilities(models):
    cipher = CaesarCipher()
    ranked = rank_caesar_candidates("123 !?", cipher, models["pl"])
    assert [c.shift for c in ranked] == list(range(1, 32))
    assert all(c.probability == pytest.approx(1 / 31) for c in ranked)


def test_rank_rejects_mismatched_model(models):
    with pytest.raises(ValueError, match="same alphabet"):
        rank_caesar_candidates("ABC", CaesarCipher(), models["en"])
