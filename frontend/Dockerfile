FROM node:20-alpine

WORKDIR /app

# Copia arquivos de dependência
COPY package.json ./

# Instala dependências
RUN npm install

# Copia o código fonte
COPY . .

# --- EXPOE 3000 ---
EXPOSE 3000

# Comando de inicialização
CMD ["npm", "run", "dev"]