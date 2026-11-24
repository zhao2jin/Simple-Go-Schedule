# Stage 1: Bundle the Express API server
FROM node:22-slim AS builder
WORKDIR /app

COPY tsconfig.json ./
COPY server ./server
COPY shared ./shared

RUN npm install --no-save --no-audit --no-fund esbuild@^0.25.0 && \
    npx esbuild server/index.ts \
      --platform=node \
      --packages=external \
      --bundle \
      --format=cjs \
      --outdir=server_dist

# Stage 2: Minimal production runtime (server dependencies only)
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package.json ./package.root.json
RUN node -e 'const fs=require("fs"); const p=JSON.parse(fs.readFileSync("package.root.json","utf8")); fs.writeFileSync("package.json", JSON.stringify({name:"simple-go-schedule-api",private:true,dependencies:{express:p.dependencies.express}},null,2));' && \
    rm package.root.json && \
    npm install --omit=dev --no-audit --no-fund

COPY --from=builder /app/server_dist ./server_dist

USER node
EXPOSE 8080

CMD ["node", "server_dist/index.js"]
