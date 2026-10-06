import os

from dotenv import load_dotenv

from backend.database import SessionLocal
from backend.models.models import User
from backend.services.security import hash_password


# ==========================================
# LOAD ENVIRONMENT VARIABLES
# ==========================================

load_dotenv()


username = os.getenv("ADMIN_USERNAME")
email = os.getenv("ADMIN_EMAIL")
password = os.getenv("ADMIN_PASSWORD")


if not username:
    raise RuntimeError(
        "ADMIN_USERNAME is not configured."
    )

if not email:
    raise RuntimeError(
        "ADMIN_EMAIL is not configured."
    )

if not password:
    raise RuntimeError(
        "ADMIN_PASSWORD is not configured."
    )


# ==========================================
# CREATE ADMIN
# ==========================================

db = SessionLocal()

try:

    existing_user = (
        db.query(User)
        .filter(
            User.username == username
        )
        .first()
    )

    if existing_user:

        print(
            "Admin account already exists."
        )

    else:

        admin = User(
            username=username,
            email=email,
            password_hash=hash_password(
                password
            ),
            role="admin"
        )

        db.add(admin)

        db.commit()

        print(
            "Admin account created successfully."
        )

finally:

    db.close()