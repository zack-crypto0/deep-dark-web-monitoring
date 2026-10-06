from backend.database import SessionLocal

from backend.models.models import User

from backend.services.security import (
    hash_password
)


db = SessionLocal()


username = "admin"
email = "admin@ddw.local"
password = "Admin123!"


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


db.close()