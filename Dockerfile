# ── Build the React frontend ─────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# VITE_* values are baked into the frontend at build time
ARG VITE_COMPANY_NAME
ARG VITE_COMPANY_ADDRESS
ARG VITE_COMPANY_GSTIN
ARG VITE_SUPPORT_EMAIL
ARG VITE_GRIEVANCE_OFFICER
RUN npm run build

# ── Runtime: Express API + built frontend on one port ────────────
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY --from=build /app/dist ./dist
USER node
EXPOSE 5001
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:5001/api/database/status || exit 1
CMD ["node", "server/server.js"]
