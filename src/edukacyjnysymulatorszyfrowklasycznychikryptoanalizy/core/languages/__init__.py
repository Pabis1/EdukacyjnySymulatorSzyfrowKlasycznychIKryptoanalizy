"""Registry of supported languages, loaded from the '*.json' configs in this package.

Adding a language only requires a new '<code>.json' file with 'code', 'name' and 'alphabet'.
"""

import json
from dataclasses import dataclass
from importlib.resources import files
from types import MappingProxyType

DEFAULT_LANGUAGE = "pl"


@dataclass(frozen=True)
class Language:
    code: str
    name: str
    alphabet: str

    def __post_init__(self) -> None:
        if not self.alphabet:
            raise ValueError(f"Language '{self.code}' has an empty alphabet.")
        if len(set(self.alphabet)) != len(self.alphabet):
            raise ValueError(f"Language '{self.code}' has repeated letters in its alphabet.")
        # Ciphers compare 'char.upper()' against the alphabet and restore case with '.lower()',
        # so every letter must be uppercase and survive that roundtrip as a single character.
        if any(c.lower().upper() != c for c in self.alphabet):
            raise ValueError(f"Language '{self.code}' alphabet must contain only case-reversible uppercase letters.")


class UnknownLanguageError(ValueError):
    def __init__(self, code: str):
        super().__init__(f"Nieobsługiwany język '{code}'. Dostępne: {', '.join(LANGUAGES)}.")
        self.code = code


def _load_languages() -> dict[str, Language]:
    languages = {}
    for resource in sorted(files(__package__).iterdir(), key=lambda r: r.name):
        if not resource.name.endswith(".json"):
            continue
        language = Language(**json.loads(resource.read_text(encoding="utf-8")))
        if f"{language.code}.json" != resource.name:
            raise ValueError(f"Language config '{resource.name}' declares code '{language.code}'.")
        languages[language.code] = language
    # Default language first (e.g. for a UI picker), the rest alphabetically by code.
    return dict(sorted(languages.items(), key=lambda item: (item[0] != DEFAULT_LANGUAGE, item[0])))


LANGUAGES: MappingProxyType[str, Language] = MappingProxyType(_load_languages())

if DEFAULT_LANGUAGE not in LANGUAGES:
    raise RuntimeError(f"Default language '{DEFAULT_LANGUAGE}' has no config file.")


def get_language(code: str) -> Language:
    """Returns the language for 'code' or raises 'UnknownLanguageError'."""
    try:
        return LANGUAGES[code]
    except KeyError:
        raise UnknownLanguageError(code) from None


__all__ = ["DEFAULT_LANGUAGE", "LANGUAGES", "Language", "UnknownLanguageError", "get_language"]
