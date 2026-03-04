# ==============================================================
# Dockerfile – AI Bug Detection System server image
# ==============================================================

FROM node:18-alpine

WORKDIR /app

# Install Python for AI modules
RUN apk add --no-cache python3 py3-pip gcc g++ cppcheck

# Copy backend files
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --production

# Copy application code
WORKDIR /app
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY requirements.txt ./

# Install Python dependencies
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# Create directories
RUN mkdir -p uploads reports logs

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

CMD ["node", "backend/server.js"]
