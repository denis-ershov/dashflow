FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/shared/tsconfig.json ./packages/shared/tsconfig.json
COPY hub/package.json ./hub/package.json
COPY hub/tsconfig.json hub/tsconfig.build.json ./hub/
RUN npm ci --ignore-scripts

COPY packages/shared ./packages/shared
COPY hub/src ./hub/src
RUN npm run build:hub

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    HOME=/home/node \
    DASHFLOW_HUB_HOST=0.0.0.0 \
    DASHFLOW_HUB_PORT=47831
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY hub/package.json ./hub/package.json
RUN npm ci --omit=dev --ignore-scripts --workspace=dashflow-hub --workspace=@dashflow/shared --include-workspace-root=false

COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/hub/dist ./hub/dist
RUN mkdir -p /home/node/.dashflow-hub && chown -R node:node /home/node/.dashflow-hub

USER node
EXPOSE 47831
VOLUME ["/home/node/.dashflow-hub"]
ENTRYPOINT ["node", "hub/dist/cli.js"]
CMD ["serve"]
