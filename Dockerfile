FROM node:lts

WORKDIR /usr/src/app

COPY . .

RUN npm install --omit=dev --no-package-lock && npm run build

CMD ["node", "dist/main.js"]