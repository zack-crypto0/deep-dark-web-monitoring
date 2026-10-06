import ipaddress
import re


# =========================================================
# REGEX PATTERNS
# =========================================================

EMAIL_PATTERN = re.compile(
    r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}\b",
    re.IGNORECASE,
)


DOMAIN_PATTERN = re.compile(
    r"(?<![@\w-])"
    r"(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+"
    r"[A-Z]{2,63}\b",
    re.IGNORECASE,
)


IPV4_CANDIDATE_PATTERN = re.compile(
    r"(?<!\d)"
    r"(?:\d{1,3}\.){3}\d{1,3}"
    r"(?!\d)"
)


# =========================================================
# THREAT KEYWORDS
# =========================================================

KEYWORD_GROUPS = {

    "credential_exposure": (
        "credential",
        "credentials",
        "password",
        "passwords",
        "login",
        "logins",
    ),

    "data_exposure": (
        "leak",
        "leaked",
        "breach",
        "breached",
        "exposure",
        "exposed",
        "database dump",
    ),

    "malware_activity": (
        "malware",
        "ransomware",
    ),

    "account_compromise": (
        "compromised account",
        "compromised accounts",
        "account takeover",
    ),
}


# =========================================================
# UNIQUE VALUES
# =========================================================

def _unique_sorted(values):

    return sorted(
        {
            value.strip().lower()
            for value in values
            if value and value.strip()
        }
    )


# =========================================================
# IPv4 VALIDATION
# =========================================================

def _extract_ipv4_addresses(content):

    valid_addresses = set()

    for candidate in IPV4_CANDIDATE_PATTERN.findall(content):

        try:

            address = ipaddress.ip_address(
                candidate
            )

            if address.version == 4:

                valid_addresses.add(
                    str(address)
                )

        except ValueError:

            continue


    return sorted(
        valid_addresses
    )


# =========================================================
# KEYWORD EXTRACTION
# =========================================================

def _extract_keywords(content):

    matches = []

    seen = set()


    for category, keywords in KEYWORD_GROUPS.items():

        for keyword in keywords:

            pattern = re.compile(

                rf"(?<!\w)"
                rf"{re.escape(keyword)}"
                rf"(?!\w)",

                re.IGNORECASE
            )


            if pattern.search(content):

                key = (
                    category,
                    keyword.lower()
                )


                if key not in seen:

                    seen.add(key)


                    matches.append({

                        "keyword":
                            keyword.lower(),

                        "category":
                            category

                    })


    return sorted(

        matches,

        key=lambda item: (
            item["category"],
            item["keyword"]
        )
    )


# =========================================================
# MAIN ENTITY EXTRACTION
# =========================================================

def extract_entities(content):

    safe_content = str(
        content or ""
    )


    # -----------------------------------------------------
    # EMAIL
    # -----------------------------------------------------

    emails = _unique_sorted(

        EMAIL_PATTERN.findall(
            safe_content
        )
    )


    # -----------------------------------------------------
    # DOMAIN
    # -----------------------------------------------------

    domains = set(

        _unique_sorted(

            DOMAIN_PATTERN.findall(
                safe_content
            )
        )
    )


    # Extract domain from email as well.
    #
    # Example:
    # admin@example.com
    #
    # Email  -> admin@example.com
    # Domain -> example.com

    for email in emails:

        _, _, domain = email.rpartition(
            "@"
        )

        if domain:

            domains.add(
                domain.lower()
            )


    # -----------------------------------------------------
    # IPv4
    # -----------------------------------------------------

    ipv4_addresses = (
        _extract_ipv4_addresses(
            safe_content
        )
    )


    # -----------------------------------------------------
    # KEYWORDS
    # -----------------------------------------------------

    keywords = (
        _extract_keywords(
            safe_content
        )
    )


    # -----------------------------------------------------
    # RESULT
    # -----------------------------------------------------

    return {

        "emails":
            emails,

        "domains":
            sorted(domains),

        "ipv4_addresses":
            ipv4_addresses,

        "keywords":
            keywords,

        "summary": {

            "email_count":
                len(emails),

            "domain_count":
                len(domains),

            "ipv4_count":
                len(ipv4_addresses),

            "keyword_count":
                len(keywords),

            "total_entities": (

                len(emails)
                + len(domains)
                + len(ipv4_addresses)
                + len(keywords)

            )
        }
    }