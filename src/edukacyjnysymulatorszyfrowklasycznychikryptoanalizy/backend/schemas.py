from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

from .types import AlphabetIndex, CipherMode, InputText, Keyword, Shift


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
    cipher_type: Literal["Caesar", "Vigenere"]
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
