from fastapi import (
    APIRouter,
    Depends
)

from sqlalchemy.orm import Session

from backend.database import get_db

from backend.models.models import (
    AuditLog,
    User
)

from backend.services.rbac import (
    require_roles
)


router = APIRouter(
    prefix="/audit",
    tags=["Audit Logs"]
)


@router.get("/")
def get_audit_logs(
    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles("admin")
    )
):

    logs = (
        db.query(
            AuditLog,
            User
        )
        .outerjoin(
            User,
            AuditLog.user_id
            == User.user_id
        )
        .order_by(
            AuditLog.timestamp.desc()
        )
        .limit(200)
        .all()
    )


    result = []


    for audit, user in logs:

        result.append(
            {
                "audit_id":
                    audit.audit_id,

                "user_id":
                    audit.user_id,

                "username":
                    (
                        user.username
                        if user
                        else "System"
                    ),

                "action":
                    audit.action,

                "record_type":
                    audit.record_type,

                "record_id":
                    audit.record_id,

                "timestamp":
                    audit.timestamp
            }
        )


    return result