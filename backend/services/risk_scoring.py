# backend/services/risk_scoring.py

from typing import Any, Dict, List, Optional, Tuple


# ============================================================
# BASE THREAT SCORES
# ============================================================

THREAT_BASE_SCORES: Dict[str, int] = {
    "ransomware": 50,
    "malware": 48,
    "api key": 48,
    "exploit": 48,
    "token": 45,
    "credential": 45,
    "password": 45,
    "database": 42,
    "phishing": 40,
    "leak": 35,
    "exposure": 35,
}


# ============================================================
# INDICATOR WEIGHTS
# Maximum indicator contribution: 25
# ============================================================

INDICATOR_WEIGHTS: Dict[str, int] = {
    "credential": 10,
    "password": 10,
    "api key": 12,
    "token": 10,
    "dump": 10,
    "database": 8,
    "leak": 8,
    "exposure": 8,
    "ransomware": 15,
    "malware": 12,
    "exploit": 12,
    "vulnerability": 10,
    "admin": 8,
    "root": 8,
    "for sale": 10,
    "stealer": 12,
    "combo": 10,
    "valid": 8,
    "login": 5,
}


# ============================================================
# ASSET TYPE WEIGHTS
# ============================================================

ASSET_TYPE_WEIGHTS: Dict[str, int] = {
    "email": 5,
    "domain": 4,
    "ip": 5,
    "ip_address": 5,
    "ip_range": 5,
    "keyword": 2,
}


# ============================================================
# EXPOSURE CONTEXT WEIGHTS
# Maximum context contribution: 10
# ============================================================

CONTEXT_WEIGHTS: Dict[str, int] = {
    "exposed": 5,
    "leaked": 5,
    "public": 4,
    "unauthorized": 6,
    "compromised": 8,
    "breached": 8,
}


# ============================================================
# SEVERITY
# ============================================================

def score_to_severity(score: int) -> str:
    if score >= 85:
        return "Critical"

    if score >= 70:
        return "High"

    if score >= 50:
        return "Medium"

    return "Low"


# ============================================================
# NORMALIZE ASSET TYPE
# ============================================================

def normalize_asset_type(
    asset_type: Optional[str]
) -> str:

    if not asset_type:
        return ""

    value = (
        str(asset_type)
        .strip()
        .lower()
        .replace("-", "_")
        .replace(" ", "_")
    )

    aliases = {
        "ipaddress": "ip_address",
        "ip_addr": "ip_address",
        "ipaddressrange": "ip_range",
        "ip_range_address": "ip_range",
    }

    return aliases.get(
        value,
        value
    )


# ============================================================
# PRIMARY THREAT
# ============================================================

def detect_primary_threat(
    content: Optional[str]
) -> str:

    text = str(
        content or ""
    ).lower()

    matched_category: Optional[str] = None
    highest_score = 0

    for keyword, score in THREAT_BASE_SCORES.items():

        if keyword in text and score > highest_score:
            highest_score = score
            matched_category = keyword

    return (
        matched_category
        if matched_category
        else "general"
    )


# ============================================================
# MATCH INDICATORS
# ============================================================

def _get_indicator_matches(
    text: str
) -> Tuple[List[Dict[str, Any]], int]:

    matched: List[Dict[str, Any]] = []
    total = 0

    for keyword, weight in INDICATOR_WEIGHTS.items():

        if keyword in text:

            matched.append({
                "indicator": keyword,
                "weight": weight,
            })

            total += weight

    return (
        matched,
        min(total, 25)
    )


# ============================================================
# MATCH CONTEXT
# ============================================================

def _get_context_matches(
    text: str
) -> Tuple[List[Dict[str, Any]], int]:

    matched: List[Dict[str, Any]] = []
    total = 0

    for keyword, weight in CONTEXT_WEIGHTS.items():

        if keyword in text:

            matched.append({
                "indicator": keyword,
                "weight": weight,
            })

            total += weight

    return (
        matched,
        min(total, 10)
    )


# ============================================================
# CALCULATE RISK SCORE
# ============================================================

def calculate_risk_score(
    content: Optional[str],
    asset_type: Optional[str] = None
) -> Tuple[int, str]:

    analysis = get_risk_analysis(
        content,
        asset_type
    )

    return (
        analysis["score"],
        analysis["severity"]
    )


# ============================================================
# FULL RISK ANALYSIS
# ============================================================

def get_risk_analysis(
    content: Optional[str],
    asset_type: Optional[str] = None
) -> Dict[str, Any]:

    text = str(
        content or ""
    ).lower()

    # --------------------------------------------------------
    # 1. PRIMARY THREAT / BASE SCORE
    # --------------------------------------------------------

    primary_threat = detect_primary_threat(
        text
    )

    base_score = THREAT_BASE_SCORES.get(
        primary_threat,
        20
    )

    # --------------------------------------------------------
    # 2. MATCHED INDICATORS
    # --------------------------------------------------------

    matched_indicators, indicator_bonus = (
        _get_indicator_matches(
            text
        )
    )

    # --------------------------------------------------------
    # 3. ASSET TYPE
    # --------------------------------------------------------

    normalized_asset = normalize_asset_type(
        asset_type
    )

    asset_bonus = ASSET_TYPE_WEIGHTS.get(
        normalized_asset,
        2
    )

    # --------------------------------------------------------
    # 4. EXPOSURE CONTEXT
    # --------------------------------------------------------

    matched_context, context_bonus = (
        _get_context_matches(
            text
        )
    )

    # --------------------------------------------------------
    # 5. FINAL SCORE
    # --------------------------------------------------------

    final_score = (
        base_score
        + indicator_bonus
        + asset_bonus
        + context_bonus
    )

    final_score = max(
        0,
        min(
            final_score,
            100
        )
    )

    severity = score_to_severity(
        final_score
    )

    # --------------------------------------------------------
    # 6. HUMAN-READABLE REASONS
    # --------------------------------------------------------

    reasons: List[str] = []

    if primary_threat != "general":

        reasons.append(
            f"Primary threat indicator: "
            f"{primary_threat} "
            f"(base score {base_score})"
        )

    else:

        reasons.append(
            "No high-priority threat category "
            "was identified; default base score applied."
        )

    if matched_indicators:

        indicator_names = ", ".join(
            item["indicator"]
            for item in matched_indicators
        )

        reasons.append(
            f"Matched indicators: "
            f"{indicator_names} "
            f"(+{indicator_bonus})"
        )

    else:

        reasons.append(
            "No additional threat indicators "
            "were detected."
        )

    if normalized_asset:

        reasons.append(
            f"Asset type: "
            f"{normalized_asset} "
            f"(+{asset_bonus})"
        )

    if matched_context:

        context_names = ", ".join(
            item["indicator"]
            for item in matched_context
        )

        reasons.append(
            f"Exposure context: "
            f"{context_names} "
            f"(+{context_bonus})"
        )

    return {
        "score": final_score,
        "severity": severity,
        "primary_threat": primary_threat,
        "base_score": base_score,
        "indicator_bonus": indicator_bonus,
        "asset_bonus": asset_bonus,
        "context_bonus": context_bonus,
        "matched_indicators": matched_indicators,
        "matched_context": matched_context,
        "reasons": reasons,
    }
