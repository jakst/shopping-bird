### BUILDER
FROM node:19.0.0-bullseye-slim AS builder

WORKDIR /app
RUN yarn global add turbo
COPY . .
RUN turbo prune --scope=hello-bird-server --docker

### INSTALLER
FROM node:19.0.0-bullseye-slim AS installer
WORKDIR /app

# We don't need the standalone Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# First install the dependencies (as they change less often)
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/yarn.lock ./yarn.lock
RUN yarn install

# Build the project
COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json
ENV NODE_ENV production
RUN yarn turbo run build --filter=hello-bird-server...


### RUNNER
FROM node:19.0.0-bullseye-slim AS runner
WORKDIR /app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# Install Google Chrome Stable and fonts
# Note: this installs the necessary libs to make the browser work with Puppeteer.
RUN apt-get update && apt-get install gnupg wget -y && \
  wget --quiet --output-document=- https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /etc/apt/trusted.gpg.d/google-archive.gpg && \
  sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
  apt-get update && \
  apt-get install google-chrome-stable -y --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*

COPY --from=installer /app/package.json package.json
COPY --from=installer /app/node_modules node_modules
COPY --from=installer /app/server/node_modules server/node_modules
COPY --from=installer /app/server/package.json server/package.json
COPY --from=installer /app/server/dist server/dist
LABEL fly_launch_runtime="nodejs"

ENV PUPPETEER_EXECUTABLE_PATH /usr/bin/google-chrome
CMD ["yarn", "server", "start"]