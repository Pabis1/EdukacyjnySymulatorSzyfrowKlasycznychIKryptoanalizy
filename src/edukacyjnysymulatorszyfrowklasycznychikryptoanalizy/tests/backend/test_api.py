import pytest
from fastapi.testclient import TestClient

from edukacyjnysymulatorszyfrowklasycznychikryptoanalizy.backend.app import app
from edukacyjnysymulatorszyfrowklasycznychikryptoanalizy.backend.types import (
    MAX_BRUTE_FORCE_TEXT_LENGTH,
    MAX_KEYWORD_LENGTH,
)


@pytest.fixture
def client():
    return TestClient(app)


def test_list_ciphers(client):
    response = client.get("/api/v1/ciphers")
    assert response.status_code == 200

    ciphers = {c["cipher_type"]: c for c in response.json()["ciphers"]}
    assert set(ciphers) == {"Caesar", "Vigenere", "Playfair"}
    assert ciphers["Vigenere"]["alphabet_len"] == len(ciphers["Vigenere"]["alphabet"]) == 32
    assert ciphers["Playfair"]["alphabet_len"] == len(ciphers["Playfair"]["alphabet"]) == 25
    assert "J" not in ciphers["Playfair"]["alphabet"]


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


def test_caesar_brute_force_returns_every_shift(client):
    ciphertext = client.post("/api/v1/caesar/encrypt", json={"text": "Tajne, hasło!", "shift": 5}).json()["final_text"]

    response = client.post("/api/v1/caesar/brute-force", json={"text": ciphertext})
    assert response.status_code == 200

    body = response.json()
    assert body["language"] == "pl"
    assert body["alphabet_len"] == 32
    assert sorted(c["shift"] for c in body["candidates"]) == list(range(1, 32))
    assert sum(c["probability"] for c in body["candidates"]) + body["not_caesar_probability"] == pytest.approx(1)
    assert body["not_caesar_probability"] < body["candidates"][0]["probability"]


def test_caesar_brute_force_flags_vigenere_as_not_caesar(client):
    ciphertext = client.post(
        "/api/v1/vigenere/encrypt",
        json={"text": "Spotkajmy się jutro o ósmej przy dworcu głównym", "keyword": "KLUCZ"},
    ).json()["final_text"]

    body = client.post("/api/v1/caesar/brute-force", json={"text": ciphertext}).json()
    assert body["not_caesar_probability"] > 0.99
    assert body["candidates"][0]["probability"] < 0.01


def test_caesar_brute_force_ranks_plaintext_first(client):
    ciphertext = client.post(
        "/api/v1/caesar/encrypt", json={"text": "Spotkajmy się jutro o ósmej", "shift": 5}
    ).json()["final_text"]

    candidates = client.post("/api/v1/caesar/brute-force", json={"text": ciphertext}).json()["candidates"]
    assert candidates[0]["shift"] == 5
    assert candidates[0]["text"] == "Spotkajmy się jutro o ósmej"
    assert candidates[0]["probability"] > 0.99
    probabilities = [c["probability"] for c in candidates]
    assert probabilities == sorted(probabilities, reverse=True)


def test_caesar_brute_force_accepts_text_at_limit(client):
    response = client.post("/api/v1/caesar/brute-force", json={"text": "A" * MAX_BRUTE_FORCE_TEXT_LENGTH})
    assert response.status_code == 200


def test_caesar_brute_force_rejects_too_long_text(client):
    response = client.post("/api/v1/caesar/brute-force", json={"text": "A" * (MAX_BRUTE_FORCE_TEXT_LENGTH + 1)})
    assert response.status_code == 413
    assert str(MAX_BRUTE_FORCE_TEXT_LENGTH) in response.json()["detail"]


@pytest.mark.parametrize("payload", [{"text": ""}, {}, {"text": "ABC", "shift": 3}])
def test_caesar_brute_force_rejects_invalid_payload(client, payload):
    response = client.post("/api/v1/caesar/brute-force", json=payload)
    assert response.status_code == 422


def test_playfair_encrypt(client):
    response = client.post(
        "/api/v1/playfair/encrypt", json={"text": "Hide the gold in the tree stump", "keyword": "playfair example"}
    )
    assert response.status_code == 200

    body = response.json()
    # Textbook example from Wikipedia ('EE' in 'tree' is split with an 'X').
    assert body["final_text"] == "BMODZBXDNABEKUDMUIXMMOUVIF"
    assert [step["input_char"] for step in body["steps"]] == [
        "HI", "DE", "TH", "EG", "OL", "DI", "NT", "HE", "TR", "EX", "ES", "TU", "MP",
    ]
    assert body["steps"][0]["operation_details"]["rule_applied"] == "Prostokąt"
    assert body["metadata"]["cipher_type"] == "Playfair"
    assert body["metadata"]["mode"] == "encrypt"
    assert body["metadata"]["keyword"] == "PLAYFAIREXAMPLE"
    assert "".join(body["metadata"]["matrix_1d"]) == "PLAYFIREXMBCDGHKNOQSTUVWZ"


def test_playfair_replaces_j_with_i(client):
    with_j = client.post("/api/v1/playfair/encrypt", json={"text": "Jajo", "keyword": "Jabłko"}).json()
    with_i = client.post("/api/v1/playfair/encrypt", json={"text": "IAIO", "keyword": "IABKO"}).json()
    assert with_j["final_text"] == with_i["final_text"]
    assert with_j["metadata"]["keyword"] == "IABKO"
    assert [step["input_char"] for step in with_j["steps"]] == ["IA", "IO"]


def test_playfair_roundtrip(client):
    encrypted = client.post("/api/v1/playfair/encrypt", json={"text": "Secret message!", "keyword": "Enigma"}).json()
    decrypted = client.post(
        "/api/v1/playfair/decrypt", json={"text": encrypted["final_text"], "keyword": "Enigma"}
    ).json()
    assert decrypted["final_text"] == "SECRETMESXSAGE"
    assert decrypted["metadata"]["mode"] == "decrypt"


def test_playfair_keyword_is_optional(client):
    response = client.post("/api/v1/playfair/encrypt", json={"text": "AB"})
    assert response.status_code == 200
    assert response.json()["final_text"] == "BC"
    assert response.json()["metadata"]["keyword"] == ""


@pytest.mark.parametrize(
    ("ciphertext", "message"),
    [("ABC", "parzystą liczbę liter"), ("AA", "dwiema takimi samymi literami")],
    ids=["odd-length", "identical-letters"],
)
def test_playfair_decrypt_rejects_invalid_ciphertext(client, ciphertext, message):
    response = client.post("/api/v1/playfair/decrypt", json={"text": ciphertext, "keyword": "KLUCZ"})
    assert response.status_code == 422
    assert message in response.json()["detail"]


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"text": "TEST", "keyword": "K" * (MAX_KEYWORD_LENGTH + 1)},
        {"text": "TEST", "keyword": "KLUCZ", "shift": 3},
    ],
    ids=["missing-text", "too-long-keyword", "extra-field"],
)
def test_playfair_invalid_request(client, payload):
    response = client.post("/api/v1/playfair/encrypt", json=payload)
    assert response.status_code == 422


def test_list_languages(client):
    response = client.get("/api/v1/languages")
    assert response.status_code == 200

    body = response.json()
    assert body["default"] == "pl"
    languages = {lang["code"]: lang for lang in body["languages"]}
    assert list(languages) == ["pl", "de", "el", "en", "es"]
    assert languages["el"]["alphabet"] == "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ"
    assert all(lang["alphabet_len"] == len(lang["alphabet"]) for lang in languages.values())


def test_list_ciphers_for_language(client):
    response = client.get("/api/v1/ciphers", params={"language": "en"})
    assert response.status_code == 200

    body = response.json()
    assert body["language"] == "en"
    ciphers = {c["cipher_type"]: c for c in body["ciphers"]}
    assert ciphers["Caesar"]["alphabet"] == ciphers["Vigenere"]["alphabet"] == "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    assert ciphers["Playfair"]["alphabet_len"] == 25


def test_requests_default_to_polish(client):
    explicit = client.post("/api/v1/caesar/encrypt", json={"text": "Ż", "shift": 1, "language": "pl"}).json()
    implicit = client.post("/api/v1/caesar/encrypt", json={"text": "Ż", "shift": 1}).json()
    assert explicit == implicit
    assert implicit["final_text"] == "A"


@pytest.mark.parametrize(
    ("language", "text", "expected", "alphabet_len"),
    [("en", "Xyz", "Yza", 26), ("es", "Niño", "Ñjop", 27), ("el", "Ωμέγα", "Ανέδβ", 24)],
)
def test_caesar_encrypt_in_language(client, language, text, expected, alphabet_len):
    response = client.post("/api/v1/caesar/encrypt", json={"text": text, "shift": 1, "language": language})
    assert response.status_code == 200
    assert response.json()["final_text"] == expected
    assert response.json()["metadata"]["alphabet_len"] == alphabet_len


def test_caesar_brute_force_in_language(client):
    ciphertext = client.post(
        "/api/v1/caesar/encrypt", json={"text": "Hallo Welt", "shift": 4, "language": "de"}
    ).json()["final_text"]

    body = client.post("/api/v1/caesar/brute-force", json={"text": ciphertext, "language": "de"}).json()
    assert body["language"] == "de"
    assert body["alphabet_len"] == 29
    assert len(body["candidates"]) == 28
    assert body["candidates"][0]["shift"] == 4
    assert body["candidates"][0]["text"] == "Hallo Welt"
    assert body["candidates"][0]["probability"] > 0.9


def test_vigenere_roundtrip_in_greek(client):
    text = "Καλημέρα κόσμε!"
    payload = {"keyword": "κλειδί", "language": "el"}
    encrypted = client.post("/api/v1/vigenere/encrypt", json={"text": text, **payload}).json()
    assert encrypted["metadata"]["keyword"] == "ΚΛΕΙΔ"
    decrypted = client.post("/api/v1/vigenere/decrypt", json={"text": encrypted["final_text"], **payload}).json()
    assert decrypted["final_text"] == text


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        ("post", "/api/v1/caesar/encrypt", {"text": "A", "shift": 1, "language": "xx"}),
        ("post", "/api/v1/caesar/decrypt", {"text": "A", "shift": 1, "language": "PL"}),
        ("post", "/api/v1/caesar/brute-force", {"text": "A", "language": "klingon"}),
        ("post", "/api/v1/vigenere/encrypt", {"text": "A", "keyword": "B", "language": ""}),
        ("post", "/api/v1/vigenere/decrypt", {"text": "A", "keyword": "B", "language": "xx"}),
        ("get", "/api/v1/ciphers?language=xx", None),
    ],
    ids=[
        "caesar-encrypt",
        "caesar-decrypt-uppercase",
        "brute-force",
        "vigenere-encrypt-empty",
        "vigenere-decrypt",
        "ciphers",
    ],
)
def test_unknown_language_returns_400(client, method, path, payload):
    response = client.request(method, path, json=payload)
    assert response.status_code == 400
    assert "Nieobsługiwany język" in response.json()["detail"]


def test_vigenere_keyword_outside_language_alphabet(client):
    # Latin keyword has no letters from the Greek alphabet.
    response = client.post("/api/v1/vigenere/encrypt", json={"text": "Καλημέρα", "keyword": "KEY", "language": "el"})
    assert response.status_code == 422
