from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .deps import CaesarCipherDep, get_settings
from .schemas import CaesarInfoResponse, CaesarRequest, CaesarResponse

app = FastAPI(title="Classical Ciphers Simulator API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api/v1")


@api.get("/caesar", response_model=CaesarInfoResponse, tags=["caesar"])
def caesar_info(cipher: CaesarCipherDep) -> CaesarInfoResponse:
    return CaesarInfoResponse(alphabet=cipher.alphabet, alphabet_len=cipher.alphabet_len)


@api.post("/caesar/encrypt", response_model=CaesarResponse, tags=["caesar"])
def caesar_encrypt(payload: CaesarRequest, cipher: CaesarCipherDep) -> CaesarResponse:
    return CaesarResponse.model_validate(cipher.encrypt(payload.text, payload.shift))


@api.post("/caesar/decrypt", response_model=CaesarResponse, tags=["caesar"])
def caesar_decrypt(payload: CaesarRequest, cipher: CaesarCipherDep) -> CaesarResponse:
    return CaesarResponse.model_validate(cipher.decrypt(payload.text, payload.shift))


app.include_router(api)
