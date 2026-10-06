from datetime import (
    date,
    datetime,
    time,
    timedelta
)

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
    Finding,
    Report,
    User
)

from backend.routes.auth import (
    get_current_user
)

from backend.services.audit_service import (
    create_audit_log
)


router = APIRouter(
    prefix="/reports",
    tags=["Reports"]
)


# ==========================================
# GENERATE REQUEST
# ==========================================

class ReportGenerateRequest(
    BaseModel
):

    report_type: str = (
        "Threat Summary"
    )

    start_date: date | None = None

    end_date: date | None = None


# ==========================================
# GENERATE REPORT
# ==========================================

@router.post("/generate")
def generate_report(

    request: ReportGenerateRequest,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_user
    )
):

    if (
        request.start_date
        and request.end_date
        and request.start_date
        > request.end_date
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Start date cannot "
                "be after end date"
            )
        )


    # ======================================
    # QUERIES
    # ======================================

    finding_query = (
        db.query(Finding)
    )


    alert_query = (
        db.query(Alert)
    )


    # ======================================
    # START DATE
    # ======================================

    if request.start_date:

        start_datetime = (
            datetime.combine(
                request.start_date,
                time.min
            )
        )


        finding_query = (
            finding_query.filter(
                Finding.detected_at
                >= start_datetime
            )
        )


        alert_query = (
            alert_query.filter(
                Alert.created_at
                >= start_datetime
            )
        )


    # ======================================
    # END DATE
    # ======================================

    if request.end_date:

        end_datetime = (
            datetime.combine(

                request.end_date
                + timedelta(days=1),

                time.min
            )
        )


        finding_query = (
            finding_query.filter(
                Finding.detected_at
                < end_datetime
            )
        )


        alert_query = (
            alert_query.filter(
                Alert.created_at
                < end_datetime
            )
        )


    # ======================================
    # GET DATA
    # ======================================

    findings = (

        finding_query

        .order_by(
            Finding.detected_at.desc()
        )

        .all()
    )


    alerts = (

        alert_query

        .order_by(
            Alert.created_at.desc()
        )

        .all()
    )


    # ======================================
    # COUNTERS
    # ======================================

    critical_count = sum(

        1

        for finding in findings

        if finding.severity
        == "Critical"
    )


    high_count = sum(

        1

        for finding in findings

        if finding.severity
        == "High"
    )


    medium_count = sum(

        1

        for finding in findings

        if finding.severity
        == "Medium"
    )


    low_count = sum(

        1

        for finding in findings

        if finding.severity
        == "Low"
    )


    unread_alerts = sum(

        1

        for alert in alerts

        if alert.status
        == "Unread"
    )


    # ======================================
    # CREATE REPORT RECORD
    # ======================================

    new_report = Report(

        user_id=(
            current_user.user_id
        ),

        report_type=(
            request.report_type
        )
    )


    db.add(new_report)

    db.flush()


    # ======================================
    # AUDIT
    # ======================================

    create_audit_log(

        db=db,

        user_id=(
            current_user.user_id
        ),

        action=(
            "GENERATE_REPORT"
        ),

        record_type="Report",

        record_id=(
            new_report.report_id
        )
    )


    db.commit()

    db.refresh(new_report)


    # ======================================
    # FORMAT FINDINGS
    # ======================================

    finding_data = []


    for finding in findings:

        finding_data.append(
            {

                "finding_id":
                    finding.finding_id,

                "matched_value":
                    finding.matched_value,

                "threat_category":
                    finding.threat_category,

                "risk_score":
                    finding.risk_score,

                "severity":
                    finding.severity,

                "status":
                    finding.status,

                "content":
                    finding.content,

                "detected_at":
                    finding.detected_at
            }
        )


    # ======================================
    # FORMAT ALERTS
    # ======================================

    alert_data = []


    for alert in alerts:

        alert_data.append(
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
        )


    # ======================================
    # RESPONSE
    # ======================================

    return {

        "message":
            "Report generated successfully",

        "report": {

            "report_id":
                new_report.report_id,

            "report_type":
                new_report.report_type,

            "generated_at":
                new_report.generated_at,

            "generated_by":
                current_user.username,

            "start_date":
                request.start_date,

            "end_date":
                request.end_date
        },

        "summary": {

            "total_findings":
                len(findings),

            "total_alerts":
                len(alerts),

            "unread_alerts":
                unread_alerts,

            "severity": {

                "critical":
                    critical_count,

                "high":
                    high_count,

                "medium":
                    medium_count,

                "low":
                    low_count
            }
        },

        "findings":
            finding_data,

        "alerts":
            alert_data
    }


# ==========================================
# REPORT HISTORY
# ==========================================

@router.get("/history")
def get_report_history(

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_user
    )
):

    reports = (

        db.query(
            Report,
            User
        )

        .join(
            User,
            Report.user_id
            == User.user_id
        )

        .order_by(
            Report.generated_at.desc()
        )

        .limit(50)

        .all()
    )


    result = []


    for report, user in reports:

        result.append(
            {

                "report_id":
                    report.report_id,

                "report_type":
                    report.report_type,

                "generated_at":
                    report.generated_at,

                "generated_by":
                    user.username
            }
        )


    return result