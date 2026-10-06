from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query
)

from pydantic import BaseModel

from sqlalchemy import (
    asc,
    desc,
    or_
)

from sqlalchemy.orm import Session

from backend.database import get_db

from backend.models.models import (
    Finding,
    User,
    Watchlist
)

from backend.routes.auth import (
    get_current_user
)

from backend.services.rbac import (
    require_roles
)

from backend.services.audit_service import (
    create_audit_log
)


router = APIRouter(
    prefix="/watchlists",
    tags=["Watchlists"]
)


ALLOWED_ASSET_TYPES = [
    "domain",
    "email",
    "ip",
    "keyword"
]


ALLOWED_STATUSES = [
    "Active",
    "Inactive"
]


# ==========================================
# REQUEST MODELS
# ==========================================

class WatchlistCreate(BaseModel):

    asset_type: str
    asset_value: str
    category: str | None = None


class WatchlistUpdate(BaseModel):

    asset_type: str
    asset_value: str
    category: str | None = None


class WatchlistStatusUpdate(BaseModel):

    status: str


# ==========================================
# GET WATCHLISTS
# SEARCH + FILTER + SORT
# ==========================================

@router.get("/")
def get_watchlists(

    search: str | None = Query(
        default=None
    ),

    asset_type: str | None = Query(
        default=None
    ),

    status: str | None = Query(
        default=None
    ),

    sort: str = Query(
        default="newest"
    ),

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_user
    )
):

    query = db.query(
        Watchlist
    )


    # ======================================
    # SEARCH
    # ======================================

    if search and search.strip():

        search_term = (
            f"%{search.strip()}%"
        )


        query = query.filter(

            or_(

                Watchlist.asset_value.ilike(
                    search_term
                ),

                Watchlist.asset_type.ilike(
                    search_term
                ),

                Watchlist.category.ilike(
                    search_term
                )

            )

        )


    # ======================================
    # ASSET TYPE FILTER
    # ======================================

    if asset_type:

        asset_type = (
            asset_type
            .strip()
            .lower()
        )


        if asset_type not in ALLOWED_ASSET_TYPES:

            raise HTTPException(
                status_code=400,
                detail="Invalid asset type"
            )


        query = query.filter(
            Watchlist.asset_type
            == asset_type
        )


    # ======================================
    # STATUS FILTER
    # ======================================

    if status:

        if status not in ALLOWED_STATUSES:

            raise HTTPException(
                status_code=400,
                detail="Invalid watchlist status"
            )


        query = query.filter(
            Watchlist.status
            == status
        )


    # ======================================
    # SORT
    # ======================================

    if sort == "oldest":

        query = query.order_by(
            asc(
                Watchlist.created_at
            )
        )

    elif sort == "asset_az":

        query = query.order_by(
            asc(
                Watchlist.asset_value
            )
        )

    elif sort == "asset_za":

        query = query.order_by(
            desc(
                Watchlist.asset_value
            )
        )

    else:

        query = query.order_by(
            desc(
                Watchlist.created_at
            )
        )


    return query.all()


# ==========================================
# CREATE WATCHLIST
# ADMIN + ANALYST
# ==========================================

@router.post("/")
def create_watchlist(

    request: WatchlistCreate,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_roles(
            "admin",
            "analyst"
        )
    )
):

    asset_type = (
        request.asset_type
        .strip()
        .lower()
    )


    asset_value = (
        request.asset_value
        .strip()
    )


    category = (

        request.category.strip()

        if request.category

        else None
    )


    if asset_type not in ALLOWED_ASSET_TYPES:

        raise HTTPException(
            status_code=400,
            detail="Invalid asset type"
        )


    if not asset_value:

        raise HTTPException(
            status_code=400,
            detail="Asset value is required"
        )


    # ======================================
    # DUPLICATE WATCHLIST CHECK
    # ======================================

    existing = (

        db.query(Watchlist)

        .filter(

            Watchlist.asset_type
            == asset_type,

            Watchlist.asset_value
            == asset_value

        )

        .first()

    )


    if existing:

        raise HTTPException(
            status_code=409,
            detail=(
                "This monitored asset "
                "already exists in the watchlist"
            )
        )


    watchlist = Watchlist(

        user_id=(
            current_user.user_id
        ),

        asset_type=asset_type,

        asset_value=asset_value,

        category=category,

        status="Active"

    )


    db.add(
        watchlist
    )

    db.flush()


    # ======================================
    # AUDIT
    # ======================================

    create_audit_log(

        db=db,

        user_id=(
            current_user.user_id
        ),

        action="CREATE_WATCHLIST",

        record_type="Watchlist",

        record_id=(
            watchlist.watchlist_id
        )

    )


    db.commit()

    db.refresh(
        watchlist
    )


    return {

        "message":
            "Watchlist asset created successfully",

        "watchlist":
            watchlist

    }


# ==========================================
# UPDATE WATCHLIST
# ADMIN + ANALYST
# ==========================================

@router.put("/{watchlist_id}")
def update_watchlist(

    watchlist_id: int,

    request: WatchlistUpdate,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_roles(
            "admin",
            "analyst"
        )
    )

):

    watchlist = (

        db.query(Watchlist)

        .filter(
            Watchlist.watchlist_id
            == watchlist_id
        )

        .first()

    )


    if not watchlist:

        raise HTTPException(
            status_code=404,
            detail="Watchlist asset not found"
        )


    asset_type = (
        request.asset_type
        .strip()
        .lower()
    )


    asset_value = (
        request.asset_value
        .strip()
    )


    category = (

        request.category.strip()

        if request.category

        else None

    )


    if asset_type not in ALLOWED_ASSET_TYPES:

        raise HTTPException(
            status_code=400,
            detail="Invalid asset type"
        )


    if not asset_value:

        raise HTTPException(
            status_code=400,
            detail="Asset value is required"
        )


    # ======================================
    # CHECK DUPLICATE OTHER RECORD
    # ======================================

    duplicate = (

        db.query(Watchlist)

        .filter(

            Watchlist.watchlist_id
            != watchlist_id,

            Watchlist.asset_type
            == asset_type,

            Watchlist.asset_value
            == asset_value

        )

        .first()

    )


    if duplicate:

        raise HTTPException(
            status_code=409,
            detail=(
                "Another watchlist entry "
                "already uses this asset"
            )
        )


    watchlist.asset_type = (
        asset_type
    )

    watchlist.asset_value = (
        asset_value
    )

    watchlist.category = (
        category
    )


    create_audit_log(

        db=db,

        user_id=(
            current_user.user_id
        ),

        action="UPDATE_WATCHLIST",

        record_type="Watchlist",

        record_id=(
            watchlist.watchlist_id
        )

    )


    db.commit()

    db.refresh(
        watchlist
    )


    return {

        "message":
            "Watchlist asset updated successfully",

        "watchlist":
            watchlist

    }


# ==========================================
# ACTIVE / INACTIVE
# ADMIN + ANALYST
# ==========================================

@router.put("/{watchlist_id}/status")
def update_watchlist_status(

    watchlist_id: int,

    request: WatchlistStatusUpdate,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_roles(
            "admin",
            "analyst"
        )
    )

):

    watchlist = (

        db.query(Watchlist)

        .filter(
            Watchlist.watchlist_id
            == watchlist_id
        )

        .first()

    )


    if not watchlist:

        raise HTTPException(
            status_code=404,
            detail="Watchlist asset not found"
        )


    if request.status not in ALLOWED_STATUSES:

        raise HTTPException(
            status_code=400,
            detail="Invalid watchlist status"
        )


    watchlist.status = (
        request.status
    )


    create_audit_log(

        db=db,

        user_id=(
            current_user.user_id
        ),

        action="UPDATE_WATCHLIST_STATUS",

        record_type="Watchlist",

        record_id=(
            watchlist.watchlist_id
        )

    )


    db.commit()

    db.refresh(
        watchlist
    )


    return {

        "message":
            "Watchlist status updated successfully",

        "watchlist_id":
            watchlist.watchlist_id,

        "status":
            watchlist.status

    }


# ==========================================
# DELETE WATCHLIST
# ADMIN ONLY
# ==========================================

@router.delete("/{watchlist_id}")
def delete_watchlist(

    watchlist_id: int,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_roles(
            "admin"
        )
    )

):

    watchlist = (

        db.query(Watchlist)

        .filter(
            Watchlist.watchlist_id
            == watchlist_id
        )

        .first()

    )


    if not watchlist:

        raise HTTPException(
            status_code=404,
            detail="Watchlist asset not found"
        )


    # ======================================
    # PROTECT HISTORICAL FINDINGS
    # ======================================

    related_findings = (

        db.query(Finding)

        .filter(
            Finding.watchlist_id
            == watchlist_id
        )

        .count()

    )


    if related_findings > 0:

        raise HTTPException(
            status_code=409,
            detail=(
                "This watchlist has historical "
                "findings and cannot be deleted. "
                "Set it to Inactive instead."
            )
        )


    create_audit_log(

        db=db,

        user_id=(
            current_user.user_id
        ),

        action="DELETE_WATCHLIST",

        record_type="Watchlist",

        record_id=(
            watchlist.watchlist_id
        )

    )


    db.delete(
        watchlist
    )

    db.commit()


    return {

        "message":
            "Watchlist asset deleted successfully"

    }