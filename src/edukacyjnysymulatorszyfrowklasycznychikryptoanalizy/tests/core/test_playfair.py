import pytest

from core import PlayfairCipher


@pytest.fixture
def playfair():
    return PlayfairCipher()


def test_playfair_matrix_generation(playfair):
    _char_to_pos, _pos_to_char, matrix_1d = playfair._generate_matrix("JAJBKO")
    assert matrix_1d[0] == "I"
    assert matrix_1d[1] == "A"
    assert "J" not in matrix_1d
    assert len(matrix_1d) == 25


def test_playfair_enigma_matrix_order(playfair):
    _char_to_pos, _pos_to_char, matrix_1d = playfair._generate_matrix("ENIGMA")
    assert "".join(matrix_1d) == "ENIGMABCDFHKLOPQRSTUVWXYZ"


def test_playfair_prepare_text_repeating_chars(playfair):
    pairs = playfair._prepare_text("MESSAGES")
    assert pairs == ["ME", "SX", "SA", "GE", "SX"]


def test_playfair_rule_row_and_wrap_around(playfair):
    # Wiersz 0 bez klucza: A B C D E -> 'AE' zawija się na 'BA'
    encrypted = playfair.encrypt("AE", keyword="")
    assert encrypted.final_text == "BA"
    assert encrypted.steps[0].operation_details["rule_applied"] == "Wiersz"

    decrypted = playfair.decrypt("BA", keyword="")
    assert decrypted.final_text == "AE"


def test_playfair_rule_column_and_wrap_around(playfair):
    # Kolumna 0 bez klucza: A F L Q V -> 'AV' zawija się na 'FA'
    encrypted = playfair.encrypt("AV", keyword="")
    assert encrypted.final_text == "FA"
    assert encrypted.steps[0].operation_details["rule_applied"] == "Kolumna"

    decrypted = playfair.decrypt("FA", keyword="")
    assert decrypted.final_text == "AV"


def test_playfair_rule_rectangle_and_symmetry(playfair):
    ab = playfair.encrypt("AG", keyword="")
    ba = playfair.encrypt("GA", keyword="")
    assert ab.final_text == "BF"
    assert ba.final_text == "FB"
    assert ab.steps[0].operation_details["rule_applied"] == "Prostokąt"


def test_playfair_full_cycle(playfair):
    original = "SECRET MESSAGE"
    encrypted = playfair.encrypt(original, keyword="ENIGMA")
    decrypted = playfair.decrypt(encrypted.final_text, keyword="ENIGMA")
    assert decrypted.final_text == "SECRETMESXSAGE"


@pytest.mark.parametrize(
    ("text", "pairs"),
    [("XX", ["XQ", "XQ"]), ("X", ["XQ"]), ("TAXX", ["TA", "XQ", "XQ"]), ("ABC", ["AB", "CX"])],
    ids=["double-x", "single-x", "trailing-double-x", "odd-length-x"],
)
def test_playfair_padding_rules(playfair, text, pairs):
    assert playfair._prepare_text(text) == pairs


def test_playfair_double_x_roundtrip(playfair):
    encrypted = playfair.encrypt("XX", keyword="KLUCZ").final_text
    assert playfair.decrypt(encrypted, keyword="KLUCZ").final_text == "XQXQ"


def test_playfair_empty_and_non_latin_inputs(playfair):
    assert playfair.encrypt("", keyword="ENIGMA").final_text == ""
    assert playfair.decrypt("", keyword="ENIGMA").final_text == ""
    only_ignored = playfair.encrypt("123 !@# ąćęłńóśźż", keyword="ENIGMA")
    assert only_ignored.final_text == ""
    assert only_ignored.steps == []


def test_playfair_none_and_case_insensitive_keyword(playfair):
    res_none = playfair.encrypt("AB", keyword=None)
    assert res_none.final_text == "BC"

    lower = playfair.encrypt("secret message", keyword="enigma")
    upper = playfair.encrypt("SECRET MESSAGE", keyword="ENIGMA")
    assert lower.final_text == upper.final_text


def test_playfair_no_letter_encrypts_to_itself(playfair):
    result = playfair.encrypt("THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG", keyword="ENIGMA")
    for step in result.steps:
        assert step.input_char[0] != step.output_char[0]
        assert step.input_char[1] != step.output_char[1]


def test_playfair_metadata_contains_normalized_keyword(playfair):
    assert playfair.encrypt("A", keyword="jabłko 9").metadata["keyword"] == "IABKO"


@pytest.mark.parametrize(
    ("ciphertext", "message"),
    [
        ("ABC", "parzystą liczbę liter"),
        ("AA", "dwiema takimi samymi literami"),
        ("IJ", "dwiema takimi samymi literami"),
    ],
    ids=["odd-length", "identical-letters", "merged-i-j-identical"],
)
def test_playfair_decrypt_rejects_invalid_ciphertext(playfair, ciphertext, message):
    with pytest.raises(ValueError, match=message):
        playfair.decrypt(ciphertext, keyword="ENIGMA")
