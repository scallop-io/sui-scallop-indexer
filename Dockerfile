FROM node:lts

ARG GITHUB_ACCESS_TOKEN

WORKDIR /usr/src/app

COPY . .

RUN cp .npmrc .npmrc.default
RUN echo "//npm.pkg.github.com/:_authToken=${GITHUB_ACCESS_TOKEN}" >> .npmrc

RUN npm install --omit=dev --no-package-lock && npm run build

RUN rm .npmrc

CMD ["node", "dist/main.js"]