FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npx prisma generate --schema=prisma/control/schema.prisma
RUN npx prisma generate --schema=prisma/tenant/schema.prisma
EXPOSE 4000
CMD ["npm", "run", "dev"]
