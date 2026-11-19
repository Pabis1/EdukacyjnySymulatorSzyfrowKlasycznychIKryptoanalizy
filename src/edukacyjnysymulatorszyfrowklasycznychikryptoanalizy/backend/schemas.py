from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

from .types import (
    MAX_BRUTE_FORCE_TEXT_LENGTH,
    AlphabetIndex,
    CipherMode,
    InputText,
    Keyword,
    PlayfairKeyword,
    Shift,
)


class Schema(BaseModel):
    model_config = ConfigDict(from_attributes=True, frozen=True)


# --- Shared ---


class ModifiedCharDetails(Schema):
    is_modified: Literal[True]
    original_index: AlphabetIndex
    shift_applied: AlphabetIndex = Field(description="Effective shift after normalization modulo the alphabet length.")
    new_index: AlphabetIndex
    formula: str = Field(description="Human-readable modular arithmetic, e.g. '(0 + 3) mod 32 = 3'.")


class UnmodifiedCharDetails(Schema):
    is_modified: Literal[False]
    reason: str


class CipherStepSchema(Schema):
    index: int = Field(ge=0, description="Position of the character in the input text.")
    input_char: str
    output_char: str
    description: str


class CipherInfo(Schema):
    cipher_type: Literal["Caesar", "Vigenere", "Playfair"]
    alphabet: str
    alphabet_len: int = Field(gt=0)


class CiphersResponse(Schema):
    ciphers: list[CipherInfo]


# --- Caesar ---


class CaesarRequest(Schema):
    model_config = ConfigDict(extra="forbid")

    text: InputText
    shift: Shift


CaesarCharDetails = Annotated[ModifiedCharDetails | UnmodifiedCharDetails, Field(discriminator="is_modified")]


class CaesarStepSchema(CipherStepSchema):
    operation_details: CaesarCharDetails


class CaesarMetadata(Schema):
    cipher_type: Literal["Caesar"]
    mode: CipherMode
    shift: int = Field(description="Shift exactly as requested, before normalization.")
    alphabet_len: int = Field(gt=0)


class CaesarResponse(Schema):
    final_text: str
    steps: list[CaesarStepSchema]
    metadata: CaesarMetadata


class CaesarBruteForceRequest(Schema):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(
        min_length=1,
        description=(
            f"Ciphertext to break. Texts longer than {MAX_BRUTE_FORCE_TEXT_LENGTH} characters "
            "are rejected with 413 Payload Too Large."
        ),
        examples=["ŹCLPH"],
    )


class CaesarBruteForceCandidate(Schema):
    shift: int = Field(gt=0, description="Shift used to decrypt the ciphertext.")
    text: str = Field(description="Ciphertext decrypted with this shift.")


class CaesarBruteForceResponse(Schema):
    candidates: list[CaesarBruteForceCandidate] = Field(
        description="One candidate per non-trivial shift, ordered by shift (1 to alphabet_len - 1)."
    )
    alphabet_len: int = Field(gt=0)


# --- Vigenère ---


class VigenereRequest(Schema):
    model_config = ConfigDict(extra="forbid")

    text: InputText
    keyword: Keyword


class VigenereModifiedCharDetails(ModifiedCharDetails):
    key_char: str = Field(description="Keyword letter that determined the shift for this character.")


VigenereCharDetails = Annotated[
    VigenereModifiedCharDetails | UnmodifiedCharDetails, Field(discriminator="is_modified")
]


class VigenereStepSchema(CipherStepSchema):
    operation_details: VigenereCharDetails


class VigenereMetadata(Schema):
    cipher_type: Literal["Vigenere"]
    mode: CipherMode
    keyword: str = Field(description="Keyword after normalization: uppercased, characters outside the alphabet removed.")


class VigenereResponse(Schema):
    final_text: str
    steps: list[VigenereStepSchema]
    metadata: VigenereMetadata


# --- Playfair ---

PLAYFAIR_GRID_CELLS = 25


class PlayfairRequest(Schema):
    model_config = ConfigDict(extra="forbid")

    text: InputText
    keyword: PlayfairKeyword = ""


GridPosition = Annotated[
    list[Annotated[int, Field(ge=0, le=4)]],
    Field(min_length=2, max_length=2, description="'[row, column]' in the 5x5 grid."),
]


class PlayfairDigramDetails(Schema):
    is_modified: Literal[True]
    rule_applied: Literal["Wiersz", "Kolumna", "Prostokąt"] = Field(
        description="Playfair rule used for the digram: same row, same column or rectangle."
    )
    pos1: GridPosition
    pos2: GridPosition


class PlayfairStepSchema(CipherStepSchema):
    input_char: str = Field(min_length=2, max_length=2, description="Input digram.")
    output_char: str = Field(min_length=2, max_length=2, description="Output digram.")
    operation_details: PlayfairDigramDetails


class PlayfairMetadata(Schema):
    cipher_type: Literal["Playfair"]
    mode: CipherMode
    keyword: str = Field(description="Keyword after normalization: uppercased, 'J' merged into 'I', non A-Z removed.")
    matrix_1d: list[str] = Field(
        min_length=PLAYFAIR_GRID_CELLS,
        max_length=PLAYFAIR_GRID_CELLS,
        description="The 5x5 grid flattened row by row.",
    )


class PlayfairResponse(Schema):
    final_text: str = Field(description="Letters only, uppercase, without spaces or punctuation.")
    steps: list[PlayfairStepSchema]
    metadata: PlayfairMetadata
