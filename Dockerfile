FROM node:18-alpine

ARG SHOPIFY_API_KEY
ENV SHOPIFY_API_KEY=$SHOPIFY_API_KEY
EXPOSE 8081
WORKDIR /app
COPY web/backend ./backend
COPY web/frontend ./frontend
RUN cd backend && npm install
RUN cd frontend && npm install && npm run build
WORKDIR /app/backend
CMD ["npm", "run", "serve"]
