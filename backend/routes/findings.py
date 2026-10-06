import hashlib

import hmac



from fastapi import (

    APIRouter,

    Depends,

    HTTPException,

    Query

)



from pydantic import BaseModel



from sqlalchemy import (

    asc,

    desc

)



from sqlalchemy.orm import Session



from backend.database import get_db



from backend.models.models import (

    Alert,

    Finding,

    Source,

    User,

    Watchlist

)



from backend.services.risk_scoring import (

    get_risk_analysis

)



from backend.services.entity_extraction import (

    extract_entities

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



from backend.services.elasticsearch_service import (

    elasticsearch_available,

    search_finding_ids,

    update_finding_index_status

)





router = APIRouter(

    prefix="/findings",

    tags=["Findings"]

)





# ==========================================

# REQUEST MODEL

# ==========================================



class FindingStatusUpdate(BaseModel):



    status: str





# ==========================================

# SHA-256 HELPERS

# ==========================================



def calculate_content_hash(

    content: str | None

) -> str:



    safe_content = (

        content or ""

    )



    return (

        hashlib.sha256(

            safe_content.encode(

                "utf-8"

            )

        )

        .hexdigest()

    )





def verify_content_hash(

    content: str | None,

    stored_hash: str | None

) -> str:



    if not stored_hash:



        return "unavailable"





    calculated_hash = (

        calculate_content_hash(

            content

        )

    )





    stored_hash = (

        stored_hash

        .strip()

        .lower()

    )





    if hmac.compare_digest(

        calculated_hash,

        stored_hash

    ):



        return "verified"





    return "mismatch"





# ==========================================

# GET ALL FINDINGS

# SEARCH + FILTER + SORT

# ==========================================



@router.get("/")

def get_findings(



    search: str | None = Query(

        default=None

    ),



    severity: str | None = Query(

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

        Finding

    )





    # ======================================

    # ELASTICSEARCH FULL-TEXT SEARCH

    # ======================================



    if (

        search

        and

        search.strip()

    ):



        if not elasticsearch_available():



            raise HTTPException(

                status_code=503,

                detail=(

                    "Elasticsearch search "

                    "service is unavailable"

                )

            )





        finding_ids = (

            search_finding_ids(

                search.strip()

            )

        )





        if not finding_ids:



            return []





        query = query.filter(

            Finding.finding_id.in_(

                finding_ids

            )

        )





    # ======================================

    # SEVERITY FILTER

    # ======================================



    if severity:



        allowed_severities = [

            "Critical",

            "High",

            "Medium",

            "Low"

        ]





        if severity not in allowed_severities:



            raise HTTPException(

                status_code=400,

                detail=(

                    "Invalid severity filter"

                )

            )





        query = query.filter(

            Finding.severity

            == severity

        )





    # ======================================

    # STATUS FILTER

    # ======================================



    if status:



        allowed_statuses = [

            "New",

            "Investigating",

            "Resolved"

        ]





        if status not in allowed_statuses:



            raise HTTPException(

                status_code=400,

                detail=(

                    "Invalid status filter"

                )

            )





        query = query.filter(

            Finding.status

            == status

        )





    # ======================================

    # SORT

    # ======================================



    if sort == "oldest":



        query = query.order_by(

            asc(

                Finding.detected_at

            )

        )





    elif sort == "highest_risk":



        query = query.order_by(



            desc(

                Finding.risk_score

            ),



            desc(

                Finding.detected_at

            )

        )





    elif sort == "lowest_risk":



        query = query.order_by(



            asc(

                Finding.risk_score

            ),



            desc(

                Finding.detected_at

            )

        )





    else:



        query = query.order_by(

            desc(

                Finding.detected_at

            )

        )





    return query.all()





# ==========================================

# FINDING DETAIL / INVESTIGATION

# ==========================================



@router.get("/{finding_id}/detail")

def get_finding_detail(



    finding_id: int,



    db: Session = Depends(

        get_db

    ),



    current_user: User = Depends(

        get_current_user

    )



):



    # ======================================

    # FIND FINDING

    # ======================================



    finding = (



        db.query(Finding)



        .filter(

            Finding.finding_id

            == finding_id

        )



        .first()

    )





    if not finding:



        raise HTTPException(

            status_code=404,

            detail="Finding not found"

        )





    # ======================================

    # SOURCE PROVENANCE

    # ======================================



    source = (



        db.query(Source)



        .filter(

            Source.source_id

            == finding.source_id

        )



        .first()

    )





    # ======================================

    # WATCHLIST INFORMATION

    # ======================================



    watchlist = (



        db.query(Watchlist)



        .filter(

            Watchlist.watchlist_id

            == finding.watchlist_id

        )



        .first()

    )





    # ======================================

    # RELATED ALERT

    # ======================================



    alert = (



        db.query(Alert)



        .filter(

            Alert.finding_id

            == finding.finding_id

        )



        .order_by(

            Alert.created_at.desc()

        )



        .first()

    )





    # ======================================

    # RISK ANALYSIS

    # ======================================



    risk_analysis = (

        get_risk_analysis(



            finding.content or "",



            (

                watchlist.asset_type

                if watchlist

                else None

            )

        )

    )





    calculated_risk_score = (

        risk_analysis["score"]

    )





    calculated_severity = (

        risk_analysis["severity"]

    )





    # ======================================

    # ADVANCED ENTITY EXTRACTION

    # ======================================

    extracted_entities = (

        extract_entities(

            finding.content or ""

        )

    )





    # ======================================

    # EVIDENCE INTEGRITY

    # ======================================



    calculated_hash = (

        calculate_content_hash(

            finding.content

        )

    )





    finding_integrity = (

        verify_content_hash(

            finding.content,

            finding.content_hash

        )

    )





    source_integrity = (

        verify_content_hash(

            finding.content,

            source.content_hash

        )

        if source

        else "unavailable"

    )





    # Both provenance layers must verify

    # before overall evidence is VERIFIED.



    if (

        finding_integrity == "mismatch"

        or

        source_integrity == "mismatch"

    ):



        overall_integrity = (

            "mismatch"

        )





    elif (

        finding_integrity == "verified"

        and

        source_integrity == "verified"

    ):



        overall_integrity = (

            "verified"

        )





    else:



        overall_integrity = (

            "unavailable"

        )





    # ======================================

    # RESPONSE

    # ======================================



    return {



        # ==================================

        # FINDING

        # ==================================



        "finding": {



            "finding_id":

                finding.finding_id,



            "watchlist_id":

                finding.watchlist_id,



            "source_id":

                finding.source_id,



            "matched_value":

                finding.matched_value,



            "content":

                finding.content,



            "content_hash":

                finding.content_hash,



            "hash_algorithm":

                "SHA-256",



            "collected_at":

                finding.collected_at,



            "content_integrity":

                finding_integrity,



            "threat_category":

                finding.threat_category,



            "risk_score":

                calculated_risk_score,



            "severity":

                calculated_severity,



            "status":

                finding.status,



            "detected_at":

                finding.detected_at

        },





        # ==================================

        # EVIDENCE INTEGRITY

        # ==================================



        "evidence_integrity": {



            "status":

                overall_integrity,



            "algorithm":

                "SHA-256",



            "calculated_hash":

                calculated_hash,



            "finding_hash":

                finding.content_hash,



            "source_hash":

                (

                    source.content_hash

                    if source

                    else None

                ),



            "finding_integrity":

                finding_integrity,



            "source_integrity":

                source_integrity

        },





        # ==================================

        # RISK DATA

        # ==================================



        "risk_score":

            calculated_risk_score,



        "severity":

            calculated_severity,



        "risk_analysis":

            risk_analysis,





        # ==================================

        # EXTRACTED ENTITIES

        # ==================================

        "extracted_entities":

            extracted_entities,





        # ==================================

        # SOURCE PROVENANCE

        # ==================================



        "source": (



            {



                "source_id":

                    source.source_id,



                "source_name":

                    source.source_name,



                "source_type":

                    source.source_type,



                "source_reference":

                    source.source_reference,



                "collected_at":

                    source.collected_at,



                "hash_algorithm":

                    "SHA-256",



                "content_hash":

                    source.content_hash,



                "content_integrity":

                    source_integrity



            }



            if source



            else None

        ),





        # ==================================

        # WATCHLIST INFORMATION

        # ==================================



        "watchlist": (



            {



                "watchlist_id":

                    watchlist.watchlist_id,



                "asset_type":

                    watchlist.asset_type,



                "asset_value":

                    watchlist.asset_value,



                "category":

                    watchlist.category,



                "status":

                    watchlist.status,



                "created_at":

                    watchlist.created_at



            }



            if watchlist



            else None

        ),





        # ==================================

        # RELATED SECURITY ALERT

        # ==================================



        "alert": (



            {



                "alert_id":

                    alert.alert_id,



                "finding_id":

                    alert.finding_id,



                "message":

                    alert.message,



                "severity":

                    alert.severity,



                "status":

                    alert.status,



                "created_at":

                    alert.created_at



            }



            if alert



            else None

        )

    }





# ==========================================

# GET ONE FINDING

# ==========================================



@router.get("/{finding_id}")

def get_finding(



    finding_id: int,



    db: Session = Depends(

        get_db

    ),



    current_user: User = Depends(

        get_current_user

    )



):



    finding = (



        db.query(Finding)



        .filter(

            Finding.finding_id

            == finding_id

        )



        .first()

    )





    if not finding:



        raise HTTPException(

            status_code=404,

            detail="Finding not found"

        )





    return finding





# ==========================================

# UPDATE FINDING STATUS

# ==========================================



@router.put("/{finding_id}/status")

def update_finding_status(



    finding_id: int,



    update: FindingStatusUpdate,



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



    finding = (



        db.query(Finding)



        .filter(

            Finding.finding_id

            == finding_id

        )



        .first()

    )





    if not finding:



        raise HTTPException(

            status_code=404,

            detail="Finding not found"

        )





    allowed_statuses = [

        "New",

        "Investigating",

        "Resolved"

    ]





    if (

        update.status

        not in allowed_statuses

    ):



        raise HTTPException(

            status_code=400,

            detail="Invalid status"

        )





    finding.status = (

        update.status

    )





    # ======================================

    # AUDIT

    # ======================================



    create_audit_log(



        db=db,



        user_id=(

            current_user.user_id

        ),



        action=(

            "UPDATE_FINDING_STATUS"

        ),



        record_type="Finding",



        record_id=(

            finding.finding_id

        )

    )





    db.commit()



    db.refresh(

        finding

    )





    # ======================================

    # UPDATE ELASTICSEARCH INDEX

    # ======================================



    try:



        if elasticsearch_available():



            update_finding_index_status(



                finding.finding_id,



                finding.status

            )





    except Exception as error:



        print(

            "Elasticsearch status sync error:",

            error

        )





    return {



        "message":

            "Finding status updated successfully",



        "finding_id":

            finding.finding_id,



        "status":

            finding.status

    }