from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db

from backend.models.models import (
    AuthSession,
    User
)

from backend.services.rbac import (
    require_roles
)

from backend.services.security import (
    hash_password
)

from backend.services.audit_service import (
    create_audit_log
)


router = APIRouter(
    prefix="/users",
    tags=["User Management"]
)


ALLOWED_ROLES = [

    "admin",

    "analyst",

    "viewer"
]


# ==========================================
# REQUEST MODELS
# ==========================================

class UserCreate(BaseModel):

    username: str
    email: str
    password: str
    role: str = "viewer"


class UserRoleUpdate(BaseModel):

    role: str


class UserStatusUpdate(BaseModel):

    is_active: bool


# ==========================================
# GET USERS
# ==========================================

@router.get("/")
def get_users(

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_roles("admin")
    )
):

    users = (

        db.query(User)

        .order_by(
            User.created_at.desc()
        )

        .all()
    )


    result = []


    for user in users:

        result.append(
            {

                "user_id":
                    user.user_id,

                "username":
                    user.username,

                "email":
                    user.email,

                "role":
                    user.role,

                "is_active":
                    user.is_active,

                "created_at":
                    user.created_at
            }
        )


    return result


# ==========================================
# CREATE USER
# ==========================================

@router.post("/")
def create_user(

    request: UserCreate,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_roles("admin")
    )
):

    username = (
        request.username.strip()
    )


    email = (
        request.email.strip()
    )


    role = (
        request.role
        .strip()
        .lower()
    )


    if len(username) < 3:

        raise HTTPException(
            status_code=400,
            detail=(
                "Username must contain "
                "at least 3 characters"
            )
        )


    if "@" not in email:

        raise HTTPException(
            status_code=400,
            detail=(
                "Please enter a valid "
                "email address"
            )
        )


    if len(request.password) < 8:

        raise HTTPException(
            status_code=400,
            detail=(
                "Password must contain "
                "at least 8 characters"
            )
        )


    if role not in ALLOWED_ROLES:

        raise HTTPException(
            status_code=400,
            detail="Invalid user role"
        )


    existing_username = (

        db.query(User)

        .filter(
            User.username
            == username
        )

        .first()
    )


    if existing_username:

        raise HTTPException(
            status_code=409,
            detail=(
                "Username already exists"
            )
        )


    existing_email = (

        db.query(User)

        .filter(
            User.email
            == email
        )

        .first()
    )


    if existing_email:

        raise HTTPException(
            status_code=409,
            detail=(
                "Email address already exists"
            )
        )


    new_user = User(

        username=username,

        email=email,

        password_hash=(
            hash_password(
                request.password
            )
        ),

        role=role,

        is_active=True
    )


    db.add(new_user)

    db.flush()


    create_audit_log(

        db=db,

        user_id=(
            current_user.user_id
        ),

        action="CREATE_USER",

        record_type="User",

        record_id=(
            new_user.user_id
        )
    )


    db.commit()

    db.refresh(new_user)


    return {

        "message":
            "User created successfully",

        "user": {

            "user_id":
                new_user.user_id,

            "username":
                new_user.username,

            "email":
                new_user.email,

            "role":
                new_user.role,

            "is_active":
                new_user.is_active
        }
    }


# ==========================================
# UPDATE ROLE
# ==========================================

@router.put("/{user_id}/role")
def update_user_role(

    user_id: int,

    request: UserRoleUpdate,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_roles("admin")
    )
):

    role = (
        request.role
        .strip()
        .lower()
    )


    if role not in ALLOWED_ROLES:

        raise HTTPException(
            status_code=400,
            detail="Invalid user role"
        )


    user = (

        db.query(User)

        .filter(
            User.user_id
            == user_id
        )

        .first()
    )


    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )


    if (
        user.user_id
        == current_user.user_id

        and role != "admin"
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "You cannot remove "
                "your own administrator role"
            )
        )


    user.role = role


    create_audit_log(

        db=db,

        user_id=(
            current_user.user_id
        ),

        action=(
            "UPDATE_USER_ROLE"
        ),

        record_type="User",

        record_id=user.user_id
    )


    db.commit()

    db.refresh(user)


    return {

        "message":
            "User role updated successfully",

        "user_id":
            user.user_id,

        "role":
            user.role
    }


# ==========================================
# ACTIVATE / DEACTIVATE
# ==========================================

@router.put("/{user_id}/status")
def update_user_status(

    user_id: int,

    request: UserStatusUpdate,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_roles("admin")
    )
):

    user = (

        db.query(User)

        .filter(
            User.user_id
            == user_id
        )

        .first()
    )


    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )


    if (
        user.user_id
        == current_user.user_id

        and request.is_active
        is False
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "You cannot deactivate "
                "your own account"
            )
        )


    user.is_active = (
        request.is_active
    )


    create_audit_log(

        db=db,

        user_id=(
            current_user.user_id
        ),

        action=(
            "UPDATE_USER_STATUS"
        ),

        record_type="User",

        record_id=user.user_id
    )


    # Remove login sessions
    # when account deactivated
    if not request.is_active:

        (
            db.query(AuthSession)

            .filter(
                AuthSession.user_id
                == user.user_id
            )

            .delete(
                synchronize_session=False
            )
        )


    db.commit()

    db.refresh(user)


    return {

        "message":
            (
                "User activated successfully"

                if user.is_active

                else

                "User deactivated successfully"
            ),

        "user_id":
            user.user_id,

        "is_active":
            user.is_active
    }   