# =============================================================================
# CampusFind API -- multi-stage build.
#
# Stage 1 compiles TypeScript with the dev dependencies present; stage 2 keeps
# only the compiled JavaScript and the production dependencies, so the image
# that ships does not contain the compiler or any type packages.
# =============================================================================

# ------------------------------- stage 1: build ------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Copying the manifests on their own means `npm ci` is only re-run when a
# dependency actually changes, not on every source edit.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ------------------------------ stage 2: runtime -----------------------------
FROM node:22-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# Run as the unprivileged user that the node image already provides.
USER node

EXPOSE 4001

CMD ["node", "dist/index.js"]
