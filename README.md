# Compiler-Based AI Bug Detector

> **Advancing Automated Vulnerability Detection: Enhancing Traditional Compiler-Based Static Analysis Using AI-Driven Contextual Severity Classification**

[![GitHub Repository](https://img.shields.io/badge/GitHub-Compiler--Based--AI--Bug--Detector-blue?logo=github)](https://github.com/aashutosh-thakur/Compiler-Based-AI-Bug-Detector)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Project Structure](#project-structure)
3. [System Architecture](#system-architecture)
4. [Research Foundation](#research-foundation)
   - [Compiler-Based Error Detection](#1-compiler-based-error-detection)
   - [Static Analysis Techniques](#2-static-analysis-techniques-ast-cfg-data-flow)
   - [Compiler Warnings vs Static Analyzers](#3-compiler-warnings-vs-static-analyzers)
   - [AI for Bug Classification and Severity](#4-ai-for-bug-classification-and-severity)
   - [Mapping to OWASP Top 10](#5-mapping-vulnerabilities-to-owasp-top-10)
   - [Risk Scoring Models](#6-risk-scoring-models-for-quality)
   - [Reducing False Positives](#7-reducing-false-positives)
   - [Industry Tool Comparison](#8-industry-tool-comparison)
   - [Secure Platform Architecture](#9-secure-platform-architecture)
   - [Security of Executing Uploaded Code](#10-security-of-executing-uploaded-code)
5. [Technical Deep Dive](#technical-deep-dive)
6. [Risk Scoring Formula](#risk-scoring-formula)
7. [Academic Differentiation](#academic-differentiation)
8. [Future Roadmap](#future-roadmap)
9. [Getting Started](#getting-started)

---

## Project Overview

The modern software development lifecycle demands rapid iteration, yet this velocity frequently introduces severe architectural flaws, logic errors, and security vulnerabilities. Traditional heuristic-based **Static Application Security Testing (SAST)** tools generate an overwhelming volume of false positives, leading to alert fatigue and the eventual abandonment of security warnings by development teams.

This project addresses that gap by integrating **Artificial Intelligence (AI)**—specifically Large Language Models (LLMs)—into the static analysis ecosystem. By orchestrating a multi-tiered pipeline that ingests source code, normalizes disparate tool outputs, and applies AI-driven contextual reasoning, the system:

- **Drastically reduces false positives**
- **Accurately predicts vulnerability severity**
- **Generates structured, actionable security reports** (.docx format)
- **Maps findings to OWASP Top 10 categories**
- **Calculates a quantitative Risk Score**

The system supports **C/C++** (via GCC + Cppcheck) and **Python** (via Pylint + Bandit) and is designed as a fully web-based, async upload platform.

---

## Project Structure

```
AI-Bug-Detection-System/
│
├── frontend/
│   ├── index.html                # Landing + upload UI
│   ├── upload.html               # Dedicated upload / job status page
│   ├── report.html               # Report viewer (HTML + embedded JSON)
│   ├── assets/
│   │   ├── logo.svg
│   │   └── icons/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── main.js               # App boot, fetch wrappers
│   │   ├── upload.js             # Upload flow + progress
│   │   └── reportViewer.js       # Render report JSON to UI
│   └── components/               # Optional small HTML partials
│
├── backend/
│   ├── server.js                 # Express server (entry point)
│   ├── package.json
│   ├── config/
│   │   └── config.js             # Env-based config
│   ├── routes/
│   │   ├── uploadRoutes.js       # /api/upload, /api/status
│   │   ├── reportRoutes.js       # /api/report/:id
│   │   └── publicRoutes.js
│   ├── controllers/
│   │   ├── uploadController.js
│   │   ├── analysisController.js
│   │   └── reportController.js
│   ├── services/
│   │   ├── jobQueue.js           # Job enqueue/dequeue (Redis / Bull)
│   │   ├── sandboxManager.js     # Launches containers
│   │   └── storageManager.js     # Paths, retention
│   ├── compiler/
│   │   ├── cCompiler.js          # Wrappers for GCC / Cppcheck
│   │   ├── pythonAnalyzer.js     # Wrappers for Pylint / Bandit
│   │   └── outputParser.js       # Parse raw tool output → canonical JSON
│   ├── ai/
│   │   ├── aiEngine.py           # LLM API wrapper or local model runner
│   │   ├── severityClassifier.py # ML model or heuristics
│   │   └── riskScore.py          # Scoring engine
│   ├── report/
│   │   ├── reportGenerator.py    # Creates .docx from canonical JSON
│   │   └── template.docx
│   ├── db/
│   │   └── models/
│   │       ├── AnalysisJob.js
│   │       ├── Finding.js
│   │       └── ReportMeta.js
│   ├── utils/
│   │   ├── logger.js
│   │   ├── validator.js
│   │   └── sanitizer.js
│   └── docker/
│       ├── Dockerfile            # Server image
│       └── sandbox.Dockerfile    # Hardened image for executing compilers
│
├── uploads/                      # Temporary uploads (organized by job-id)
├── reports/                      # Generated .docx + JSON
├── scripts/
│   ├── init-db.js
│   └── cleanup-old-jobs.sh
├── requirements.txt              # Python deps for AI modules
└── README.md
```

---

## System Architecture

### System Flow

```
User Upload → Language Detection → Scatter-Gather Compiler/SAST Execution
    → JSON Output Parsing → AI Classification & Contextualization
        → Risk Scoring → .docx Report Generation → Async Download Delivery
```

### Web-Queue-Worker Pattern

The platform implements the **Web-Queue-Worker** architectural pattern to decouple the frontend API from heavy backend processing:

| Component | Technology | Role |
|---|---|---|
| **Frontend API** | Node.js + Express | Receives uploads, assigns Job IDs, enqueues jobs |
| **Message Queue** | Redis / Bull / RabbitMQ | Load-leveling buffer for analysis tasks |
| **Worker Nodes** | Dockerized analysis engines | Execute compilers, SAST tools, AI classification |
| **AI Layer** | Python (LLM API / local model) | Contextual severity classification & false positive filtering |
| **Report Generator** | python-docx | Produces structured `.docx` security reports |

---

## Research Foundation

### 1. Compiler-Based Error Detection

Traditional compilers (e.g., GCC, Clang) perform **lexical** and **syntax analysis** to enforce language rules and emit diagnostics. During compilation, code is tokenized and parsed into a parse tree or AST, catching:

- **Syntax errors**: unmatched braces, malformed loops
- **Semantic issues**: type mismatches, undeclared variables
- **Limited static checks**: uninitialized variable warnings via `-Wall`

Clang/GCC's `-fanalyzer` pass uses symbolic execution to spot bugs like null dereferences and buffer overruns at compile time. However, compilers analyze code **intraprocedurally** and are entirely blind to complex, interprocedural vulnerabilities (e.g., a tainted user input passing through multiple files before executing a malicious SQL query).

**Phases of Compiler Analysis:**

1. **Lexical Analysis** – Tokenizes the raw character stream, detecting illegal characters, malformed literals, and unclosed strings.
2. **Syntax Analysis (Parsing)** – Evaluates tokens against the language's context-free grammar to build an AST.
3. **Semantic Analysis** – Validates the AST against language rules using a Symbol Table; performs static type checking.

### 2. Static Analysis Techniques (AST, CFG, Data Flow)

Static code analysis tools build on compiler concepts to examine code structure and logic without executing it:

| Technique | Description |
|---|---|
| **AST Pattern Matching** | Traverses the tree to flag known security anti-patterns (e.g., `eval()`, `exec()`) |
| **Control Flow Graph (CFG)** | Directed graph of basic blocks modeling all execution paths |
| **Reaching Definitions** | Tracks which assignments reach a specific point — detects use-before-init |
| **Live Variable Analysis** | Detects dead stores and redundant computations |
| **Taint Analysis** | Tracks untrusted data from **Sources** → **Sinks**, checking for missing **Sanitizers** |
| **Symbolic Execution** | Assigns symbolic variables to inputs; uses constraint solvers (e.g., Z3) to validate exploit paths |

**Taint Analysis Model:**
- **Sources**: Points where untrusted data enters (HTTP requests, file uploads, DB reads)
- **Sinks**: Sensitive execution points (SQL engines, OS shell commands, HTML renderers)
- **Sanitizers**: Functions that validate or encode data, removing the "taint"

### 3. Compiler Warnings vs. Static Analyzers

| Dimension | Compiler Warnings | Dedicated SAST Tools |
|---|---|---|
| **Approximation** | Under-approximation (near-zero false positives) | Over-approximation (soundness, higher false positives) |
| **Scope** | Intraprocedural (one compilation unit at a time) | Interprocedural (whole-program analysis) |
| **Speed** | Fast (optimized for build pipelines) | Slower (exhaustive analysis passes) |
| **Focus** | Language correctness + code generation | Security vulnerabilities + code quality |
| **Diagnostic Depth** | Narrow range of common bugs | Thousands of specialized rules |

> Empirical research demonstrates that different static analysis tools show little to no agreement on detected issues in large-scale projects, underscoring the necessity of a **wrapper system** that aggregates outputs from multiple tools into a holistic security profile.

### 4. AI for Bug Classification and Severity

Recent work shows that machine learning and LLMs can significantly improve static analysis through **three key mechanisms**:

**1. False Positive Reduction**
LLMs evaluate the semantic intent of code to determine if a SAST tool was overly conservative. For example, Bandit may flag an SQL query string using string concatenation, but the LLM can recognize that the variable was sanitized by a custom validation function Bandit failed to recognize. Empirical studies show LLM-based triage eliminates **94–98% of false positives** while maintaining recall for genuine bugs.

**2. Contextual Severity Prediction**
The AI dynamically recalibrates raw SAST severity based on context:
- A hardcoded API key in an isolated unit test → downgraded to **Low**
- The same key in a production database connector → elevated to **Critical**

**3. Explainability and Automated Remediation**
The AI enriches cryptic tool outputs (e.g., `"CWE-476: NULL Pointer Dereference"`) with:
- Natural language explanations of how the data flow leads to the error
- Ready-to-merge code patches (reducing Time-to-Resolution)
- OWASP category mappings for compliance reporting

### 5. Mapping Vulnerabilities to OWASP Top 10

Raw SAST tools rarely output OWASP categories directly. Instead, they reference **Common Weakness Enumeration (CWE)** identifiers which are cross-referenced to OWASP categories:

| CWE | Vulnerability | OWASP Top 10 Category |
|---|---|---|
| CWE-89 | SQL Injection | A03: Injection |
| CWE-79 | Cross-Site Scripting | A03: Injection |
| CWE-352 | Cross-Site Request Forgery | A01: Broken Access Control |
| CWE-22 | Path Traversal | A01: Broken Access Control |
| CWE-476 | NULL Pointer Dereference | A06: Vulnerable Components |
| CWE-798 | Hardcoded Credentials | A02: Cryptographic Failures |

The platform implements **Phase 3 relational mapping logic** that cross-references detected CWE codes against the official NVD/OWASP dataset, automatically tagging each normalized JSON finding with its corresponding OWASP category for compliance-focused executive summaries.

### 6. Risk Scoring Models for Quality

The system evaluates several industry-standard scoring frameworks:

| Framework | Philosophy | Limitation |
|---|---|---|
| **CVSS (v3.1/v4.0)** | Severity of a specific, known vulnerability | Measures individual bugs, not holistic file risk |
| **CISQ / SQALE** | Technical debt, maintainability, reliability | Too complex for rapid single-file pipelines |
| **Custom Weighted Deduction** | Aggregated, weighted deduction from baseline 100 | Tunable and transparent |

#### Risk Scoring Formula

Starting from a baseline of **100** (mathematically clean code):

$$R_{final} = 100 - \left[\sum (Count_{Critical} \times 15) + (Count_{High} \times 10) + (Count_{Medium} \times 5) + (Count_{Low} \times 2)\right]$$

With a mathematical floor to prevent negative scores:

$$FinalScore = \max(0, R_{final})$$

#### Grading Thresholds

| Score Range | Grade | Verdict |
|---|---|---|
| **80 – 100** | 🟢 Secure | Excellent security hygiene. Safe for staging. |
| **50 – 79** | 🟡 Moderate Risk | Contains high-severity bugs. Pause deployment for manual review. |
| **Below 50** | 🔴 High Risk | Critically flawed. CI/CD pipeline must auto-reject. |

### 7. Reducing False Positives

| Technique | Description |
|---|---|
| **Path-sensitive analysis** | Confirms flagged conditions are actually reachable |
| **Symbolic execution** | Validates exploit paths using constraint solvers |
| **Context-aware rules** | Only applies checks when evidence is strong |
| **LLM-based triage** | Filters improbable issues below a confidence threshold |
| **Duplicate grouping** | Consolidates similar alerts (e.g., repeated null-pointer warnings) |
| **External library filtering** | Ignores issues originating in third-party or generated code |
| **Developer feedback loops** | Learns from user-confirmed false positives over time |

### 8. Industry Tool Comparison

| Tool | Analytical Mechanism | Languages | Strengths | Limitations |
|---|---|---|---|---|
| **Facebook Infer** | Separation Logic + bi-abduction | Java, C/C++, ObjC | Deep memory/concurrency bug detection | High computational overhead; narrow language support |
| **SonarQube** | AST + quality gates + technical debt | 35+ languages | Enterprise-wide quality tracking; marketplace rules | Shallow syntactic checks vs. deep interprocedural analysis |
| **Cppcheck** | Lightweight intraprocedural data-flow | C/C++ | Low false positives; fast; finds CVEs | No true whole-program taint analysis |
| **Bandit** | AST node visiting + security patterns | Python | Rapid; detects hardcoded secrets, insecure APIs | Strictly syntactic; blind to cross-function data-flow |
| **Pylint** | Extensive AST traversal + heuristics | Python | PEP-8 enforcement; code smell detection | High noise ratio; focuses on quality over deep security |
| **GCC / Clang** | Lexical + syntax + semantic analysis | C, C++, and more | Trusted, zero false-positive warnings | Intraprocedural only; misses complex multi-file vulnerabilities |

### 9. Secure Platform Architecture

The platform applies proven cloud architecture patterns:

| Pattern | Application |
|---|---|
| **Web-Queue-Worker** | Decouples upload API from async analysis workers |
| **Scatter-Gather** | Spawns concurrent compiler and SAST tool subprocesses per job |
| **Bulkhead** | Isolates each analysis component (compile, lint, AI, report) in its own container |
| **Quarantine** | Uploaded code passes through pre-checks in a sandboxed environment before full processing |
| **Strangler Fig** | Incrementally migrates legacy analysis scripts into containerized microservices |
| **API Gateway** | Enforces authentication/authorization on report downloads |

### 10. Security of Executing Uploaded Code

Running untrusted source code (even just compiling it) introduces critical **Remote Code Execution (RCE)** risks. The platform employs **defense-in-depth sandboxing**:

#### The Fallacy of Standard Containerization

Standard Docker containers share the underlying Linux kernel. A kernel zero-day can lead to **container escape**, compromising the host infrastructure. For a production-grade code execution platform, shared-kernel containerization is **fundamentally inadequate**.

#### Advanced Sandboxing Solutions

**1. User-Space Kernels (gVisor)**
Developed by Google, gVisor provides an application kernel written in memory-safe Go. System calls from untrusted tools are intercepted and reinterpreted in user space, preventing direct interaction with the host OS kernel.

**2. Hardware Virtualization (Firecracker / Kata Containers)**
AWS Firecracker and Kata Containers use KVM to wrap each analysis job in a lightweight MicroVM that instantiates in milliseconds. Each MicroVM possesses a dedicated, isolated kernel — a kernel exploit affects only that ephemeral sandbox.

#### Mandatory Runtime Constraints

| Constraint | Implementation |
|---|---|
| **Network Isolation** | Default-deny network policy; no outbound internet access |
| **CPU/Memory Quotas** | Hard cgroup limits eliminate fork bombs and resource exhaustion DoS |
| **Execution Timeout** | 60-second hard timeout neutralizes infinite loops |
| **Ephemeral Filesystems** | Temporary workspaces purged and destroyed immediately after job completion |

---

## Technical Deep Dive

### Output Normalization Schema

The `outputParser.js` module normalizes disparate raw outputs (GCC stderr, Pylint tabular text, Cppcheck XML, Bandit JSON) into a unified canonical schema:

```json
{
  "job_id": "abc-123",
  "file": "example.c",
  "language": "c",
  "findings": [
    {
      "tool": "cppcheck",
      "rule_id": "nullPointer",
      "cwe": "CWE-476",
      "owasp": "A06: Vulnerable and Outdated Components",
      "severity": "high",
      "line": 42,
      "column": 8,
      "message": "Possible null pointer dereference: ptr",
      "code_snippet": "int val = *ptr;",
      "ai_verdict": "true_positive",
      "ai_severity": "critical",
      "ai_explanation": "The pointer `ptr` can be null when the preceding allocation fails...",
      "ai_remediation": "Add a null check before dereferencing: if (ptr != NULL) { ... }"
    }
  ],
  "risk_score": 72,
  "risk_grade": "Moderate Risk"
}
```

### AI Classification Pipeline

```
Raw SAST Finding (CWE + Code Snippet)
        ↓
    LLM Prompt Construction
    (alert + CWE + surrounding code context)
        ↓
    ┌─────────────────────────┐
    │  LLM Classification     │
    │  • True Positive?       │
    │  • Adjusted Severity?   │
    │  • OWASP Category?      │
    │  • Remediation Patch?   │
    └─────────────────────────┘
        ↓
    Confidence Score Filtering
    (suppress findings below threshold)
        ↓
    Enriched JSON Finding
```

### Generated Report Structure (.docx)

1. **Cover Page** – Project title, timestamp, final Risk Score
2. **File Info & Code Statistics** – Language, LOC, cyclomatic complexity
3. **Summary Table** – Vulnerabilities grouped by OWASP Top 10 + severity
4. **Detailed Findings** – Raw code snippets, line numbers, AI-generated remediation
5. **Risk Score Analysis** – Mathematical derivation + risk mitigation recommendations

---

## Risk Scoring Formula

$$R_{final} = 100 - \left[\sum (Count_{Critical} \times 15) + (Count_{High} \times 10) + (Count_{Medium} \times 5) + (Count_{Low} \times 2)\right]$$

$$FinalScore = \max(0, R_{final})$$

Where:
- $Count_{Critical}$ = number of critical-severity findings
- $Count_{High}$ = number of high-severity findings
- $Count_{Medium}$ = number of medium-severity findings
- $Count_{Low}$ = number of low-severity findings

The formula can be extended to incorporate contextual weights such as:
- Whether the code is internet-facing
- Whether the module handles sensitive or PII data
- Lines of code normalization (to avoid penalizing larger codebases unfairly)

---

## Academic Differentiation

This project targets the methodological gap between **classic feature-based static analysis** and **modern LLM-driven probabilistic reasoning**.

### Research Title

> *"Enhancing Traditional Compiler-Based Static Analysis Using AI-Driven Contextual Severity Classification"*

### Evaluation Baselines

| Baseline | Description |
|---|---|
| **Baseline 1** | Raw Compiler Output only (`gcc -Wall`, `pylint`) |
| **Baseline 2** | Raw Static Analyzer Output (unfiltered Cppcheck + Bandit JSON) |
| **Proposed System** | AI-Enhanced Hybrid Output (LLM-filtered + contextually scored) |

### Evaluation Metrics

| Metric | Definition |
|---|---|
| **False Positive Reduction Rate (FPRR)** | % of spurious Baseline 2 alerts suppressed by the AI layer |
| **Severity Accuracy** | Alignment of AI-adjusted severities vs. human-expert ground truth labels |
| **Developer Usability** | Qualitative UX survey: comprehension improvement + debugging time reduction |

### Test Datasets

- [SARD Juliet Test Suite](https://samate.nist.gov/SARD/test-suites/112) – NIST's standardized vulnerable code repository
- [DiverseVul](https://github.com/wagner-group/diversevul) – Diverse real-world vulnerability dataset

### The Hybrid Symbiosis

| Engine | Strength | Weakness |
|---|---|---|
| **Deterministic SAST (Cppcheck, Bandit)** | Mathematically exhaustive; misses no code path | Lacks semantic intuition; floods with false positives |
| **LLM (AI Layer)** | Profound semantic context understanding | Cannot trace variable propagation across million-line repos |
| **Hybrid (This System)** | Breadth of traditional SAST + precision of AI | — |

---

## Future Roadmap

| Phase | Feature | Description |
|---|---|---|
| **Phase 3a** | Multi-File Interprocedural Support | Parse entire directory structures; track cross-file taint flows |
| **Phase 3b** | Code Complexity Analysis | Integrate McCabe cyclomatic complexity into Risk Scoring Engine |
| **Phase 3c** | OWASP Benchmark Scoring | Auto-generate scorecards measuring True Positive vs. False Positive ratio |
| **Phase 3d** | CI/CD Integration | GitHub Actions / GitLab CI plugin for automatic PR analysis |
| **Phase 3e** | Fine-tuned Local Model | Replace LLM API calls with a locally hosted, fine-tuned classification model |

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- Python (3.10+)
- Docker
- GCC / G++
- Redis (for job queue)

### Installation

```bash
# Clone the repository
git clone https://github.com/aashutosh-thakur/Compiler-Based-AI-Bug-Detector.git
cd Compiler-Based-AI-Bug-Detector

# Install Node.js dependencies
cd backend
npm install

# Install Python dependencies
pip install -r requirements.txt

# Initialize the database
node scripts/init-db.js

# Start the server
node backend/server.js
```

### Environment Variables

Create a `.env` file in the `backend/` directory:

```env
PORT=3000
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=your_api_key_here
UPLOAD_DIR=../uploads
REPORTS_DIR=../reports
SANDBOX_TIMEOUT=60
```

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## License

This project is developed for academic research purposes. See [LICENSE](LICENSE) for details.

---

> **Sources:** Authoritative blogs and publications on static analysis, compiler diagnostics, ML in SAST, OWASP, and tool documentation were used to inform this research. The referenced frameworks provide technical grounding for each topic, including GCC/Clang documentation, SonarQube research, Facebook Infer publications, OWASP Top 10 (2021/2025), NVD CWE database, CVSS v3.1/v4.0 specifications, and empirical studies on LLM-based false positive reduction.
