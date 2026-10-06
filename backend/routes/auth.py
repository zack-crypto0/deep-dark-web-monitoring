from datetime import (
    datetime,
    timedelta,
    timezone
)

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Security
)

from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer
)

from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db

from backend.models.models import (
    AuthSession,
    User
)

from backend.services.security import (
    generate_session_token,
    hash_token,
    verify_password
)

from backend.services.audit_service import (
    create_audit_log
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# ==========================================
# BEARER AUTHENTICATION
# ==========================================

bearer_scheme = HTTPBearer(
    auto_error=False
)


# ==========================================
# LOGIN REQUEST
# ==========================================

class LoginRequest(BaseModel):

    username: str
    password: str


# ==========================================
# GET CURRENT USER
# ==========================================

def get_current_user(

    credentials: HTTPAuthorizationCredentials
    | None = Security(
        bearer_scheme
    ),

    db: Session = Depends(
        get_db
    )

):

    # No Bearer token supplied
    if credentials is None:

        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )


    # Make sure scheme is Bearer
    if (
        credentials.scheme.lower()
        != "bearer"
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid authentication scheme"
        )


    token = (
        credentials.credentials
    )


    if not token:

        raise HTTPException(
            status_code=401,
            detail="Authentication token missing"
        )


    token_hash_value = (
        hash_token(token)
    )


    # ======================================
    # FIND SESSION
    # ======================================

    session = (

        db.query(AuthSession)

        .filter(
            AuthSession.token_hash
            == token_hash_value
        )

        .first()
    )


    if not session:

        raise HTTPException(
            status_code=401,
            detail="Invalid session token"
        )


    # ======================================
    # CHECK EXPIRY
    # ======================================

    current_time = datetime.now(
        timezone.utc
    )


    expiry = (
        session.expires_at
    )


    if expiry.tzinfo is None:

        expiry = expiry.replace(
            tzinfo=timezone.utc
        )


    if expiry <= current_time:

        db.delete(session)

        db.commit()

        raise HTTPException(
            status_code=401,
            detail="Session expired"
        )


    # ======================================
    # GET USER
    # ======================================

    user = (

        db.query(User)

        .filter(
            User.user_id
            == session.user_id
        )

        .first()
    )


    if not user:

        raise HTTPException(
            status_code=401,
            detail="User not found"
        )


    if not user.is_active:

        db.delete(session)

        db.commit()

        raise HTTPException(
            status_code=403,
            detail="Account has been deactivated"
        )


    return user


# ==========================================
# LOGIN
# ==========================================

@router.post("/login")
def login(

    request: LoginRequest,

    db: Session = Depends(
        get_db
    )

):

    user = (

        db.query(User)

        .filter(
            User.username
            == request.username
        )

        .first()
    )


    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )


    if not user.is_active:

        raise HTTPException(
            status_code=403,
            detail="Account has been deactivated"
        )


    if not verify_password(
        request.password,
        user.password_hash
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )


    # ======================================
    # CREATE TOKEN
    # ======================================

    token = (
        generate_session_token()
    )


    token_hash_value = (
        hash_token(token)
    )


    expires_at = (

        datetime.now(
            timezone.utc
        )

        + timedelta(
            hours=8
        )
    )


    # ======================================
    # CREATE SESSION
    # ======================================

    new_session = AuthSession(

        user_id=(
            user.user_id
        ),

        token_hash=(
            token_hash_value
        ),

        expires_at=(
            expires_at
        )
    )


    db.add(
        new_session
    )


    # ======================================
    # AUDIT LOGIN
    # ======================================

    create_audit_log(

        db=db,

        user_id=(
            user.user_id
        ),

        action="LOGIN",

        record_type="User",

        record_id=(
            user.user_id
        )
    )


    db.commit()


    return {

        "message":
            "Login successful",

        "token":
            token,

        "token_type":
            "bearer",

        "expires_in_hours":
            8,

        "user": {

            "user_id":
                user.user_id,

            "username":
                user.username,

            "email":
                user.email,

            "role":
                user.role,

            "is_active":
                user.is_active
        }
    }


# ==========================================
# CURRENT USER
# ==========================================

@router.get("/me")
def get_profile(

    current_user: User = Depends(
        get_current_user
    )

):

    return {

        "user_id":
            current_user.user_id,

        "username":
            current_user.username,

        "email":
            current_user.email,

        "role":
            current_user.role,

        "is_active":
            current_user.is_active
    }


# ==========================================
# LOGOUT
# ==========================================

@router.post("/logout")
def logout(

    credentials: HTTPAuthorizationCredentials
    | None = Security(
        bearer_scheme
    ),

    db: Session = Depends(
        get_db
    )

):

    if credentials is None:

        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )


    token = (
        credentials.credentials
    )


    token_hash_value = (
        hash_token(token)
    )


    session = (

        db.query(AuthSession)

        .filter(
            AuthSession.token_hash
            == token_hash_value
        )

        .first()
    )


    if not session:

        raise HTTPException(
            status_code=401,
            detail="Invalid session token"
        )


    # ======================================
    # AUDIT LOGOUT
    # ======================================

    create_audit_log(

        db=db,

        user_id=(
            session.user_id
        ),

        action="LOGOUT",

        record_type="User",

        record_id=(
            session.user_id
        )
    )


    db.delete(
        session
    )

    db.commit()


    return {

        "message":
            "Logout successful"
    }