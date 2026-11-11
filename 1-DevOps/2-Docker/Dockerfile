FROM node:20-alpine AS deps

WORKDIR /app

COPY ../package.json yarn.lock .yarnrc.yml ./
RUN corepack enable
RUN yarn install --immutable
COPY ../ .

FROM node:20-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_ENABLE_IDEM_FORM=false
ARG NEXT_PUBLIC_SHOW_SEEDED_IDEMS=false

ENV NEXT_PUBLIC_ENABLE_IDEM_FORM=$NEXT_PUBLIC_ENABLE_IDEM_FORM
ENV NEXT_PUBLIC_SHOW_SEEDED_IDEMS=$NEXT_PUBLIC_SHOW_SEEDED_IDEMS

COPY --from=deps /app ./
RUN corepack enable
RUN yarn build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
USER nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]