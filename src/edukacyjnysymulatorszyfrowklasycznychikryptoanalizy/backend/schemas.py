from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

from .types import AlphabetIndex, CipherMode, InputText, Shift


class Schema(BaseModel):
    model_config = ConfigDict(from_attributes=True, frozen=True)


class CaesarRequest(Schema):
    model_config = ConfigDict(extra="forbid")

    text: InputText
    shift: Shift


class ModifiedCharDetails(Schema):
    is_modified: Literal[True]
    original_index: AlphabetIndex
    shift_applied: AlphabetIndex = Field(description="Effective shift after normalization modulo the alphabet length.")
    new_index: AlphabetIndex
    formula: str = Field(description="Human-readable modular arithmetic, e.g. '(0 + 3) mod 32 = 3'.")


class UnmodifiedCharDetails(Schema):
    is_modified: Literal[False]
    reason: str


CharDetails = Annotated[ModifiedCharDetails | UnmodifiedCharDetails, Field(discriminator="is_modified")]


class CipherStepSchema(Schema):
    index: int = Field(ge=0, description="Position of the character in the input text.")
    input_char: str
    output_char: str
    operation_details: CharDetails
    description: str


class CaesarMetadata(Schema):
    cipher_type: Literal["Caesar"]
    mode: CipherMode
    shift: int = Field(description="Shift exactly as requested, before normalization.")
    alphabet_len: int = Field(gt=0)


class CaesarResponse(Schema):
    final_text: str
    steps: list[CipherStepSchema]
    metadata: CaesarMetadata


class CaesarInfoResponse(Schema):
    cipher_type: Literal["Caesar"] = "Caesar"
    alphabet: str
    alphabet_len: int = Field(gt=0)
