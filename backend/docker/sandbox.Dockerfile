# ==============================================================
# sandbox.Dockerfile – Hardened sandbox image for code analysis
#
# Defense-in-depth: minimal packages, no network, non-root,
# read-only root filesystem, ephemeral /tmp.
# ==============================================================

FROM alpine:3.19

# Install only the analysis tools needed
RUN apk add --no-cache \
    gcc \
    g++ \
    musl-dev \
    cppcheck \
    python3 \
    py3-pip \
    py3-pylint \
    py3-bandit \
    && rm -rf /var/cache/apk/*

# Create a non-root user for analysis
RUN addgroup -S sandbox && adduser -S sandbox -G sandbox

# Working directory for analysis
WORKDIR /workspace

# Run as unprivileged user
USER sandbox

# Default: just echo usage
CMD ["echo", "Usage: docker run --rm -v /path/to/file:/workspace/input:ro sandbox-image <command>"]
