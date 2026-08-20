# Base image for the Arcjet JS SDK Cloud Agent environment.
#
# Pinned to an exact Node 22 patch that satisfies the repo's `engines`
# (`>=22.21.0 <23`) and is new enough to run the pinned npm (`npm@12.0.1`
# requires Node `^22.22.2`). The devcontainer tracks Node 22, so this stays
# on the same major.
FROM node:22.22.2-bookworm-slim

# git and curl are required in fully custom images; ca-certificates keeps
# TLS working for registry and tooling downloads.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
    && rm -rf /var/lib/apt/lists/*

# Pin npm to the version declared in package.json's `packageManager` field,
# mirroring the CI `pin-npm` action. actions/setup-node cannot pin npm, so CI
# installs it explicitly and we do the same here.
RUN npm install --global npm@12.0.1

# Run as the unprivileged user that ships with the Node image.
USER node
