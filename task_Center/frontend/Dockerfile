# frontend/Dockerfile

FROM node:22-slim

WORKDIR /app

# On copie les fichiers de config
COPY package*.json ./

# On installe les dépendances
RUN npm install

# On copie le reste du code React
COPY . .

# On ouvre le port standard de Vite
EXPOSE 5173

# Commande de développement pour Docker (pour que ça marche en local)
CMD ["npm", "run", "dev", "--", "--host"]