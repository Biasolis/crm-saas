FROM node:20-alpine

WORKDIR /app

# Copia dependências
COPY package.json package-lock.json* ./

# Instala dependências
RUN npm install

# Copia todo o código fonte
COPY . .

# Expõe a porta 3000 (interna do container)
EXPOSE 3000

# Comando de desenvolvimento
CMD ["npm", "run", "dev"]