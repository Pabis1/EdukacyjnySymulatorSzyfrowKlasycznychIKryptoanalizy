from dataclasses import dataclass, field
from typing import Any


@dataclass
class CipherStep:
    """Reprezentuje pojedynczy krok edukacyjny (transformację jednego znaku)."""
    input_char: str
    output_char: str
    index: int
    operation_details: dict[str, Any]
    description: str

@dataclass
class CipherResult:
    """Kompletny wynik operacji przekazywany do Backendu i Frontendu."""
    final_text: str
    steps: list[CipherStep]
    metadata: dict[str, Any] = field(default_factory=dict)