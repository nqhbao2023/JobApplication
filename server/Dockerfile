FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

# Cài full deps để build (có devDependencies)
RUN npm ci

COPY . .

# Build TypeScript
RUN npm run build

# Sau khi build xong thì xoá devDependencies
RUN npm prune --omit=dev

EXPOSE 3000

CMD ["npm", "start"]
