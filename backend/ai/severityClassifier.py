"""
severityClassifier.py – ML-based or heuristic severity classifier

AI Bug Detection System

This module provides contextual severity classification for SAST findings.
It can be used as a standalone classifier or invoked from the AI engine.
"""

import json
import sys
import argparse
from typing import Dict, List


# CWE → OWASP Top 10 (2021) mapping
CWE_OWASP_MAP = {
    "CWE-89":  "A03: Injection",
    "CWE-79":  "A03: Injection",
    "CWE-78":  "A03: Injection",
    "CWE-77":  "A03: Injection",
    "CWE-352": "A01: Broken Access Control",
    "CWE-22":  "A01: Broken Access Control",
    "CWE-284": "A01: Broken Access Control",
    "CWE-287": "A07: Identification and Authentication Failures",
    "CWE-798": "A02: Cryptographic Failures",
    "CWE-327": "A02: Cryptographic Failures",
    "CWE-328": "A02: Cryptographic Failures",
    "CWE-330": "A02: Cryptographic Failures",
    "CWE-476": "A06: Vulnerable and Outdated Components",
    "CWE-120": "A06: Vulnerable and Outdated Components",
    "CWE-119": "A06: Vulnerable and Outdated Components",
    "CWE-125": "A06: Vulnerable and Outdated Components",
    "CWE-787": "A06: Vulnerable and Outdated Components",
    "CWE-502": "A08: Software and Data Integrity Failures",
    "CWE-611": "A05: Security Misconfiguration",
    "CWE-918": "A10: Server-Side Request Forgery",
    "CWE-200": "A01: Broken Access Control",
    "CWE-732": "A01: Broken Access Control",
}

# Severity weights for scoring
SEVERITY_WEIGHTS = {
    "critical": 15,
    "high": 10,
    "medium": 5,
    "low": 2,
    "info": 0,
}


def classify_severity(finding: Dict) -> Dict:
    """
    Classify the severity of a single finding using heuristic rules.

    Returns the finding enriched with AI classification fields.
    """
    cwe = finding.get("cwe", "")
    tool = finding.get("tool", "")
    severity = finding.get("severity", "low").lower()
    message = finding.get("message", "").lower()

    # OWASP mapping
    owasp = CWE_OWASP_MAP.get(cwe, finding.get("owasp"))

    # Severity adjustment rules
    ai_severity = severity
    ai_verdict = "true_positive"
    ai_confidence = 0.7

    # Rule 1: Known critical patterns
    critical_patterns = ["sql injection", "command injection", "hardcoded password",
                         "hardcoded secret", "remote code execution"]
    if any(p in message for p in critical_patterns):
        ai_severity = "critical"
        ai_confidence = 0.9

    # Rule 2: Known high patterns
    high_patterns = ["buffer overflow", "null pointer", "use after free",
                     "xss", "cross-site", "path traversal"]
    if any(p in message for p in high_patterns):
        ai_severity = "high"
        ai_confidence = 0.85

    # Rule 3: Common false positive patterns
    fp_patterns = ["unused variable", "missing docstring", "line too long",
                   "too many arguments", "naming convention"]
    if any(p in message for p in fp_patterns):
        ai_verdict = "false_positive"
        ai_severity = "low"
        ai_confidence = 0.8

    # Rule 4: Style-only issues (Pylint)
    if tool == "pylint" and severity in ("low", "info"):
        ai_verdict = "false_positive"
        ai_confidence = 0.75

    finding.update({
        "owasp": owasp,
        "ai_verdict": ai_verdict,
        "ai_severity": ai_severity,
        "ai_confidence": ai_confidence,
        "ai_explanation": f"Classified by heuristic rules based on {cwe or 'pattern matching'}.",
        "ai_remediation": _generate_remediation(ai_severity, cwe, message),
    })

    return finding


def classify_batch(findings: List[Dict]) -> List[Dict]:
    """
    Classify a batch of findings, filtering out confirmed false positives.
    """
    classified = []
    for finding in findings:
        result = classify_severity(finding)
        # Keep true positives and uncertain findings
        if result.get("ai_verdict") != "false_positive":
            classified.append(result)
        elif result.get("ai_confidence", 0) < 0.7:
            # Low-confidence FP → keep it but mark it
            classified.append(result)

    return classified


def _generate_remediation(severity: str, cwe: str, message: str) -> str:
    """Generate a basic remediation recommendation."""
    remediations = {
        "CWE-89":  "Use parameterized queries or prepared statements instead of string concatenation.",
        "CWE-79":  "Sanitize and encode all user inputs before rendering in HTML output.",
        "CWE-78":  "Avoid using shell commands with user input. Use safe APIs instead.",
        "CWE-476": "Add a null check before dereferencing the pointer.",
        "CWE-120": "Use bounded string functions (e.g., strncpy, snprintf) to prevent buffer overflow.",
        "CWE-798": "Remove hardcoded credentials and use environment variables or a secrets manager.",
        "CWE-22":  "Validate and sanitize file paths. Use allowlists for permitted directories.",
        "CWE-352": "Implement CSRF tokens for all state-changing operations.",
        "CWE-502": "Avoid deserializing untrusted data. Use safe serialization formats.",
    }
    return remediations.get(cwe, "Review and fix the flagged code according to secure coding best practices.")


# === Entry Point ===
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Severity Classifier")
    parser.add_argument("--job-id", type=str, default="unknown")
    args = parser.parse_args()

    # Read findings from stdin
    input_data = sys.stdin.read()
    findings = json.loads(input_data)

    # Classify
    classified = classify_batch(findings)

    # Output as JSON
    print(json.dumps(classified, indent=2))
