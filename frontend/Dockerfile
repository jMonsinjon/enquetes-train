# Stage 1 : build de l'application React
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2 : serveur nginx
FROM nginx:alpine

# Seule BACKEND_SERVICE_URL est substituée — les variables nginx ($uri, $remote_addr…) sont préservées
ENV NGINX_ENVSUBST_TEMPLATE_VARS=BACKEND_SERVICE_URL

# Copie les fichiers buildés
COPY --from=builder /app/dist /usr/share/nginx/html

# Copie le template nginx (envsubst remplacera ${BACKEND_SERVICE_URL} au démarrage)
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
