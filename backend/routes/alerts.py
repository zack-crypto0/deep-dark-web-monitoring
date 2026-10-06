from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db

from backend.models.models import (
    Alert,
    User
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
    prefix="/alerts",
    tags=["Alerts"]
)


# ==========================================
# STATUS REQUEST
# ==========================================

class AlertStatusUpdate(BaseModel):

    status: str


# ==========================================
# GET ALL ALERTS
# ==========================================

@router.get("/")
def get_alerts(

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_user
    )
):

    alerts = (

        db.query(Alert)

        .order_by(
            Alert.created_at.desc()
        )

        .all()
    )


    return alerts


# ==========================================
# GET ONE ALERT
# ==========================================

@router.get("/{alert_id}")
def get_alert(

    alert_id: int,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_user
    )
):

    alert = (

        db.query(Alert)

        .filter(
            Alert.alert_id
            == alert_id
        )

        .first()
    )


    if not alert:

        raise HTTPException(
            status_code=404,
            detail="Alert not found"
        )


    return alert


# ==========================================
# UPDATE ALERT STATUS
# ==========================================

@router.put("/{alert_id}/status")
def update_alert_status(

    alert_id: int,

    update: AlertStatusUpdate,

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

    alert = (

        db.query(Alert)

        .filter(
            Alert.alert_id
            == alert_id
        )

        .first()
    )


    if not alert:

        raise HTTPException(
            status_code=404,
            detail="Alert not found"
        )


    allowed_statuses = [

        "Unread",

        "Read"
    ]


    if (
        update.status
        not in allowed_statuses
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid status"
        )


    alert.status = (
        update.status
    )


    create_audit_log(

        db=db,

        user_id=current_user.user_id,

        action=(
            "UPDATE_ALERT_STATUS"
        ),

        record_type="Alert",

        record_id=alert.alert_id
    )


    db.commit()

    db.refresh(alert)


    return {

        "message":
            "Alert status updated successfully",

        "alert_id":
            alert.alert_id,

        "status":
            alert.status
    }