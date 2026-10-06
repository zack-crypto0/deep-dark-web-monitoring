import os

from dotenv import load_dotenv

from elasticsearch import (
    Elasticsearch,
    NotFoundError
)


load_dotenv()


# ==========================================
# CONFIGURATION
# ==========================================

ELASTICSEARCH_CLOUD_ID = os.getenv(
    "ELASTICSEARCH_CLOUD_ID"
)

ELASTICSEARCH_API_KEY = os.getenv(
    "ELASTICSEARCH_API_KEY"
)

ELASTICSEARCH_URL = os.getenv(
    "ELASTICSEARCH_URL",
    "https://localhost:9200"
)

ELASTICSEARCH_USERNAME = os.getenv(
    "ELASTICSEARCH_USERNAME",
    "elastic"
)

ELASTICSEARCH_PASSWORD = os.getenv(
    "ELASTICSEARCH_PASSWORD"
)

ELASTICSEARCH_CA_CERT = os.getenv(
    "ELASTICSEARCH_CA_CERT"
)


INDEX_NAME = "ddw_findings"


# ==========================================
# CREATE CLIENT
# ==========================================

def get_elasticsearch_client():

    # ======================================
    # ELASTIC CLOUD MODE
    # ======================================

    if ELASTICSEARCH_CLOUD_ID:

        # Preferred authentication:
        # Elastic Cloud API Key
        if ELASTICSEARCH_API_KEY:

            return Elasticsearch(
                cloud_id=ELASTICSEARCH_CLOUD_ID,
                api_key=ELASTICSEARCH_API_KEY,
                request_timeout=10
            )


        # Fallback:
        # username + password
        if ELASTICSEARCH_PASSWORD:

            return Elasticsearch(
                cloud_id=ELASTICSEARCH_CLOUD_ID,
                basic_auth=(
                    ELASTICSEARCH_USERNAME,
                    ELASTICSEARCH_PASSWORD
                ),
                request_timeout=10
            )


        raise RuntimeError(
            "Elastic Cloud authentication "
            "is not configured."
        )


    # ======================================
    # LOCAL ELASTICSEARCH MODE
    # ======================================

    if not ELASTICSEARCH_PASSWORD:

        raise RuntimeError(
            "ELASTICSEARCH_PASSWORD "
            "is not configured."
        )


    if not ELASTICSEARCH_CA_CERT:

        raise RuntimeError(
            "ELASTICSEARCH_CA_CERT "
            "is not configured for "
            "local Elasticsearch."
        )


    return Elasticsearch(

        ELASTICSEARCH_URL,

        basic_auth=(
            ELASTICSEARCH_USERNAME,
            ELASTICSEARCH_PASSWORD
        ),

        ca_certs=ELASTICSEARCH_CA_CERT,

        request_timeout=10
    )


# ==========================================
# CONNECTION CHECK
# ==========================================

def elasticsearch_available() -> bool:

    try:

        client = (
            get_elasticsearch_client()
        )

        return bool(
            client.ping()
        )


    except Exception as error:

        print(
            "Elasticsearch unavailable:",
            error
        )

        return False


# ==========================================
# CREATE INDEX
# ==========================================

def create_findings_index():

    client = (
        get_elasticsearch_client()
    )


    if client.indices.exists(
        index=INDEX_NAME
    ):

        return


    client.indices.create(

        index=INDEX_NAME,

        mappings={

            "properties": {

                "finding_id": {
                    "type": "integer"
                },

                "watchlist_id": {
                    "type": "integer"
                },

                "source_id": {
                    "type": "integer"
                },

                "matched_value": {
                    "type": "text",
                    "fields": {
                        "keyword": {
                            "type": "keyword"
                        }
                    }
                },

                "content": {
                    "type": "text"
                },

                "threat_category": {
                    "type": "text",
                    "fields": {
                        "keyword": {
                            "type": "keyword"
                        }
                    }
                },

                "risk_score": {
                    "type": "integer"
                },

                "severity": {
                    "type": "keyword"
                },

                "status": {
                    "type": "keyword"
                },

                "detected_at": {
                    "type": "date"
                }

            }
        }
    )


# ==========================================
# INDEX ONE FINDING
# ==========================================

def index_finding(
    finding
):

    client = (
        get_elasticsearch_client()
    )


    document = {

        "finding_id":
            finding.finding_id,

        "watchlist_id":
            finding.watchlist_id,

        "source_id":
            finding.source_id,

        "matched_value":
            finding.matched_value,

        "content":
            finding.content or "",

        "threat_category":
            finding.threat_category or "",

        "risk_score":
            finding.risk_score,

        "severity":
            finding.severity,

        "status":
            finding.status,

        "detected_at":
            (
                finding.detected_at.isoformat()
                if finding.detected_at
                else None
            )
    }


    client.index(

        index=INDEX_NAME,

        id=str(
            finding.finding_id
        ),

        document=document,

        refresh=True
    )


# ==========================================
# UPDATE FINDING STATUS
# ==========================================

def update_finding_index_status(
    finding_id: int,
    status: str
):

    client = (
        get_elasticsearch_client()
    )


    try:

        client.update(

            index=INDEX_NAME,

            id=str(
                finding_id
            ),

            doc={
                "status":
                    status
            },

            refresh=True
        )


    except NotFoundError:

        print(
            "Finding not present "
            "in Elasticsearch:",
            finding_id
        )


# ==========================================
# SEARCH FINDINGS
# ==========================================

def search_finding_ids(
    search_text: str
) -> list[int]:

    client = (
        get_elasticsearch_client()
    )


    response = client.search(

        index=INDEX_NAME,

        size=1000,

        query={

            "multi_match": {

                "query":
                    search_text,

                "fields": [

                    "matched_value^3",

                    "threat_category^2",

                    "content"
                ],

                "type":
                    "best_fields",

                "fuzziness":
                    "AUTO"
            }
        }
    )


    finding_ids = []


    for hit in (
        response["hits"]["hits"]
    ):

        source = hit["_source"]

        finding_ids.append(
            source["finding_id"]
        )


    return finding_ids