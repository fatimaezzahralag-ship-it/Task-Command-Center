# translator/Dockerfile

# On part d'une version légère de Python
FROM python:3.12-slim

WORKDIR /app

# On installe les outils système basiques
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# On copie la liste des dépendances et on les installe
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# On copie tout le code du dossier 'translator' dans le conteneur
COPY . .

# On ouvre le port 8000
EXPOSE 8000

# Commande de démarrage (on suppose que ton projet s'appelle 'translator' d'après le dossier)
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "translator.wsgi:application"]