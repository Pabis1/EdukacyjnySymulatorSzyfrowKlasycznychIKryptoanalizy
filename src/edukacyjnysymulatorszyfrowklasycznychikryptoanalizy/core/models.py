from dataclasses import dataclass, field
from typing import List, Dict, Any

@dataclass
class CipherStep:
    """Reprezentuje pojedynczy krok edukacyjny (transformację jednego znaku)."""
    input_char: str
    output_char: str
    index: int
    operation_details: Dict[str, Any]
    description: str

@dataclass
class CipherResult:
    """Kompletny wynik operacji przekazywany do Backendu i Frontendu."""
    final_text: str
    steps: List[CipherStep]
    metadata: Dict[str, Any] = field(default_factory=dict)