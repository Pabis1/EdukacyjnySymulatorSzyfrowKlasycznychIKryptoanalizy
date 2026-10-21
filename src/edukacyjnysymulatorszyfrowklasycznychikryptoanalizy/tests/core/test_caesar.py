import pytest
from core import CaesarCipher


@pytest.fixture
def caesar():
    return CaesarCipher()


def test_caesar_encrypt_basic(caesar):
    # 'A' (indeks 0) + 3 = 'C' (indeks 3 w polskim alfabecie: A, Ą, B, C)
    result = caesar.encrypt("A", 3)
    assert result.final_text == "C"

    step = result.steps[0]
    assert step.input_char == "A"
    assert step.output_char == "C"
    assert step.operation_details["original_index"] == 0
    assert step.operation_details["new_index"] == 3
    assert step.operation_details["is_modified"] is True


def test_caesar_decrypt_basic(caesar):
    result = caesar.decrypt("C", 3)
    assert result.final_text == "A"


def test_caesar_polish_characters(caesar):
    # 'Ą' (1) + 1 = 'B' (2)
    result = caesar.encrypt("Ą", 1)
    assert result.final_text == "B"


def test_caesar_case_preservation(caesar):
    result = caesar.encrypt("aĄb", 1)
    assert result.final_text == "ąBc"
    assert result.steps[0].output_char == "ą"  # mała litera
    assert result.steps[1].output_char == "B"  # wielka litera


def test_caesar_ignores_non_alphabet_chars(caesar):
    result = caesar.encrypt("ZBA 123!", 5)
    # Spacja i liczby zostają zignorowane
    assert result.steps[3].input_char == " "
    assert result.steps[3].operation_details["is_modified"] is False


def test_caesar_shift_wrap_around(caesar):
    # 'Ż' to ostatnia litera (indeks 31). +1 powinno dać 'A' (indeks 0).
    result = caesar.encrypt("Ż", 1)
    assert result.final_text == "A"
    assert result.steps[0].operation_details["formula"] == "(31 + 1) mod 32 = 0"