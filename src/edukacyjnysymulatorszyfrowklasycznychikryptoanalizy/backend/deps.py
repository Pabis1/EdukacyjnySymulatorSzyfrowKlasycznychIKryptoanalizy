from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from ..core import CaesarCipher, VigenereCipher
from .config import Settings


@lru_cache
def get_settings() -> Settings:
    return Settings()


@lru_cache
def get_caesar_cipher() -> CaesarCipher:
    return CaesarCipher()


@lru_cache
def get_vigenere_cipher() -> VigenereCipher:
    return VigenereCipher()


CaesarCipherDep = Annotated[CaesarCipher, Depends(get_caesar_cipher)]
VigenereCipherDep = Annotated[VigenereCipher, Depends(get_vigenere_cipher)]
