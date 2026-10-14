FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ARG VITE_LEGAL_NAME=
ARG VITE_SUPPORT_EMAIL=
ARG VITE_PRIVACY_URL=
ARG VITE_TERMS_URL=
ENV VITE_LEGAL_NAME=$VITE_LEGAL_NAME VITE_SUPPORT_EMAIL=$VITE_SUPPORT_EMAIL VITE_PRIVACY_URL=$VITE_PRIVACY_URL VITE_TERMS_URL=$VITE_TERMS_URL
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 5173
CMD ["nginx", "-g", "daemon off;"]
