"""
riskScore.py – Risk Scoring Engine

AI Bug Detection System

Implements the weighted deduction formula:
  R = 100 - [(Critical × 15) + (High × 10) + (Medium × 5) + (Low × 2)]
  FinalScore = max(0, R)
"""

import json
import sys
from typing import Dict, List, Tuple


# Severity deduction weights
SEVERITY_WEIGHTS = {
    "critical": 15,
    "high": 10,
    "medium": 5,
    "low": 2,
    "info": 0,
}

# Grading thresholds
GRADE_THRESHOLDS = [
    (80, "Secure"),
    (50, "Moderate Risk"),
    (0,  "High Risk"),
]


def calculate_risk_score(findings: List[Dict]) -> Tuple[int, str]:
    """
    Calculate the risk score from a list of classified findings.

    Uses the AI-adjusted severity when available, falling back to
    the tool-reported severity.

    Returns:
        (score: int, grade: str)
    """
    total_deduction = 0
    severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}

    for finding in findings:
        sev = (finding.get("ai_severity") or finding.get("severity") or "low").lower()
        weight = SEVERITY_WEIGHTS.get(sev, 0)
        total_deduction += weight
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    # Apply floor
    score = max(0, 100 - total_deduction)

    # Determine grade
    grade = "High Risk"
    for threshold, label in GRADE_THRESHOLDS:
        if score >= threshold:
            grade = label
            break

    return score, grade


def build_score_breakdown(findings: List[Dict]) -> Dict:
    """
    Generate a detailed breakdown of the risk score calculation.
    """
    score, grade = calculate_risk_score(findings)

    severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    for finding in findings:
        sev = (finding.get("ai_severity") or finding.get("severity") or "low").lower()
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    breakdown = {
        "risk_score": score,
        "risk_grade": grade,
        "total_findings": len(findings),
        "severity_counts": severity_counts,
        "deduction_formula": (
            f"100 - [({severity_counts['critical']} × 15) + "
            f"({severity_counts['high']} × 10) + "
            f"({severity_counts['medium']} × 5) + "
            f"({severity_counts['low']} × 2)] = {score}"
        ),
    }

    return breakdown


# === Entry Point ===
if __name__ == "__main__":
    # Read findings from stdin
    input_data = sys.stdin.read()
    findings = json.loads(input_data)

    # Calculate score and build breakdown
    result = build_score_breakdown(findings)

    # Output as JSON
    print(json.dumps(result, indent=2))
