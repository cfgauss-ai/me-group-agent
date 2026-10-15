# node:20-bookworm (NOT -slim): better-sqlite3 ships prebuilt binaries for
# glibc; -slim lacks the toolchain needed if it has to compile from source.
FROM node:20-bookworm

WORKDIR /app

COPY package.json package-lock.json ./
# Install all deps (not --omit=dev): tsx runs src/*.ts directly at runtime,
# there is no build step.
RUN npm ci

COPY . .

CMD ["npm", "start"]
