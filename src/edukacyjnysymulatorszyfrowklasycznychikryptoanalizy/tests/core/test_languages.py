import pytest
from core import (
    DEFAULT_LANGUAGE,
    LANGUAGES,
    CaesarCipher,
    Language,
    UnknownLanguageError,
    VigenereCipher,
    get_language,
)


@pytest.mark.parametrize(
    ("code", "alphabet_len"),
    [("pl", 32), ("en", 26), ("de", 29), ("es", 27), ("el", 24)],
)
def test_language_configs_are_loaded(code, alphabet_len):
    language = get_language(code)
    assert language.code == code
    assert len(language.alphabet) == alphabet_len


def test_default_language_is_polish():
    assert DEFAULT_LANGUAGE == "pl"
    assert CaesarCipher().alphabet == LANGUAGES["pl"].alphabet == VigenereCipher().alphabet


def test_unknown_language_raises():
    with pytest.raises(UnknownLanguageError, match="Nieobsługiwany język 'xx'"):
        get_language("xx")


@pytest.mark.parametrize(
    "alphabet",
    ["", "ABCA", "ABc", "ABß"],
    ids=["empty", "repeated-letter", "lowercase", "no-single-char-uppercase"],
)
def test_language_rejects_invalid_alphabet(alphabet):
    with pytest.raises(ValueError):
        Language(code="xx", name="Test", alphabet=alphabet)


@pytest.mark.parametrize(
    ("code", "text", "shift", "expected"),
    [
        ("en", "Xyz", 3, "Abc"),
        ("de", "Zürich", 1, "Äasjdi"),
        ("es", "Niño", 1, "Ñjop"),
        ("el", "Ωμέγα", 1, "Ανέδβ"),
    ],
)
def test_caesar_uses_language_alphabet(code, text, shift, expected):
    cipher = CaesarCipher(alphabet=get_language(code).alphabet)
    encrypted = cipher.encrypt(text, shift).final_text
    assert encrypted == expected
    assert cipher.decrypt(encrypted, shift).final_text == text


def test_vigenere_greek_roundtrip():
    cipher = VigenereCipher(alphabet=get_language("el").alphabet)
    text = "Καλημέρα κόσμε!"
    encrypted = cipher.encrypt(text, keyword="κλειδί").final_text
    assert encrypted != text
    assert cipher.decrypt(encrypted, keyword="κλειδί").final_text == text
