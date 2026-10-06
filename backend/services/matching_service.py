def find_match(asset_value: str, content: str) -> bool:
    if not asset_value or not content:
        return False

    return asset_value.lower() in content.lower()


def calculate_risk_score(content: str) -> tuple[int, str]:
    content_lower = content.lower()

    if "credential" in content_lower or "password" in content_lower:
        return 80, "High"

    if "leak" in content_lower or "exposure" in content_lower:
        return 60, "Medium"

    return 30, "Low"