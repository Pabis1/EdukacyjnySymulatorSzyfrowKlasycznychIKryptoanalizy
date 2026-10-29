from enum import StrEnum
from typing import Annotated

from pydantic import Field

MAX_TEXT_LENGTH = 10_000
MAX_SHIFT_MAGNITUDE = 1_000
MAX_KEYWORD_LENGTH = 1_000


class CipherMode(StrEnum):
    ENCRYPT = "encrypt"
    DECRYPT = "decrypt"


InputText = Annotated[
    str,
    Field(
        max_length=MAX_TEXT_LENGTH,
        description="Text to process. Characters outside the cipher alphabet are kept unchanged.",
        examples=["Tekst do api"],
    ),
]

Shift = Annotated[
    int,
    Field(
        ge=-MAX_SHIFT_MAGNITUDE,
        le=MAX_SHIFT_MAGNITUDE,
        description="Number of positions to shift. Negative and out-of-range values are reduced modulo the alphabet length.",
        examples=[3],
    ),
]

AlphabetIndex = Annotated[int, Field(ge=0, description="Zero-based position in the cipher alphabet.")]

Keyword = Annotated[
    str,
    Field(
        min_length=1,
        max_length=MAX_KEYWORD_LENGTH,
        description="Cipher key. Characters outside the cipher alphabet are ignored; at least one must belong to it.",
        examples=["KLUCZ"],
    ),
]
