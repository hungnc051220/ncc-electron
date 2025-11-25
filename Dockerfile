FROM node:22-slim AS base
ENV HOME=/home/app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV DOCKER=true
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR $HOME

# Copy package files and configuration files needed for install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY next.config.ts tsconfig.json postcss.config.mjs components.json ./

# Install all dependencies (including devDependencies for build)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR $HOME

# Copy all source files
COPY --from=base $HOME/node_modules ./node_modules
COPY . .

# Set environment variables for build (add your API URL here)
ENV NEXT_TELEMETRY_DISABLED=1
# ENV NEXT_PUBLIC_API_URL=your_api_url

# Build the application
RUN pnpm build:next

FROM node:22-alpine AS runner
ENV HOME=/home/app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR $HOME

# Copy necessary files from builder
COPY --from=builder $HOME/public ./public
COPY --from=builder $HOME/.next/standalone ./
COPY --from=builder $HOME/.next/static ./.next/static

# Set runtime environment variables
# ENV NEXT_PUBLIC_API_URL=your_api_url

USER node
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]