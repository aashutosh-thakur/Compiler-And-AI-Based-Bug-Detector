"""
aiEngine.py – LLM API wrapper for contextual severity classification

AI Bug Detection System

This module handles communication with the LLM API (e.g., OpenAI, Anthropic)
to perform contextual analysis of SAST findings.
"""

import os
import json
import sys
from typing import Dict, List, Optional


# Configuration
API_KEY = os.environ.get("OPENAI_API_KEY", "")
MODEL = os.environ.get("AI_MODEL", "gpt-4o-mini")
CONFIDENCE_THRESHOLD = float(os.environ.get("AI_CONFIDENCE_THRESHOLD", "0.7"))


def build_classification_prompt(finding: Dict) -> str:
    """
    Construct the LLM prompt for a single SAST finding.

    The prompt includes the raw alert, CWE, surrounding code context,
    and asks the LLM to act as a security reviewer.
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

Respond in JSON format:
{{
  "ai_verdict": "true_positive" or "false_positive",
  "ai_severity": "critical" | "high" | "medium" | "low",
  "owasp": "A01: Broken Access Control" | ...,
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
        # Attempt LLM API call
        if API_KEY:
            return _call_llm_api(finding)
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
    for finding in findings:
        result = classify_finding(finding)
        finding.update(result)

        # Filter: suppress false positives above confidence threshold
        if result.get("ai_verdict") == "false_positive" and \
           result.get("ai_confidence", 0) >= CONFIDENCE_THRESHOLD:
            continue  # Suppress this finding

        classified.append(finding)

    return classified


def _call_llm_api(finding: Dict) -> Dict:
    """
    Call the OpenAI-compatible API.
    """
    try:
        import openai

        client = openai.OpenAI(api_key=API_KEY)
        prompt = build_classification_prompt(finding)

        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "You are an expert security code reviewer."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=500,
            response_format={"type": "json_object"},
        )

        result = json.loads(response.choices[0].message.content)
        return result

    except ImportError:
        print("[AI Engine] openai package not installed, using heuristics", file=sys.stderr)
        return _heuristic_classify(finding)
    except Exception as e:
        print(f"[AI Engine] API error: {e}", file=sys.stderr)
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
    high_cwes = {"CWE-79", "CWE-352", "CWE-22", "CWE-476", "CWE-119", "CWE-120"}

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
