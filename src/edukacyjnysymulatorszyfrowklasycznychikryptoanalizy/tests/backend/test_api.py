import pytest
from fastapi.testclient import TestClient

from edukacyjnysymulatorszyfrowklasycznychikryptoanalizy.backend.app import app
from edukacyjnysymulatorszyfrowklasycznychikryptoanalizy.backend.types import (
    MAX_KEYWORD_LENGTH,
)


@pytest.fixture
def client():
    return TestClient(app)


def test_list_ciphers(client):
    response = client.get("/api/v1/ciphers")
    assert response.status_code == 200

    ciphers = {c["cipher_type"]: c for c in response.json()["ciphers"]}
    assert set(ciphers) == {"Caesar", "Vigenere"}
    assert ciphers["Vigenere"]["alphabet_len"] == len(ciphers["Vigenere"]["alphabet"]) == 32


def test_caesar_encrypt(client):
    response = client.post("/api/v1/caesar/encrypt", json={"text": "A", "shift": 3})
    assert response.status_code == 200
    assert response.json()["final_text"] == "C"


def test_vigenere_encrypt(client):
    response = client.post("/api/v1/vigenere/encrypt", json={"text": "A B", "keyword": "bą"})
    assert response.status_code == 200

    body = response.json()
    assert body["final_text"] == "B C"
    assert body["metadata"] == {"cipher_type": "Vigenere", "mode": "encrypt", "keyword": "BĄ"}
    assert body["steps"][0]["operation_details"]["key_char"] == "B"
    assert body["steps"][1]["operation_details"]["is_modified"] is False
    assert body["steps"][2]["operation_details"]["key_char"] == "Ą"


def test_vigenere_decrypt(client):
    response = client.post("/api/v1/vigenere/decrypt", json={"text": "B C", "keyword": "BĄ"})
    assert response.status_code == 200
    assert response.json()["final_text"] == "A B"
    assert response.json()["metadata"]["mode"] == "decrypt"


def test_vigenere_roundtrip(client):
    text = "Pchnąć w tę łódź jeża lub ośm skrzyń fig! 123"
    encrypted = client.post("/api/v1/vigenere/encrypt", json={"text": text, "keyword": "Szyfr"}).json()
    decrypted = client.post(
        "/api/v1/vigenere/decrypt", json={"text": encrypted["final_text"], "keyword": "Szyfr"}
    ).json()
    assert decrypted["final_text"] == text


@pytest.mark.parametrize("mode", ["encrypt", "decrypt"])
def test_vigenere_keyword_without_alphabet_letters(client, mode):
    response = client.post(f"/api/v1/vigenere/{mode}", json={"text": "TEST", "keyword": "123 !"})
    assert response.status_code == 422
    assert "Klucz musi zawierać" in response.json()["detail"]


@pytest.mark.parametrize(
    "payload",
    [
        {"text": "TEST"},
        {"text": "TEST", "keyword": ""},
        {"text": "TEST", "keyword": "K" * (MAX_KEYWORD_LENGTH + 1)},
        {"text": "TEST", "keyword": "KLUCZ", "shift": 3},
    ],
    ids=["missing", "empty", "too-long", "extra-field"],
)
def test_vigenere_invalid_request(client, payload):
    response = client.post("/api/v1/vigenere/encrypt", json=payload)
    assert response.status_code == 422
