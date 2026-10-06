import hashlib
import hmac
import secrets


def hash_password(password: str) -> str:

    salt = secrets.token_bytes(16)

    password_hash = hashlib.scrypt(
        password.encode(),
        salt=salt,
        n=16384,
        r=8,
        p=1
    )

    return (
        salt.hex()
        + ":"
        + password_hash.hex()
    )


def verify_password(
    password: str,
    stored_hash: str
) -> bool:

    try:

        salt_hex, password_hash_hex = (
            stored_hash.split(":")
        )

        salt = bytes.fromhex(salt_hex)

        expected_hash = bytes.fromhex(
            password_hash_hex
        )

        calculated_hash = hashlib.scrypt(
            password.encode(),
            salt=salt,
            n=16384,
            r=8,
            p=1
        )

        return hmac.compare_digest(
            calculated_hash,
            expected_hash
        )

    except Exception:

        return False


def generate_session_token() -> str:

    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:

    return hashlib.sha256(
        token.encode()
    ).hexdigest()