import pytest
from core import PlayfairCipher


@pytest.fixture
def playfair():
    return PlayfairCipher()


def test_playfair_matrix_generation(playfair):
    # Klucz z 'J' i duplikatami
    char_to_pos, pos_to_char, matrix_1d = playfair._generate_matrix("JAJBKO")
    # 'J' powinno zamienić się na 'I'. Macierz: I, A, B, K, O, C, D, E, F, G, H, L, M, N, P...
    assert matrix_1d[0] == 'I'
    assert matrix_1d[1] == 'A'
    assert 'J' not in matrix_1d
    assert len(matrix_1d) == 25


def test_playfair_prepare_text_repeating_chars(playfair):
    # Słowo z "SS" powinno zostać rozdzielone przez "X"
    pairs = playfair._prepare_text("MESSAGES")
    assert pairs[1] == "ES"
    assert pairs[2] == "SX"  # SS zostaje rozbite
    assert pairs[3] == "AG"


def test_playfair_rule_row(playfair):
    # Macierz z kluczem pustym to zwykły alfabet
    # A B C D E -> A i B są w tym samym wierszu. A->B, B->C
    result = playfair.encrypt("AB", keyword="")
    assert result.final_text == "BC"
    assert result.steps[0].operation_details["rule_applied"] == "Wiersz"


def test_playfair_rule_column(playfair):
    # Klucz "ABCDE". Kolumna 1 to: A, F, L, Q, V
    # A i F są w tej samej kolumnie. A->F, F->L
    result = playfair.encrypt("AF", keyword="")
    assert result.final_text == "FL"
    assert result.steps[0].operation_details["rule_applied"] == "Kolumna"


def test_playfair_rule_rectangle(playfair):
    # A (0,0) i G (1,1). Prostokąt. Wynik: B (0,1) i F (1,0)
    result = playfair.encrypt("AG", keyword="")
    assert result.final_text == "BF"
    assert result.steps[0].operation_details["rule_applied"] == "Prostokąt"


def test_playfair_full_cycle(playfair):
    original = "SECRET MESSAGE"
    encrypted = playfair.encrypt(original, keyword="ENIGMA")
    decrypted = playfair.decrypt(encrypted.final_text, keyword="ENIGMA")

    # Decrypt nie usuwa 'X' dodanych w procesie szyfrowania
    assert decrypted.final_text == "SECRETXMESXSAGEX"