from fastapi import APIRouter, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from .deps import CaesarCipherDep, VigenereCipherDep, get_settings
from .schemas import (
    CaesarRequest,
    CaesarResponse,
    CipherInfo,
    CiphersResponse,
    VigenereRequest,
    VigenereResponse,
)

app = FastAPI(title="Classical Ciphers Simulator API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api/v1")


@api.get("/ciphers", response_model=CiphersResponse, tags=["ciphers"])
def list_ciphers(caesar: CaesarCipherDep, vigenere: VigenereCipherDep) -> CiphersResponse:
    return CiphersResponse(
        ciphers=[
            CipherInfo(cipher_type="Caesar", alphabet=caesar.alphabet, alphabet_len=caesar.alphabet_len),
            CipherInfo(cipher_type="Vigenere", alphabet=vigenere.alphabet, alphabet_len=vigenere.alphabet_len),
        ]
    )


@api.post("/caesar/encrypt", response_model=CaesarResponse, tags=["caesar"])
def caesar_encrypt(payload: CaesarRequest, cipher: CaesarCipherDep) -> CaesarResponse:
    return CaesarResponse.model_validate(cipher.encrypt(payload.text, payload.shift))


@api.post("/caesar/decrypt", response_model=CaesarResponse, tags=["caesar"])
def caesar_decrypt(payload: CaesarRequest, cipher: CaesarCipherDep) -> CaesarResponse:
    return CaesarResponse.model_validate(cipher.decrypt(payload.text, payload.shift))


@api.post("/vigenere/encrypt", response_model=VigenereResponse, tags=["vigenere"])
def vigenere_encrypt(payload: VigenereRequest, cipher: VigenereCipherDep) -> VigenereResponse:
    try:
        result = cipher.encrypt(payload.text, keyword=payload.keyword)
    except ValueError as exc:
        # Raised by the core when the keyword has no letters from the cipher alphabet.
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)) from exc
    return VigenereResponse.model_validate(result)


@api.post("/vigenere/decrypt", response_model=VigenereResponse, tags=["vigenere"])
def vigenere_decrypt(payload: VigenereRequest, cipher: VigenereCipherDep) -> VigenereResponse:
    try:
        result = cipher.decrypt(payload.text, keyword=payload.keyword)
    except ValueError as exc:
        # Raised by the core when the keyword has no letters from the cipher alphabet.
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)) from exc
    return VigenereResponse.model_validate(result)


app.include_router(api)
