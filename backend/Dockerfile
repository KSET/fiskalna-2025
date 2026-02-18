FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma Client for the correct platform
RUN npx prisma generate

EXPOSE 3000
CMD ["npm", "run", "dev"]
