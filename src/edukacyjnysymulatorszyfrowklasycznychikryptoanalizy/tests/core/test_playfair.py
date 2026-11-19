import pytest
from core import PlayfairCipher


@pytest.fixture
def playfair():
    return PlayfairCipher()


def test_playfair_matrix_generation(playfair):
    _char_to_pos, _pos_to_char, matrix_1d = playfair._generate_matrix("JAJBKO")
    assert matrix_1d[0] == 'I'
    assert matrix_1d[1] == 'A'
    assert 'J' not in matrix_1d
    assert len(matrix_1d) == 25


def test_playfair_prepare_text_repeating_chars(playfair):
    # Słowo "MESSAGES" -> ME, SS (kolizja, 'X' wstawione w środek) -> SA, GE, S (zostaje samo, dostaje 'X')
    # Pary docelowe: ME, SX, SA, GE, SX
    pairs = playfair._prepare_text("MESSAGES")
    assert pairs[0] == "ME"
    assert pairs[1] == "SX"
    assert pairs[2] == "SA"
    assert pairs[3] == "GE"
    assert pairs[4] == "SX"


def test_playfair_rule_row(playfair):
    result = playfair.encrypt("AB", keyword="")
    assert result.final_text == "BC"
    assert result.steps[0].operation_details["rule_applied"] == "Wiersz"


def test_playfair_rule_column(playfair):
    result = playfair.encrypt("AF", keyword="")
    assert result.final_text == "FL"
    assert result.steps[0].operation_details["rule_applied"] == "Kolumna"


def test_playfair_rule_rectangle(playfair):
    result = playfair.encrypt("AG", keyword="")
    assert result.final_text == "BF"
    assert result.steps[0].operation_details["rule_applied"] == "Prostokąt"


def test_playfair_full_cycle(playfair):
    original = "SECRET MESSAGE"
    # Dzielenie na pary: SE, CR, ET, ME, SS (rozbite: SX), SA, GE
    # Razem digramów: SE CR ET ME SX SA GE
    encrypted = playfair.encrypt(original, keyword="ENIGMA")
    decrypted = playfair.decrypt(encrypted.final_text, keyword="ENIGMA")

    assert decrypted.final_text == "SECRETMESXSAGE"

@pytest.mark.parametrize(
    ("text", "pairs"),
    [("XX", ["XQ", "XQ"]), ("X", ["XQ"]), ("TAXX", ["TA", "XQ", "XQ"])],
    ids=["double-x", "single-x", "trailing-double-x"],
)
def test_playfair_pads_x_with_q(playfair, text, pairs):
    # Padding 'X' with 'X' would produce an invalid 'XX' digram.
    assert playfair._prepare_text(text) == pairs


def test_playfair_double_x_roundtrip(playfair):
    encrypted = playfair.encrypt("XX", keyword="KLUCZ").final_text
    assert playfair.decrypt(encrypted, keyword="KLUCZ").final_text == "XQXQ"


def test_playfair_metadata_contains_normalized_keyword(playfair):
    assert playfair.encrypt("A", keyword="jabłko 9").metadata["keyword"] == "IABKO"


@pytest.mark.parametrize(
    ("ciphertext", "message"),
    [("ABC", "parzystą liczbę liter"), ("AA", "dwiema takimi samymi literami")],
    ids=["odd-length", "identical-letters"],
)
def test_playfair_decrypt_rejects_invalid_ciphertext(playfair, ciphertext, message):
    with pytest.raises(ValueError, match=message):
        playfair.decrypt(ciphertext, keyword="")
