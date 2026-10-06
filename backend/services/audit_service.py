from sqlalchemy.orm import Session

from backend.models.models import AuditLog


def create_audit_log(
    db: Session,
    user_id: int | None,
    action: str,
    record_type: str | None = None,
    record_id: int | None = None
):

    log = AuditLog(
        user_id=user_id,
        action=action,
        record_type=record_type,
        record_id=record_id
    )

    db.add(log)

    db.flush()

    return log