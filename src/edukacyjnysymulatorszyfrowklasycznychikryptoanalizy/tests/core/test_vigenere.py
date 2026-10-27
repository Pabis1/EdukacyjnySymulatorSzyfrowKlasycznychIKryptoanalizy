import pytest
from core import VigenereCipher


@pytest.fixture
def vigenere():
    return VigenereCipher()


def test_vigenere_encrypt_decrypt_basic(vigenere):
    # 'A' (0) + 'B' (2) = 'B' (2)
    # 'B' (2) + 'Ą' (1) = 'C' (3)
    result_enc = vigenere.encrypt("AB", keyword="BĄ")
    assert result_enc.final_text == "BC"

    result_dec = vigenere.decrypt("BC", keyword="BĄ")
    assert result_dec.final_text == "AB"


def test_vigenere_key_looping(vigenere):
    # Słowo 3-literowe, klucz 2-literowy (BĄ)
    # A(0) + B(2) = B(2)
    # B(2) + Ą(1) = C(3)
    # C(3) + B(2) = D(5)
    result = vigenere.encrypt("ABC", keyword="BĄ")
    assert result.final_text == "BCD"


def test_vigenere_ignores_spaces_and_keeps_key_index(vigenere):
    # Spacja nie powinna przesuwać indeksu klucza 'BĄ' (2, 1)
    # A (0) + B (2) = B
    # [Spacja]
    # B (2) + Ą (1) = C
    result = vigenere.encrypt("A B", keyword="BĄ")
    assert result.final_text == "B C"

    # Weryfikacja dokładnego śladu
    assert result.steps[1].input_char == " "
    assert result.steps[1].operation_details["is_modified"] is False
    assert result.steps[2].operation_details["key_char"] == "Ą"  # Klucz nie przeskoczył na spacji


def test_vigenere_case_preservation(vigenere):
    # Weryfikacja text.lower() / text.upper()
    result = vigenere.encrypt("aBc", keyword="BĄ")
    assert result.final_text == "bCd"
    assert result.steps[0].output_char == "b"
    assert result.steps[1].output_char == "C"


def test_vigenere_missing_keyword_raises_error(vigenere):
    with pytest.raises(ValueError, match="wymaga parametru 'keyword'"):
        vigenere.encrypt("TEST")