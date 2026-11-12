
from ..ciphers.caesar import CaesarCipher


def caesar_brute_force(ciphertext: str, cipher_instance: CaesarCipher = None) -> dict[int, str]:
    """
    Wykonuje atak brute force na szyfrogram Cezara, testując wszystkie możliwe przesunięcia.
    Zwraca słownik mapujący użyty klucz na potencjalny tekst jawny.
    """
    if cipher_instance is None:
        cipher_instance = CaesarCipher()

    results: dict[int, str] = {}
    max_shift = cipher_instance.alphabet_len

    # Iteracja przez wszystkie sensowne klucze (od 1 do długości alfabetu - 1)
    for shift in range(1, max_shift):
        result = cipher_instance.decrypt(ciphertext, shift=shift)
        results[shift] = result.final_text

    return results