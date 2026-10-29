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

def test_vigenere_idempotency_pangram(vigenere):
    # Weryfikacja 100% odwracalności dla pełnego polskiego alfabetu
    original_text = "Pchnąć w tę łódź jeża lub ośm skrzyń fig! 123"
    key = "TAJNEHASŁO"
    
    encrypted = vigenere.encrypt(original_text, keyword=key)
    decrypted = vigenere.decrypt(encrypted.final_text, keyword=key)
    
    assert decrypted.final_text == original_text
    assert len(encrypted.steps) == len(original_text)


def test_vigenere_empty_string(vigenere):
    # Pusty tekst nie powinien wywoływać błędów iteracji
    result = vigenere.encrypt("", keyword="KLUCZ")
    assert result.final_text == ""
    assert len(result.steps) == 0


def test_vigenere_empty_keyword_raises_error(vigenere):
    # Pusty string jako klucz powinien rzucić błąd (dzielenie modulo 0 w logice pętli)
    with pytest.raises(ValueError):
        vigenere.encrypt("TEKST", keyword="")


def test_vigenere_keyword_longer_than_text(vigenere):
    # Klucz jest dłuższy niż tekst - algorytm powinien użyć tylko początkowych liter klucza
    text = "AB"
    key = "BARDZODLUGIKLUCZ"
    
    encrypted = vigenere.encrypt(text, keyword=key)
    decrypted = vigenere.decrypt(encrypted.final_text, keyword=key)
    
    assert decrypted.final_text == text
    assert encrypted.steps[0].operation_details["key_char"] == "B"
    assert encrypted.steps[1].operation_details["key_char"] == "A"


def test_vigenere_special_chars_only(vigenere):
    # Tekst składający się wyłącznie ze znaków ignorowanych
    text = "123!@#   "
    result = vigenere.encrypt(text, keyword="TAJNY")
    
    assert result.final_text == text
    assert result.steps[0].operation_details["is_modified"] is False


def test_vigenere_wrap_around_alphabet_extreme(vigenere):
    # Symulacja przeskoku przez koniec alfabetu w Vigenere
    # 'Ż' (indeks 31). Jeśli klucz to np. 'B' (indeks 2), 31 + 2 = 33 mod 32 = 1 ('Ą')
    result = vigenere.encrypt("Ż", keyword="B")
    assert result.final_text == "Ą"
    
    # Cofanie przy deszyfrowaniu
    result_dec = vigenere.decrypt("Ą", keyword="B")
    assert result_dec.final_text == "Ż"


def test_vigenere_stress_long_text(vigenere):
    # Weryfikacja wydajności i pamięci dla dużego ładunku danych (tzw. stress test)
    long_text = "ABC ĄĆĘ 123! " * 1000
    key = "POLITECHNIKA"
    
    result = vigenere.encrypt(long_text, keyword=key)
    assert len(result.final_text) == len(long_text)
    assert len(result.steps) == len(long_text)


def test_vigenere_missing_keyword_raises_error(vigenere):
    with pytest.raises(ValueError, match="wymaga parametru 'keyword'"):
        vigenere.encrypt("TEST")

def test_vigenere_keyword_case_insensitivity(vigenere):
    # Klucz "KLUCZ", "klucz" i "kLuCz" powinien generować to samo przesunięcie
    text = "TAJNA WIADOMOŚĆ"
    result_upper = vigenere.encrypt(text, keyword="KLUCZ")
    result_lower = vigenere.encrypt(text, keyword="klucz")
    result_mixed = vigenere.encrypt(text, keyword="kLuCz")
    
    assert result_upper.final_text == result_lower.final_text
    assert result_lower.final_text == result_mixed.final_text


def test_vigenere_step_details_accuracy(vigenere):
    # Frontend opiera się na tablicy steps. Musimy mieć pewność, że Vigenere
    # poprawnie loguje, jakiej litery z klucza użył w danym kroku.
    result = vigenere.encrypt("A", keyword="C")
    
    step = result.steps[0]
    assert step.input_char == "A"
    assert step.output_char == "C"
    # Sprawdzamy czy w szczegółach kroku faktycznie zapisano literę klucza
    assert "key_char" in step.operation_details
    assert step.operation_details["key_char"].upper() == "C"
    assert "original_index" in step.operation_details
    assert "new_index" in step.operation_details



def test_vigenere_decrypt_underflow(vigenere):
    # Sprawdzenie deszyfrowania, gdy indeks litery zaszyfrowanej jest mniejszy 
    # niż indeks litery z klucza (wymusza to zawinięcie matematyczne w dół).
    # Np. zaszyfrowany tekst 'A' (0) odszyfrowywany kluczem 'Ż' (31).
    encrypted = vigenere.encrypt("A", keyword="Ż")
    decrypted = vigenere.decrypt(encrypted.final_text, keyword="Ż")
    
    assert decrypted.final_text == "A"


def test_vigenere_invalid_text_type(vigenere):
    # Zabezpieczenie przed podaniem niewłaściwego typu danych (np. int zamiast str)
    with pytest.raises(TypeError):
        vigenere.encrypt(12345, keyword="TAJNE")


def test_vigenere_invalid_keyword_type(vigenere):
    # Zabezpieczenie przed podaniem liczby jako klucza
    with pytest.raises(TypeError):
        vigenere.encrypt("TEKST", keyword=123)

