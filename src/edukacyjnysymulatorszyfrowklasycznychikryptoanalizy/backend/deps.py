from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from ..core import CaesarCipher, PlayfairCipher, VigenereCipher, get_language
from .config import Settings


@lru_cache
def get_settings() -> Settings:
    return Settings()


# Ciphers are stateless, so one instance per language is cached and shared between requests.
# Unknown codes raise 'UnknownLanguageError', which the app turns into 400 Bad Request.


@lru_cache
def get_caesar_cipher(language: str) -> CaesarCipher:
    return CaesarCipher(alphabet=get_language(language).alphabet)


@lru_cache
def get_vigenere_cipher(language: str) -> VigenereCipher:
    return VigenereCipher(alphabet=get_language(language).alphabet)


@lru_cache
def get_playfair_cipher() -> PlayfairCipher:
    return PlayfairCipher()


PlayfairCipherDep = Annotated[PlayfairCipher, Depends(get_playfair_cipher)]
