from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from ..core import (
    DEFAULT_LANGUAGE,
    LANGUAGES,
    UnknownLanguageError,
    rank_caesar_candidates,
)
from .deps import (
    LanguageModelsDep,
    PlayfairCipherDep,
    get_caesar_cipher,
    get_language_models,
    get_settings,
    get_vigenere_cipher,
)
from .schemas import (
    CaesarBruteForceCandidate,
    CaesarBruteForceRequest,
    CaesarBruteForceResponse,
    CaesarRequest,
    CaesarResponse,
    CipherInfo,
    CiphersResponse,
    LanguageInfo,
    LanguagesResponse,
    PlayfairRequest,
    PlayfairResponse,
    VigenereRequest,
    VigenereResponse,
)
from .types import MAX_BRUTE_FORCE_TEXT_LENGTH, LanguageCode


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    # Train the language models before serving, so the first brute force request is not slow.
    get_language_models()
    yield


app = FastAPI(title="Classical Ciphers Simulator API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.exception_handler(UnknownLanguageError)
def unknown_language_handler(_request: Request, exc: UnknownLanguageError) -> JSONResponse:
    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"detail": str(exc)})


UNKNOWN_LANGUAGE_RESPONSE = {status.HTTP_400_BAD_REQUEST: {"description": "Unsupported language code."}}

api = APIRouter(prefix="/api/v1", responses=UNKNOWN_LANGUAGE_RESPONSE)


@api.get("/languages", response_model=LanguagesResponse, tags=["languages"])
def list_languages() -> LanguagesResponse:
    return LanguagesResponse(
        default=DEFAULT_LANGUAGE,
        languages=[
            LanguageInfo(code=lang.code, name=lang.name, alphabet=lang.alphabet, alphabet_len=len(lang.alphabet))
            for lang in LANGUAGES.values()
        ],
    )


@api.get("/ciphers", response_model=CiphersResponse, tags=["ciphers"])
def list_ciphers(playfair: PlayfairCipherDep, language: LanguageCode = DEFAULT_LANGUAGE) -> CiphersResponse:
    caesar = get_caesar_cipher(language)
    vigenere = get_vigenere_cipher(language)
    return CiphersResponse(
        language=language,
        ciphers=[
            CipherInfo(cipher_type="Caesar", alphabet=caesar.alphabet, alphabet_len=caesar.alphabet_len),
            CipherInfo(cipher_type="Vigenere", alphabet=vigenere.alphabet, alphabet_len=vigenere.alphabet_len),
            CipherInfo(cipher_type="Playfair", alphabet=playfair.alphabet, alphabet_len=len(playfair.alphabet)),
        ]
    )


@api.post("/caesar/encrypt", response_model=CaesarResponse, tags=["caesar"])
def caesar_encrypt(payload: CaesarRequest) -> CaesarResponse:
    cipher = get_caesar_cipher(payload.language)
    return CaesarResponse.model_validate(cipher.encrypt(payload.text, payload.shift))


@api.post("/caesar/decrypt", response_model=CaesarResponse, tags=["caesar"])
def caesar_decrypt(payload: CaesarRequest) -> CaesarResponse:
    cipher = get_caesar_cipher(payload.language)
    return CaesarResponse.model_validate(cipher.decrypt(payload.text, payload.shift))


@api.post(
    "/caesar/brute-force",
    response_model=CaesarBruteForceResponse,
    tags=["caesar"],
    responses={status.HTTP_413_CONTENT_TOO_LARGE: {"description": "Ciphertext is too long to brute force."}},
)
def caesar_brute_force_attack(payload: CaesarBruteForceRequest, models: LanguageModelsDep) -> CaesarBruteForceResponse:
    cipher = get_caesar_cipher(payload.language)
    # Checked here instead of via 'max_length' so the client gets 413, not a generic 422.
    if len(payload.text) > MAX_BRUTE_FORCE_TEXT_LENGTH:
        raise HTTPException(
            status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"Ciphertext exceeds the brute force limit of {MAX_BRUTE_FORCE_TEXT_LENGTH} characters.",
        )
    ranking = rank_caesar_candidates(payload.text, cipher, models[payload.language])
    return CaesarBruteForceResponse(
        candidates=[
            CaesarBruteForceCandidate(shift=c.shift, text=c.text, probability=c.probability)
            for c in ranking.candidates
        ],
        not_caesar_probability=ranking.not_caesar_probability,
        language=payload.language,
        alphabet_len=cipher.alphabet_len,
    )


@api.post("/vigenere/encrypt", response_model=VigenereResponse, tags=["vigenere"])
def vigenere_encrypt(payload: VigenereRequest) -> VigenereResponse:
    cipher = get_vigenere_cipher(payload.language)
    try:
        result = cipher.encrypt(payload.text, keyword=payload.keyword)
    except ValueError as exc:
        # Raised by the core when the keyword has no letters from the cipher alphabet.
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)) from exc
    return VigenereResponse.model_validate(result)


@api.post("/vigenere/decrypt", response_model=VigenereResponse, tags=["vigenere"])
def vigenere_decrypt(payload: VigenereRequest) -> VigenereResponse:
    cipher = get_vigenere_cipher(payload.language)
    try:
        result = cipher.decrypt(payload.text, keyword=payload.keyword)
    except ValueError as exc:
        # Raised by the core when the keyword has no letters from the cipher alphabet.
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)) from exc
    return VigenereResponse.model_validate(result)


@api.post("/playfair/encrypt", response_model=PlayfairResponse, tags=["playfair"])
def playfair_encrypt(payload: PlayfairRequest, cipher: PlayfairCipherDep) -> PlayfairResponse:
    return PlayfairResponse.model_validate(cipher.encrypt(payload.text, keyword=payload.keyword))


@api.post(
    "/playfair/decrypt",
    response_model=PlayfairResponse,
    tags=["playfair"],
    responses={
        status.HTTP_422_UNPROCESSABLE_CONTENT: {
            "description": "Ciphertext has an odd number of letters or a digram made of two identical letters."
        }
    },
)
def playfair_decrypt(payload: PlayfairRequest, cipher: PlayfairCipherDep) -> PlayfairResponse:
    try:
        result = cipher.decrypt(payload.text, keyword=payload.keyword)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)) from exc
    return PlayfairResponse.model_validate(result)


app.include_router(api)
