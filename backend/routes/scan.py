import hashlib

import json



from datetime import datetime, timezone

from pathlib import Path

from typing import Literal



from fastapi import (

    APIRouter,

    Depends,

    HTTPException,

    Query

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



from backend.services.crawler_service import (

    crawl_controlled_source

)



from backend.services.risk_scoring import (

    get_risk_analysis

)



from backend.services.matching_service import (

    find_match

)



from backend.services.entity_extraction import (

    extract_entities

)


from backend.services.rbac import (

    require_roles

)



from backend.services.audit_service import (

    create_audit_log

)



from backend.services.elasticsearch_service import (

    elasticsearch_available,

    create_findings_index,

    index_finding

)





# ==========================================
# ENTITY-AWARE WATCHLIST MATCHING
# ==========================================

def match_watchlist_entity(
    watchlist: Watchlist,
    content: str,
    entities: dict
) -> bool:

    asset_value = str(
        watchlist.asset_value or ""
    ).strip().lower()

    asset_type = str(
        watchlist.asset_type or ""
    ).strip().lower()

    normalized_type = (
        asset_type
        .replace("_", " ")
        .replace("-", " ")
    )

    if not asset_value:

        return False

    if "email" in normalized_type:

        return asset_value in {
            item.lower()
            for item in entities.get(
                "emails",
                []
            )
        }

    if "domain" in normalized_type:

        normalized_domain = (
            asset_value
            .removeprefix("http://")
            .removeprefix("https://")
            .split("/", 1)[0]
            .split(":", 1)[0]
            .rstrip(".")
        )

        return normalized_domain in {
            item.lower().rstrip(".")
            for item in entities.get(
                "domains",
                []
            )
        }

    if (
        "ipv4" in normalized_type
        or
        "ip address" in normalized_type
        or
        normalized_type == "ip"
    ):

        return asset_value in {
            item.lower()
            for item in entities.get(
                "ipv4_addresses",
                []
            )
        }

    # Preserve the existing matcher for other
    # asset types and future watchlist categories.
    return find_match(
        watchlist.asset_value,
        content
    )


router = APIRouter(

    prefix="/scan",

    tags=["Threat Scan"]

)





# ==========================================

# CONFIGURATION

# ==========================================



PROJECT_ROOT = (

    Path(__file__)

    .resolve()

    .parents[2]

)





SAMPLE_DATA_FILE = (

    PROJECT_ROOT

    / "sample-data"

    / "threat_data.json"

)





CONTROLLED_START_FILE = (

    "index.html"

)





# ==========================================

# CONTENT HASH

# ==========================================



def calculate_content_hash(

    content: str

) -> str:



    return (

        hashlib.sha256(

            content.encode("utf-8")

        )

        .hexdigest()

    )





# ==========================================

# CREATE FALLBACK SOURCE REFERENCE

# ==========================================



def create_source_reference(

    record: dict

) -> str:



    existing_reference = (

        record.get(

            "source_reference"

        )

    )



    if existing_reference:



        return existing_reference





    content = (

        record.get(

            "content",

            ""

        )

        or ""

    )





    source_name = (

        record.get(

            "source_name",

            "unknown"

        )

    )





    unique_text = (

        f"{source_name}:{content}"

    )





    reference_hash = (

        hashlib.sha256(

            unique_text.encode(

                "utf-8"

            )

        )

        .hexdigest()

    )





    return (

        "sample://generated/"

        f"{reference_hash}"

    )





# ==========================================

# PARSE COLLECTION TIMESTAMP

# ==========================================



def get_collected_at(

    record: dict

) -> datetime:



    raw_collected_at = (

        record.get(

            "collected_at"

        )

    )





    if not raw_collected_at:



        return datetime.now(

            timezone.utc

        )





    if isinstance(

        raw_collected_at,

        datetime

    ):



        return raw_collected_at





    try:



        timestamp = str(

            raw_collected_at

        )





        # Support ISO timestamps ending in Z.

        if timestamp.endswith("Z"):



            timestamp = (

                timestamp[:-1]

                + "+00:00"

            )





        parsed_timestamp = (

            datetime.fromisoformat(

                timestamp

            )

        )





        # Ensure timezone information exists.

        if (

            parsed_timestamp.tzinfo

            is None

        ):



            parsed_timestamp = (

                parsed_timestamp.replace(

                    tzinfo=timezone.utc

                )

            )





        return parsed_timestamp





    except (

        TypeError,

        ValueError

    ):



        raise HTTPException(

            status_code=500,

            detail=(

                "Collected record contains "

                "an invalid collection timestamp."

            )

        )





# ==========================================

# PREPARE PROVENANCE

# ==========================================



def prepare_provenance(

    record: dict

):



    content = str(

        record.get(

            "content",

            ""

        )

        or ""

    )





    calculated_hash = (

        calculate_content_hash(

            content

        )

    )





    supplied_hash = (

        record.get(

            "content_hash"

        )

    )





    # If the collector already supplied a hash,

    # verify that the content received by the

    # scanner still produces the same SHA-256.

    if supplied_hash:



        supplied_hash = (

            str(

                supplied_hash

            )

            .strip()

            .lower()

        )





        if (

            supplied_hash

            != calculated_hash

        ):



            raise HTTPException(

                status_code=500,

                detail=(

                    "Evidence integrity check failed. "

                    "The collected content does not "

                    "match its supplied SHA-256 hash."

                )

            )





    collected_at = (

        get_collected_at(

            record

        )

    )





    return (

        content,

        calculated_hash,

        collected_at

    )





# ==========================================

# RUN THREAT SCAN

# ==========================================



@router.post("/")

def run_threat_scan(



    scan_source: Literal[

        "synthetic",

        "controlled"

    ] = Query(

        default="synthetic"

    ),



    watchlist_id: int | None = Query(

        default=None,

        description=(

            "Optional Watchlist ID. "

            "If provided, only this active asset "

            "will be scanned."

        )

    ),



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



    # ======================================

    # CHECK SYNTHETIC DATA FILE

    # ======================================



    if (

        scan_source == "synthetic"

        and

        not SAMPLE_DATA_FILE.exists()

    ):



        raise HTTPException(

            status_code=500,

            detail=(

                "Synthetic threat data "

                "file was not found."

            )

        )





    scan_type = (

        "Controlled Crawler"

        if scan_source == "controlled"

        else

        "Synthetic Dataset"

    )





    try:



        # ==================================

        # LOAD DATA SOURCE

        # ==================================



        if scan_source == "controlled":



            try:



                threat_records = (

                    crawl_controlled_source(
    CONTROLLED_START_FILE
)

                )





            except HTTPException:



                raise





            except Exception as error:



                print(

                    "Controlled crawler error:",

                    error

                )





                raise HTTPException(

                    status_code=503,

                    detail=(

                        "Controlled fixture source "
                        "is unavailable. Verify that "
                        "the bundled controlled fixture "
                        "files exist."

                    )

                )





            if not threat_records:



                raise HTTPException(

                    status_code=503,

                    detail=(

                        "Controlled crawler "

                        "collected no pages."

                    )

                )





        else:



            with SAMPLE_DATA_FILE.open(

                encoding="utf-8"

            ) as file:



                threat_records = (

                    json.load(file)

                )





        # ==================================

        # VALIDATE DATASET

        # ==================================



        if not isinstance(

            threat_records,

            list

        ):



            raise HTTPException(

                status_code=500,

                detail=(

                    "Threat data must contain "

                    "a list of records."

                )

            )





        # ==================================

        # GET WATCHLISTS

        # ==================================



        if watchlist_id is not None:



            selected_watchlist = (

                db.query(Watchlist)

                .filter(

                    Watchlist.watchlist_id

                    == watchlist_id,



                    Watchlist.status

                    == "Active"

                )

                .first()

            )





            if not selected_watchlist:



                raise HTTPException(

                    status_code=404,

                    detail=(

                        "Selected watchlist "

                        "was not found or "

                        "is not active."

                    )

                )





            watchlists = [

                selected_watchlist

            ]





        else:



            watchlists = (

                db.query(Watchlist)

                .filter(

                    Watchlist.status

                    == "Active"

                )

                .all()

            )





        # ==================================

        # NO ACTIVE WATCHLIST

        # ==================================



        if not watchlists:



            create_audit_log(



                db=db,



                user_id=(

                    current_user.user_id

                ),



                action="RUN_SCAN",



                record_type="Scan",



                record_id=None

            )





            db.commit()





            return {



                "message":

                    "Threat scan completed. "

                    "No active watchlists found.",



                "scan_type":

                    scan_type,



                "scan_source":

                    scan_source,



                "executed_by":

                    current_user.username,



                "watchlist_id":

                    watchlist_id,



                "assets_scanned":

                    0,



                "total_records_scanned":

                    len(threat_records),



                "total_findings":

                    0,



                "duplicates_skipped":

                    0,



                "elasticsearch_indexed":

                    0,



                "entity_extraction": {

                    "records_with_entities":
                        0,

                    "email_count":
                        0,

                    "domain_count":
                        0,

                    "ipv4_count":
                        0,

                    "keyword_count":
                        0,

                    "total_unique_entities":
                        0,

                    "emails":
                        [],

                    "domains":
                        [],

                    "ipv4_addresses":
                        [],

                    "keywords":
                        []
                },


                "findings_created":

                    []

            }





        # ==================================

        # COUNTERS

        # ==================================



        findings_created = []



        duplicate_count = 0



        records_scanned = 0


        # Unique entities observed across the
        # complete scan run.
        extracted_emails = set()

        extracted_domains = set()

        extracted_ipv4 = set()

        extracted_keywords = set()

        records_with_entities = 0
        # ==================================

        # PROCESS RECORDS

        # ==================================



        for record in threat_records:



            records_scanned += 1





            if not isinstance(

                record,

                dict

            ):



                continue





            # =================================

            # PREPARE EVIDENCE + PROVENANCE

            # =================================



            (

                content,

                content_hash,

                collected_at

            ) = prepare_provenance(

                record

            )





            # =================================
            # ADVANCED ENTITY EXTRACTION
            # =================================

            entities = extract_entities(
                content
            )


            extracted_emails.update(
                entities.get(
                    "emails",
                    []
                )
            )


            extracted_domains.update(
                entities.get(
                    "domains",
                    []
                )
            )


            extracted_ipv4.update(
                entities.get(
                    "ipv4_addresses",
                    []
                )
            )


            for keyword_item in entities.get(
                "keywords",
                []
            ):

                extracted_keywords.add(
                    (
                        keyword_item.get(
                            "category",
                            "unknown"
                        ),
                        keyword_item.get(
                            "keyword",
                            ""
                        )
                    )
                )


            if (
                entities.get(
                    "summary",
                    {}
                ).get(
                    "total_entities",
                    0
                )
                > 0
            ):

                records_with_entities += 1


            source_reference = (

                create_source_reference(

                    record

                )

            )





            # =================================

            # FIND EXISTING SOURCE SNAPSHOT

            # =================================

            #

            # Same URL + same SHA-256 =

            # same collected evidence.

            #

            # Same URL + different SHA-256 =

            # new evidence snapshot.



            source = (

                db.query(Source)

                .filter(

                    Source.source_reference

                    == source_reference,



                    Source.content_hash

                    == content_hash

                )

                .first()

            )





            # =================================

            # CREATE SOURCE SNAPSHOT IF NEW

            # =================================



            if not source:



                source = Source(



                    source_name=(

                        record.get(

                            "source_name",

                            "Unknown Source"

                        )

                    ),



                    source_type=(

                        record.get(

                            "source_type",

                            "sample"

                        )

                    ),



                    source_reference=(

                        source_reference

                    ),



                    collected_at=(

                        collected_at

                    ),



                    content_hash=(

                        content_hash

                    )

                )





                db.add(source)



                db.flush()





            # =================================

            # MATCH AGAINST WATCHLIST

            # =================================



            for watchlist in watchlists:



                matched = match_watchlist_entity(

                    watchlist,

                    content,

                    entities

                )





                if not matched:



                    continue





                # =============================

                # DUPLICATE CHECK

                # =============================



                existing_finding = (



                    db.query(Finding)



                    .filter(



                        Finding.watchlist_id

                        == watchlist.watchlist_id,



                        Finding.source_id

                        == source.source_id



                    )



                    .first()

                )





                if existing_finding:



                    duplicate_count += 1



                    continue





                # =============================

                # RISK SCORING

                # =============================



                risk_analysis = (

                    get_risk_analysis(

                        content,

                        watchlist.asset_type

                    )

                )





                risk_score = (

                    risk_analysis[

                        "score"

                    ]

                )





                severity = (

                    risk_analysis[

                        "severity"

                    ]

                )





                threat_category = (

                    risk_analysis[

                        "primary_threat"

                    ]

                )





                if (

                    threat_category

                    == "general"

                ):



                    threat_category = (

                        "General Threat"

                    )





                else:



                    threat_category = (

                        threat_category.title()

                    )





                # =============================

                # CREATE FINDING

                # =============================



                finding = Finding(



                    content_hash=(

                        content_hash

                    ),



                    collected_at=(

                        collected_at

                    ),



                    watchlist_id=(

                        watchlist.watchlist_id

                    ),



                    source_id=(

                        source.source_id

                    ),



                    matched_value=(

                        watchlist.asset_value

                    ),



                    content=(

                        content

                    ),



                    threat_category=(

                        threat_category

                    ),



                    risk_score=(

                        risk_score

                    ),



                    severity=(

                        severity

                    ),



                    status="New"

                )





                db.add(finding)



                db.flush()





                # =============================

                # CREATE ALERT

                # =============================



                alert = Alert(



                    finding_id=(

                        finding.finding_id

                    ),



                    message=(

                        "Monitored asset "

                        f"'{watchlist.asset_value}' "

                        "detected."

                    ),



                    severity=(

                        severity

                    ),



                    status="Unread"

                )





                db.add(alert)





                # =============================

                # STORE RESPONSE DATA

                # =============================



                findings_created.append(

                    {



                        "finding_id":

                            finding.finding_id,



                        "watchlist_id":

                            watchlist.watchlist_id,



                        "matched_value":

                            watchlist.asset_value,



                        "source":

                            source.source_name,



                        "source_type":

                            source.source_type,



                        "source_reference":

                            source.source_reference,



                        "collected_at":

                            (

                                collected_at

                                .isoformat()

                            ),



                        "content_hash":
                            content_hash,

                        "extracted_entities":
                            entities,

                        "risk_score":
                            risk_score,

                        "severity":
                            severity

                    }

                )





        # ==================================

        # AUDIT LOG

        # ==================================



        create_audit_log(



            db=db,



            user_id=(

                current_user.user_id

            ),



            action="RUN_SCAN",



            record_type="Scan",



            record_id=None

        )





        # ==================================

        # COMMIT POSTGRESQL FIRST

        # ==================================



        db.commit()





        # ==================================

        # ELASTICSEARCH INDEXING

        # ==================================



        elasticsearch_indexed = 0





        try:



            if elasticsearch_available():



                create_findings_index()





                for item in findings_created:



                    finding = (



                        db.query(Finding)



                        .filter(

                            Finding.finding_id

                            == item[

                                "finding_id"

                            ]

                        )



                        .first()

                    )





                    if finding:



                        index_finding(

                            finding

                        )



                        elasticsearch_indexed += 1





            else:



                print(

                    "Elasticsearch is unavailable. "

                    "Skipping search indexing."

                )





        except Exception as error:



            print(

                "Elasticsearch indexing warning:",

                error

            )





        # ==================================

        # RESPONSE

        # ==================================



        return {



            "message":

                "Threat scan completed",



            "scan_type":

                scan_type,



            "scan_source":

                scan_source,



            "executed_by":

                current_user.username,



            "watchlist_id":

                watchlist_id,



            "assets_scanned":

                len(watchlists),



            "total_records_scanned":

                records_scanned,



            "total_findings":

                len(

                    findings_created

                ),



            "duplicates_skipped":

                duplicate_count,



            "elasticsearch_indexed":

                elasticsearch_indexed,



            "entity_extraction": {

                "records_with_entities":
                    records_with_entities,

                "email_count":
                    len(
                        extracted_emails
                    ),

                "domain_count":
                    len(
                        extracted_domains
                    ),

                "ipv4_count":
                    len(
                        extracted_ipv4
                    ),

                "keyword_count":
                    len(
                        extracted_keywords
                    ),

                "total_unique_entities":
                    (
                        len(extracted_emails)
                        + len(extracted_domains)
                        + len(extracted_ipv4)
                        + len(extracted_keywords)
                    ),

                "emails":
                    sorted(
                        extracted_emails
                    ),

                "domains":
                    sorted(
                        extracted_domains
                    ),

                "ipv4_addresses":
                    sorted(
                        extracted_ipv4
                    ),

                "keywords": [
                    {
                        "category":
                            category,

                        "keyword":
                            keyword
                    }
                    for (
                        category,
                        keyword
                    )
                    in sorted(
                        extracted_keywords
                    )
                    if keyword
                ]
            },


            "findings_created":

                findings_created

        }





    # ======================================

    # INVALID JSON

    # ======================================



    except json.JSONDecodeError:



        db.rollback()





        raise HTTPException(

            status_code=500,

            detail=(

                "Synthetic threat data "

                "contains invalid JSON."

            )

        )





    # ======================================

    # FASTAPI ERROR

    # ======================================



    except HTTPException:



        db.rollback()



        raise





    # ======================================

    # OTHER ERRORS

    # ======================================



    except Exception as error:



        db.rollback()





        print(

            "Threat scan error:",

            error

        )





        raise HTTPException(

            status_code=500,

            detail=(

                "Threat scan failed."

            )

        )