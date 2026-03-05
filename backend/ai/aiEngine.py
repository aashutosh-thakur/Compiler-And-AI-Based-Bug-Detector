"""
aiEngine.py – Gemini AI wrapper for contextual severity classification

Compiler & AI Based Bug-Detector

This module handles communication with the Google Gemini API
to perform contextual analysis of SAST findings.
Falls back to heuristic classification if the API is unavailable.
"""

import os
import json
import sys
import re
import time
from typing import Dict, List


# Configuration
API_KEY = os.environ.get("GEMINI_API_KEY", "")
MODEL = os.environ.get("AI_MODEL", "gemini-2.0-flash")
CONFIDENCE_THRESHOLD = float(os.environ.get("AI_CONFIDENCE_THRESHOLD", "0.7"))
MAX_RETRIES = 3
RETRY_DELAY = 5  # seconds between retries on rate limit


def build_classification_prompt(finding: Dict) -> str:
    """
    Construct the LLM prompt for a single SAST finding.
    """
    prompt = f"""You are an expert application security engineer reviewing static analysis findings.
Analyze the following SAST alert and determine:

1. **Verdict**: Is this a true_positive or false_positive?
2. **Adjusted Severity**: Given the code context, what severity should this be? (critical/high/medium/low)
3. **OWASP Category**: Which OWASP Top 10 (2021) category does this map to?
4. **Explanation**: A clear, developer-friendly explanation of the issue.
5. **Remediation**: A specific code fix or mitigation strategy.
6. **Confidence**: Your confidence score from 0.0 to 1.0.

## Finding Details
- **Tool**: {finding.get('tool', 'unknown')}
- **Rule ID**: {finding.get('rule_id', 'N/A')}
- **CWE**: {finding.get('cwe', 'N/A')}
- **Reported Severity**: {finding.get('severity', 'N/A')}
- **Line**: {finding.get('line', 'N/A')}
- **Message**: {finding.get('message', '')}
- **Code Snippet**:
```
{finding.get('code_snippet', 'No code snippet available')}
```

Respond ONLY with a valid JSON object (no markdown, no code fences):
{{
  "ai_verdict": "true_positive" or "false_positive",
  "ai_severity": "critical" | "high" | "medium" | "low",
  "owasp": "A01: Broken Access Control" | "A02: Cryptographic Failures" | "A03: Injection" | ...,
  "ai_explanation": "...",
  "ai_remediation": "...",
  "ai_confidence": 0.0 - 1.0
}}
"""
    return prompt


def classify_finding(finding: Dict) -> Dict:
    """
    Send a finding to the LLM for classification.
    Falls back to heuristic classification if API is unavailable.
    """
    try:
        if API_KEY:
            return _call_gemini_api(finding)
        else:
            return _heuristic_classify(finding)
    except Exception as e:
        print(f"[AI Engine] Classification error: {e}", file=sys.stderr)
        return _heuristic_classify(finding)


def classify_findings(findings: List[Dict]) -> List[Dict]:
    """
    Classify a batch of findings, filtering out low-confidence false positives.
    """
    classified = []

    for i, finding in enumerate(findings):
        result = classify_finding(finding)
        finding.update(result)

        # Filter: suppress false positives above confidence threshold
        if result.get("ai_verdict") == "false_positive" and \
           result.get("ai_confidence", 0) >= CONFIDENCE_THRESHOLD:
            continue  # Suppress this finding

        classified.append(finding)

        # Rate limit: small delay between API calls to avoid quota issues
        if API_KEY and i < len(findings) - 1:
            time.sleep(1)

    return classified


def _call_gemini_api(finding: Dict) -> Dict:
    """
    Call the Google Gemini API using the new google-genai SDK.
    Includes retry logic for rate limiting.
    """
    try:
        from google import genai

        client = genai.Client(api_key=API_KEY)
        prompt = build_classification_prompt(finding)

        for attempt in range(MAX_RETRIES):
            try:
                response = client.models.generate_content(
                    model=MODEL,
                    contents=prompt,
                    config={
                        "temperature": 0.1,
                        "max_output_tokens": 500,
                        "response_mime_type": "application/json",
                    },
                )

                text = response.text.strip()

                # Remove code fences if present
                if text.startswith("```"):
                    text = re.sub(r"^```(?:json)?\s*", "", text)
                    text = re.sub(r"\s*```$", "", text)

                result = json.loads(text)

                # Validate required fields
                required = {"ai_verdict", "ai_severity", "ai_explanation",
                            "ai_remediation", "ai_confidence"}
                if not required.issubset(result.keys()):
                    print(f"[AI Engine] Gemini response missing fields", file=sys.stderr)
                    return _heuristic_classify(finding)

                return result

            except Exception as e:
                error_msg = str(e)
                if "429" in error_msg or "quota" in error_msg.lower() or "rate" in error_msg.lower():
                    wait = RETRY_DELAY * (attempt + 1)
                    print(f"[AI Engine] Rate limited, retrying in {wait}s (attempt {attempt + 1}/{MAX_RETRIES})",
                          file=sys.stderr)
                    time.sleep(wait)
                else:
                    raise  # Non-rate-limit error, don't retry

        # All retries exhausted
        print(f"[AI Engine] Rate limit retries exhausted, using heuristics", file=sys.stderr)
        return _heuristic_classify(finding)

    except ImportError:
        print("[AI Engine] google-genai not installed, using heuristics", file=sys.stderr)
        return _heuristic_classify(finding)
    except Exception as e:
        print(f"[AI Engine] Gemini API error: {e}", file=sys.stderr)
        return _heuristic_classify(finding)


def _heuristic_classify(finding: Dict) -> Dict:
    """
    Fallback heuristic classification when LLM is unavailable.
    Uses rule-based logic based on CWE and tool output.
    """
    severity = finding.get("severity", "low")
    cwe = finding.get("cwe", "")

    # Map known critical CWEs
    critical_cwes = {"CWE-89", "CWE-78", "CWE-798", "CWE-502"}
    high_cwes = {"CWE-79", "CWE-352", "CWE-22", "CWE-476", "CWE-119", "CWE-120", "CWE-327"}

    if cwe in critical_cwes:
        ai_severity = "critical"
    elif cwe in high_cwes:
        ai_severity = "high"
    else:
        ai_severity = severity

    return {
        "ai_verdict": "true_positive",
        "ai_severity": ai_severity,
        "ai_explanation": f"Heuristic classification based on {cwe or 'rule'}: {finding.get('message', '')}",
        "ai_remediation": "Review and fix the flagged code according to secure coding guidelines.",
        "ai_confidence": 0.6,
    }


# === Entry Point (called from Node.js subprocess) ===
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="AI Severity Classifier")
    parser.add_argument("--job-id", type=str, default="unknown")
    args = parser.parse_args()

    # Read findings from stdin
    input_data = sys.stdin.read()
    findings = json.loads(input_data)

    # Classify
    classified = classify_findings(findings)

    # Output classified findings as JSON to stdout
    print(json.dumps(classified, indent=2))
