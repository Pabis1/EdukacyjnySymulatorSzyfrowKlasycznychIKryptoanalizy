from ..base import BaseCipher
from ..models import CipherResult, CipherStep


class VigenereCipher(BaseCipher):
    def __init__(self, alphabet: str = "AĄBCĆDEĘFGHIJKLŁMNŃOÓPRSŚTUWYZŹŻ"):
        self.alphabet = alphabet
        self.alphabet_len = len(alphabet)

    def _process(self, text: str, keyword: str, mode: str) -> CipherResult:
        steps = []
        result_chars = []

        # Oczyszczenie klucza ze znaków spoza alfabetu i zamiana na wielkie litery
        clean_keyword = [c.upper() for c in keyword if c.upper() in self.alphabet]
        if not clean_keyword:
            raise ValueError("Klucz musi zawierać przynajmniej jedną literę z alfabetu.")

        key_len = len(clean_keyword)
        key_index = 0  # Niezależny licznik (nie rośnie na spacjach/interpunkcji)

        for i, char in enumerate(text):
            is_upper = char.isupper()
            char_upper = char.upper()

            if char_upper in self.alphabet:
                original_idx = self.alphabet.index(char_upper)

                # Pobranie aktualnego znaku klucza (realizacja zapętlania)
                current_key_char = clean_keyword[key_index % key_len]
                shift = self.alphabet.index(current_key_char)

                if mode == "encrypt":
                    new_idx = (original_idx + shift) % self.alphabet_len
                    formula_op = "+"
                else:
                    new_idx = (original_idx - shift) % self.alphabet_len
                    formula_op = "-"

                new_char_upper = self.alphabet[new_idx]

                # Zachowanie wielkości liter wejściowych
                new_char = new_char_upper if is_upper else new_char_upper.lower()

                details = {
                    "is_modified": True,
                    "original_index": original_idx,
                    "key_char": current_key_char,
                    "shift_applied": shift,
                    "new_index": new_idx,
                    "formula": f"({original_idx} {formula_op} {shift}) mod {self.alphabet_len} = {new_idx}"
                }
                desc = f"Znak '{char}': klucz '{current_key_char}' (przesunięcie {shift}) -> '{new_char}'."

                key_index += 1  # Inkrementacja tylko dla modyfikowanych znaków
            else:
                # Ignorowanie spacji i interpunkcji - brak modyfikacji key_index
                new_char = char
                details = {
                    "is_modified": False,
                    "reason": "Znak spoza alfabetu"
                }
                desc = f"Znak '{char}' spoza alfabetu - pozostawiony bez zmian."

            steps.append(CipherStep(
                input_char=char,
                output_char=new_char,
                index=i,
                operation_details=details,
                description=desc
            ))
            result_chars.append(new_char)

        return CipherResult(
            final_text="".join(result_chars),
            steps=steps,
            metadata={"cipher_type": "Vigenere", "mode": mode, "keyword": "".join(clean_keyword)}
        )

    def encrypt(self, text: str, **kwargs) -> CipherResult:
        keyword = kwargs.get("keyword")
        if not keyword:
            raise ValueError("Szyfr Vigenère'a wymaga parametru 'keyword'.")
        return self._process(text, keyword, mode="encrypt")

    def decrypt(self, text: str, **kwargs) -> CipherResult:
        keyword = kwargs.get("keyword")
        if not keyword:
            raise ValueError("Szyfr Vigenère'a wymaga parametru 'keyword'.")
        return self._process(text, keyword, mode="decrypt")