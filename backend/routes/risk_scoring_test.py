from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.services.risk_scoring import get_risk_analysis


router = APIRouter(
    prefix="/risk-scoring",
    tags=["Risk Scoring"]
)


class RiskScoringTestRequest(BaseModel):
    content: str
    asset_type: Optional[str] = "Domain"


@router.post("/test")
def test_risk_scoring(request: RiskScoringTestRequest):
    """
    Test the Risk Scoring Engine without
    creating or modifying a finding.
    """

    # Prevent empty test content
    if not request.content.strip():
        raise HTTPException(
            status_code=400,
            detail="Content cannot be empty."
        )

    try:
        # Send content to the existing risk scoring engine
        analysis = get_risk_analysis(
            request.content,
            request.asset_type
        )

        return {
            "test": True,

            "content": request.content,

            "asset_type": request.asset_type,

            "risk_score": analysis.get("score"),

            "severity": analysis.get("severity"),

            "risk_analysis": analysis
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Risk scoring failed: {str(error)}"
        )