from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from ..core import CaesarCipher
from .config import Settings


@lru_cache
def get_settings() -> Settings:
    return Settings()


@lru_cache
def get_caesar_cipher() -> CaesarCipher:
    return CaesarCipher()


CaesarCipherDep = Annotated[CaesarCipher, Depends(get_caesar_cipher)]
