from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from backend.database import get_db

from backend.models.models import (
    Finding,
    User
)

from backend.services.rbac import (
    require_roles
)

from backend.services.elasticsearch_service import (
    create_findings_index,
    elasticsearch_available,
    index_finding
)


router = APIRouter(
    prefix="/elasticsearch",
    tags=["Elasticsearch"]
)


# ==========================================
# HEALTH
# ==========================================

@router.get("/health")
def elasticsearch_health(

    current_user: User = Depends(
        require_roles(
            "admin",
            "analyst"
        )
    )
):

    available = (
        elasticsearch_available()
    )


    return {

        "status":
            (
                "connected"
                if available
                else "disconnected"
            )
    }


# ==========================================
# SYNC ALL POSTGRES FINDINGS
# ==========================================

@router.post("/sync")
def sync_findings(

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_roles("admin")
    )
):

    try:

        if not elasticsearch_available():

            raise HTTPException(
                status_code=503,
                detail=(
                    "Elasticsearch "
                    "is not available"
                )
            )


        create_findings_index()


        findings = (
            db.query(Finding)
            .all()
        )


        indexed = 0


        for finding in findings:

            index_finding(
                finding
            )

            indexed += 1


        return {

            "message":
                "Elasticsearch synchronization completed",

            "indexed_findings":
                indexed
        }


    except HTTPException:

        raise


    except Exception as error:

        print(
            "Elasticsearch sync error:",
            error
        )


        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to synchronize "
                "findings with Elasticsearch"
            )
        )