import re

from ..base import BaseCipher
from ..models import CipherResult, CipherStep


class PlayfairCipher(BaseCipher):
    def __init__(self):
        self.alphabet = "ABCDEFGHIKLMNOPQRSTUVWXYZ"
        self.grid_size = 5

    def _generate_matrix(self, keyword: str) -> tuple[
        dict[str, tuple[int, int]], dict[tuple[int, int], str], list[str]]:
        keyword = keyword.upper().replace("J", "I")
        keyword = re.sub(r'[^A-Z]', '', keyword)

        matrix_chars = []
        seen = set()

        for char in keyword + self.alphabet:
            if char not in seen and char in self.alphabet:
                seen.add(char)
                matrix_chars.append(char)

        char_to_pos = {}
        pos_to_char = {}
        for idx, char in enumerate(matrix_chars):
            r, c = divmod(idx, self.grid_size)
            char_to_pos[char] = (r, c)
            pos_to_char[(r, c)] = char

        return char_to_pos, pos_to_char, matrix_chars

    def _prepare_text(self, text: str) -> list[str]:
        text = text.upper().replace("J", "I")
        clean_text = re.sub(r'[^A-Z]', '', text)

        pairs = []
        i = 0
        while i < len(clean_text):
            char1 = clean_text[i]
            if i + 1 < len(clean_text):
                char2 = clean_text[i + 1]
                if char1 == char2:
                    pairs.append(char1 + "X")
                    i += 1
                else:
                    pairs.append(char1 + char2)
                    i += 2
            else:
                pairs.append(char1 + "X")
                i += 1
        return pairs

    def _process(self, text: str, keyword: str, mode: str) -> CipherResult:
        if keyword is None:
            keyword = ""

        char_to_pos, pos_to_char, matrix_chars = self._generate_matrix(keyword)

        if mode == "encrypt":
            pairs = self._prepare_text(text)
        else:
            clean_text = re.sub(r'[^A-Z]', '', text.upper().replace("J", "I"))
            pairs = [clean_text[i:i + 2] for i in range(0, len(clean_text), 2)]

        steps = []
        result_chars = []
        shift = 1 if mode == "encrypt" else -1

        for i, pair in enumerate(pairs):
            if len(pair) != 2:
                continue

            char1, char2 = pair[0], pair[1]
            r1, c1 = char_to_pos[char1]
            r2, c2 = char_to_pos[char2]

            if r1 == r2:
                rule = "Wiersz"
                new_c1, new_c2 = (c1 + shift) % 5, (c2 + shift) % 5
                new_char1, new_char2 = pos_to_char[(r1, new_c1)], pos_to_char[(r2, new_c2)]
            elif c1 == c2:
                rule = "Kolumna"
                new_r1, new_r2 = (r1 + shift) % 5, (r2 + shift) % 5
                new_char1, new_char2 = pos_to_char[(new_r1, c1)], pos_to_char[(new_r2, c2)]
            else:
                rule = "Prostokąt"
                new_char1, new_char2 = pos_to_char[(r1, c2)], pos_to_char[(r2, c1)]

            result_chars.extend([new_char1, new_char2])

            details = {
                "is_modified": True,
                "rule_applied": rule,
                "pos1": [r1, c1], "pos2": [r2, c2]
            }
            desc = f"Digram '{pair}': Reguła '{rule}' -> '{new_char1}{new_char2}'."

            steps.append(CipherStep(
                input_char=pair,
                output_char=new_char1 + new_char2,
                index=i * 2,
                operation_details=details,
                description=desc
            ))

        return CipherResult(
            final_text="".join(result_chars),
            steps=steps,
            metadata={
                "cipher_type": "Playfair",
                "mode": mode,
                "keyword": keyword,
                "matrix_1d": matrix_chars
            }
        )

    def encrypt(self, text: str, **kwargs) -> CipherResult:
        return self._process(text, kwargs.get("keyword", ""), mode="encrypt")

    def decrypt(self, text: str, **kwargs) -> CipherResult:
        return self._process(text, kwargs.get("keyword", ""), mode="decrypt")