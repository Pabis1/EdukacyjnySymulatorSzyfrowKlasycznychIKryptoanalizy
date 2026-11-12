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