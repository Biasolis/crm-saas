FROM node:20-alpine

WORKDIR /app

# Copia arquivos de dependência primeiro (Cache Layering)
COPY package.json ./

# Instala dependências
RUN npm install

# Copia o código fonte
COPY . .

# Expõe a porta
EXPOSE 3000

# Comando de inicialização (em dev usamos o script do package.json)
CMD ["npm", "run", "dev"]