from abc import ABC, abstractmethod
from .models import CipherResult

class BaseCipher(ABC):
    """Abstrakcyjny kontrakt dla algorytmów szyfrujących."""

    @abstractmethod
    def encrypt(self, text: str, **kwargs) -> CipherResult:
        pass

    @abstractmethod
    def decrypt(self, text: str, **kwargs) -> CipherResult:
        pass