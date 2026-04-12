FROM node:20-alpine AS deps

RUN apk add libc6-compat

WORKDIR /app

RUN corepack enable

COPY ./package.json .
COPY ./yarn.lock .
COPY ./yarnrc.yml .

RUN yarn install --immutable

FROM node:20-alpine AS builder

RUN corepack enable

ARG NEXT_PUBLIC_ENABLE_IDEM_FORM=false
ENV NEXT_PUBLIC_ENABLE_IDEM_FORM=NEXT_PUBLIC_ENABLE_IDEM_FORM

ARG NEXT_PUBLIC_SHOW_SEEDED_IDEMS=false
ENV NEXT_PUBLIC_SHOW_SEEDED_IDEMS=NEXT_PUBLIC_SHOW_SEEDED_IDEMS

RUN apk add libc6-compat

WORKDIR /app

RUN corepack enable

COPY ./package.json .
COPY ./yarn.lock .
COPY ./yarnrc.yml .

RUN yarn install --immutable
