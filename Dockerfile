# Single-container deployment: builds the Expo web app, then runs the
# Node/Express/Socket.IO server, which serves both the API and the built
# web app on one port.

FROM node:22-slim AS webbuild
WORKDIR /build/app
COPY app/package*.json ./
RUN npm install --legacy-peer-deps
COPY app/ ./
RUN npx expo export --platform web

FROM node:22-slim
WORKDIR /srv

COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

COPY server/ ./server/
COPY --from=webbuild /build/app/dist ./app/dist

WORKDIR /srv/server
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Persist the SQLite database and uploaded files outside the container layer.
VOLUME ["/srv/server/data", "/srv/server/uploads"]

CMD ["node", "src/index.js"]

git init
git add -A
git commit -m "Initial commit"
git remote add origin https://github.com/AkinHarwood/LEXHair.git
git push -u origin main
