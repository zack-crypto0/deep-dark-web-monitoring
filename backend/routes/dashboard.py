from datetime import (
    datetime,
    timedelta,
    time,
    timezone
)

from fastapi import (
    APIRouter,
    Depends
)

from sqlalchemy import (
    desc,
    func
)

from sqlalchemy.orm import Session

from backend.database import get_db

from backend.models.models import (
    Alert,
    AuditLog,
    Finding,
    User
)

from backend.routes.auth import (
    get_current_user
)

from backend.services.elasticsearch_service import (
    elasticsearch_available
)


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


# ==========================================
# DASHBOARD SUMMARY
# ==========================================

@router.get("/summary")
def get_dashboard_summary(

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        get_current_user
    )

):

    # ======================================
    # TOTAL FINDINGS
    # ======================================

    total_findings = (
        db.query(Finding)
        .count()
    )


    # ======================================
    # SEVERITY COUNTS
    # ======================================

    critical_count = (
        db.query(Finding)
        .filter(
            Finding.severity
            == "Critical"
        )
        .count()
    )


    high_count = (
        db.query(Finding)
        .filter(
            Finding.severity
            == "High"
        )
        .count()
    )


    medium_count = (
        db.query(Finding)
        .filter(
            Finding.severity
            == "Medium"
        )
        .count()
    )


    low_count = (
        db.query(Finding)
        .filter(
            Finding.severity
            == "Low"
        )
        .count()
    )


    # ======================================
    # UNREAD ALERTS
    # ======================================

    unread_alerts = (
        db.query(Alert)
        .filter(
            Alert.status
            == "Unread"
        )
        .count()
    )


    # ======================================
    # RECENT FINDINGS
    # ======================================

    recent_finding_records = (
        db.query(Finding)
        .order_by(
            Finding.detected_at.desc()
        )
        .limit(5)
        .all()
    )


    recent_findings = []


    for finding in recent_finding_records:

        recent_findings.append(
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

                "detected_at":
                    finding.detected_at

            }
        )


    # ======================================
    # FINDINGS OVER TIME
    # LAST 7 DAYS
    # ======================================

    today = (
        datetime.now(
            timezone.utc
        )
        .date()
    )


    first_day = (
        today
        - timedelta(
            days=6
        )
    )


    start_datetime = (
        datetime.combine(
            first_day,
            time.min
        )
        .replace(
            tzinfo=timezone.utc
        )
    )


    timeline_rows = (

        db.query(

            func.date(
                Finding.detected_at
            ).label("day"),

            func.count(
                Finding.finding_id
            ).label("count")

        )

        .filter(
            Finding.detected_at
            >= start_datetime
        )

        .group_by(
            func.date(
                Finding.detected_at
            )
        )

        .order_by(
            func.date(
                Finding.detected_at
            )
        )

        .all()

    )


    timeline_map = {

        str(row.day):
            row.count

        for row in timeline_rows

    }


    findings_over_time = []


    for offset in range(7):

        current_day = (
            first_day
            + timedelta(
                days=offset
            )
        )


        findings_over_time.append(
            {

                "date":
                    current_day.strftime(
                        "%d %b"
                    ),

                "count":
                    timeline_map.get(
                        str(current_day),
                        0
                    )

            }
        )


    # ======================================
    # TOP MATCHED ASSETS
    # ======================================

    finding_count = func.count(
        Finding.finding_id
    )


    top_asset_rows = (

        db.query(

            Finding.matched_value,

            finding_count.label(
                "count"
            )

        )

        .filter(
            Finding.matched_value
            .isnot(None)
        )

        .group_by(
            Finding.matched_value
        )

        .order_by(
            desc(
                finding_count
            )
        )

        .limit(5)

        .all()

    )


    top_assets = []


    for row in top_asset_rows:

        top_assets.append(
            {

                "asset":
                    row.matched_value,

                "count":
                    row.count

            }
        )


    # ======================================
    # SCAN ACTIVITY
    # ======================================

    total_scans = (

        db.query(AuditLog)

        .filter(
            AuditLog.action
            == "RUN_SCAN"
        )

        .count()

    )


    seven_days_ago = (
        datetime.now(
            timezone.utc
        )
        - timedelta(
            days=7
        )
    )


    scans_last_7_days = (

        db.query(AuditLog)

        .filter(

            AuditLog.action
            == "RUN_SCAN",

            AuditLog.timestamp
            >= seven_days_ago

        )

        .count()

    )


    last_scan = (

        db.query(AuditLog)

        .filter(
            AuditLog.action
            == "RUN_SCAN"
        )

        .order_by(
            AuditLog.timestamp.desc()
        )

        .first()

    )


    last_scan_at = (

        last_scan.timestamp

        if last_scan

        else None

    )


    # ======================================
    # ELASTICSEARCH STATUS
    # ======================================

    elasticsearch_status = (
        "disconnected"
    )


    try:

        if elasticsearch_available():

            elasticsearch_status = (
                "connected"
            )

    except Exception as error:

        print(
            "Dashboard Elasticsearch "
            "status error:",
            error
        )


    # ======================================
    # RESPONSE
    # ======================================

    return {

        "total_findings":
            total_findings,

        "severity": {

            "critical":
                critical_count,

            "high":
                high_count,

            "medium":
                medium_count,

            "low":
                low_count

        },

        "unread_alerts":
            unread_alerts,

        "recent_findings":
            recent_findings,

        "analytics": {

            "findings_over_time":
                findings_over_time,

            "top_assets":
                top_assets

        },

        "scan_activity": {

            "total_scans":
                total_scans,

            "scans_last_7_days":
                scans_last_7_days,

            "last_scan_at":
                last_scan_at

        },

        "system_status": {

            "api":
                "online",

            "database":
                "connected",

            "elasticsearch":
                elasticsearch_status,

            "matching_engine":
                "active",

            "alert_engine":
                "active"

        },

        "current_user": {

            "username":
                current_user.username,

            "role":
                current_user.role

        }

    }