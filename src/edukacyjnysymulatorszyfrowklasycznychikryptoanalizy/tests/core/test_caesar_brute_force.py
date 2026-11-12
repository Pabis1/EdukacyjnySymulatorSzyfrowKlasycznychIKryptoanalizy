from core import CaesarCipher, caesar_brute_force


def test_brute_force_generates_all_keys():
    # Szyfrujemy wiadomość z przesunięciem 5
    cipher = CaesarCipher()
    encrypted = cipher.encrypt("TAJNE", shift=5).final_text

    results = caesar_brute_force(encrypted)

    # Polski alfabet ma 32 znaki, więc sprawdzamy klucze 1-31
    assert len(results) == 31
    assert 5 in results
    assert results[5] == "TAJNE"


def test_brute_force_ignores_punctuation():
    cipher = CaesarCipher()
    # "A B!" zaszyfrowane o 1 to "Ą C!" (według polskiego alfabetu)
    encrypted = cipher.encrypt("A B!", shift=1).final_text

    results = caesar_brute_force(encrypted)

    assert results[1] == "A B!"
    # Sprawdzamy inny losowy klucz, aby upewnić się, że interpunkcja zawsze zostaje
    assert " " in results[15]
    assert "!" in results[15]