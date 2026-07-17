FROM node:22-slim

WORKDIR /app

# build tools for better-sqlite3's native binding, in case no prebuilt binary
# matches this image's platform/arch (e.g. Hetzner's arm64 CAX instances)
RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 make g++ \
	&& rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY src ./src
COPY data ./data

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "src/server.js"]
