# =============================================================================
# CampusFind web -- build the React bundle, then serve it with nginx.
#
# The API URL is baked in at build time because Vite inlines import.meta.env
# into the bundle; it arrives as a build argument from docker-compose.yml.
# =============================================================================

# ------------------------------- stage 1: build ------------------------------
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ------------------------------ stage 2: runtime -----------------------------
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
