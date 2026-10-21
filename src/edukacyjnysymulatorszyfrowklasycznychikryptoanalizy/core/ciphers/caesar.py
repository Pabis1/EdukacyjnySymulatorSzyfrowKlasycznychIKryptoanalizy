from ..base import BaseCipher
from ..models import CipherResult, CipherStep

class CaesarCipher(BaseCipher):
    def __init__(self, alphabet: str = "AĄBCĆDEĘFGHIJKLŁMNŃOÓPRSŚTUWYZŹŻ"):
        self.alphabet = alphabet
        self.alphabet_len = len(alphabet)

    def _process(self, text: str, shift: int, mode: str) -> CipherResult:
        steps = []
        result_chars = []

        # Normalizacja przesunięcia (w prawo dla encrypt, w lewo dla decrypt)
        actual_shift = shift % self.alphabet_len if mode == "encrypt" else -shift % self.alphabet_len

        for i, char in enumerate(text):
            is_upper = char.isupper()
            char_upper = char.upper()

            if char_upper in self.alphabet:
                original_idx = self.alphabet.index(char_upper)
                new_idx = (original_idx + actual_shift) % self.alphabet_len
                new_char_upper = self.alphabet[new_idx]

                new_char = new_char_upper if is_upper else new_char_upper.lower()

                formula_op = "+" if mode == "encrypt" else "-"
                details = {
                    "is_modified": True,
                    "original_index": original_idx,
                    "shift_applied": actual_shift,
                    "new_index": new_idx,
                    "formula": f"({original_idx} {formula_op} {abs(shift)}) mod {self.alphabet_len} = {new_idx}"
                }
                desc = f"Znak '{char}': przesunięcie o {actual_shift} na '{new_char}'."
            else:
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
            metadata={"cipher_type": "Caesar", "mode": mode, "shift": shift, "alphabet_len": self.alphabet_len}
        )

    def encrypt(self, text: str, shift: int) -> CipherResult:
        return self._process(text, shift, mode="encrypt")

    def decrypt(self, text: str, shift: int) -> CipherResult:
        return self._process(text, shift, mode="decrypt")