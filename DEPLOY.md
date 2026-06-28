# Plano de Deploy para Produção (Linux VPS)

Este guia documenta o passo a passo completo para implantar o projeto **Cardápio Online** em um servidor virtual privado (VPS) rodando Linux (Ubuntu 22.04 LTS ou superior/Debian).

A arquitetura de produção recomendada adota:
- **Nginx:** Servidor web frontal atuando como proxy reverso de alto desempenho e servindo os arquivos estáticos (`static`) e de mídia (`media`).
- **PostgreSQL:** Banco de dados relacional robusto para produção.
- **Redis:** Servidor in-memory que serve de Channel Layer para gerenciar a comunicação dos WebSockets do Django Channels.
- **Daphne:** Servidor ASGI executado sob controle de processo do Systemd para gerenciar requisições HTTP e WebSockets da aplicação de forma contínua.

---

## 1. Ajustes de Segurança no Projeto (`app/settings.py`)

Em produção, o código-fonte **nunca** deve conter dados confidenciais expostos (como chaves de criptografia e senhas). Recomenda-se o uso de variáveis de ambiente. Você pode ler essas variáveis no Django usando `os.environ` ou bibliotecas como `python-dotenv`.

### Ajustes no `app/settings.py` para Produção:

```python
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# 1. Desativar Depuração e carregar chave secreta de forma segura
DEBUG = os.environ.get('DJANGO_DEBUG', 'False') == 'True'
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')

# 2. Configurar Hosts Permitidos
ALLOWED_HOSTS = os.environ.get('DJANGO_ALLOWED_HOSTS', '').split(',')

# 3. Configuração do Banco de Dados PostgreSQL
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'cardapio_db'),
        'USER': os.environ.get('DB_USER', 'cardapio_user'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST', '127.0.0.1'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

# 4. Configurar Redis como Channel Layer para WebSockets
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/0')],
        },
    },
}

# 5. Servir Arquivos Estáticos e de Media via Nginx
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# 6. Cookies e SSL de Segurança (Ative apenas após instalar o HTTPS/SSL)
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
```

---

## 2. Instalação de Serviços na VPS

Acesse a VPS via SSH e atualize os pacotes do sistema:
```bash
sudo apt update && sudo apt upgrade -y
```

Instale os serviços básicos necessários para o ambiente de produção:
```bash
# Dependências de compilação, Nginx, Redis, PostgreSQL e Git
sudo apt install python3-pip python3-venv nginx redis-server postgresql postgresql-contrib libpq-dev git curl -y
```

### Habilitando e Iniciando o Redis:
```bash
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

---

## 3. Configuração do Banco de Dados PostgreSQL

1. Conecte-se ao terminal administrativo do PostgreSQL:
   ```bash
   sudo -i -u postgres psql
   ```
2. Crie o banco de dados e o usuário da aplicação com privilégios adequados:
   ```sql
   CREATE DATABASE cardapio_db;
   CREATE USER cardapio_user WITH PASSWORD 'coloque_uma_senha_forte_aqui';
   ALTER ROLE cardapio_user SET client_encoding TO 'utf8';
   ALTER ROLE cardapio_user SET default_transaction_isolation TO 'read committed';
   ALTER ROLE cardapio_user SET timezone TO 'America/Sao_Paulo';
   GRANT ALL PRIVILEGES ON DATABASE cardapio_db TO cardapio_user;
   \q
   ```

---

## 4. Instalação e Preparação da Aplicação

### Clonar o Repositório
Clonaremos o projeto no diretório `/var/www/` e daremos a propriedade do diretório ao seu usuário do Linux:
```bash
cd /var/www/
sudo git clone URL_DO_SEU_REPOSITORIO cardapio-online
sudo chown -R $USER:$USER cardapio-online
cd cardapio-online
```

### Criar o Ambiente Virtual e Instalar Pacotes de Produção
```bash
python3 -m venv .venv
source .venv/bin/activate

# Instalar os requisitos padrão do projeto
pip install -r requirements.txt

# Instalar os pacotes necessários exclusivos de produção (Redis, PostgreSQL e Gunicorn se desejado)
pip install channels-redis psycopg2-binary python-dotenv gunicorn
```

---

## 5. Criação do Arquivo de Configuração Ambiental (`.env`)

Crie o arquivo `.env` fora do controle de versão para armazenar os dados sensíveis da aplicação:
```bash
nano /var/www/cardapio-online/.env
```

Insira as configurações corretas para produção:
```env
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=sua_chave_secreta_segura_e_longa_aqui
DJANGO_ALLOWED_HOSTS=seu-dominio.com,www.seu-dominio.com,IP_DA_SUA_VPS
DB_NAME=cardapio_db
DB_USER=cardapio_user
DB_PASSWORD=coloque_uma_senha_forte_aqui
DB_HOST=127.0.0.1
DB_PORT=5432
REDIS_URL=redis://127.0.0.1:6379/0
```

### Rodando Migrações e Coleta de Estáticos
Com o `.env` configurado e o banco PostgreSQL no ar, execute os comandos do Django:
```bash
python manage.py migrate
python manage.py collectstatic --noinput
```

---

## 6. Configuração do Servidor ASGI (Daphne) via Systemd

Para garantir segurança, o Daphne não deve rodar como `root`. Nós o configuraremos para rodar sob o usuário de sistema `www-data` (o mesmo usado pelo Nginx).

Crie o arquivo de serviço do Systemd:
```bash
sudo nano /etc/systemd/system/daphne.service
```

Cole a configuração abaixo:
```ini
[Unit]
Description=Daphne ASGI daemon para o Cardapio Online
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/cardapio-online
# Carrega as variáveis de ambiente a partir do arquivo .env
EnvironmentFile=/var/www/cardapio-online/.env
ExecStart=/var/www/cardapio-online/.venv/bin/daphne -b 127.0.0.1 -p 8000 app.asgi:application

[Install]
WantedBy=multi-user.target
```

### Definindo Permissões de Pasta
Certifique-se de que o usuário `www-data` possui acesso à pasta do projeto, especialmente na pasta `media` para upload de fotos:
```bash
sudo chown -R www-data:www-data /var/www/cardapio-online/media
sudo chmod -R 775 /var/www/cardapio-online/media
```

### Iniciar e Habilitar o Daphne:
```bash
sudo systemctl daemon-reload
sudo systemctl enable daphne
sudo systemctl start daphne

# Verifique se o serviço iniciou corretamente
sudo systemctl status daphne
```

---

## 7. Configuração do Nginx (Proxy Reverso)

O Nginx ficará à frente escutando a porta pública `80`. Ele servirá arquivos estáticos e encaminhará conexões HTTP normais e conexões persistentes de WebSockets (Daphne) para a porta `8000`.

Crie um arquivo de bloco de servidor Nginx:
```bash
sudo nano /etc/nginx/sites-available/cardapio-online
```

Cole a seguinte configuração:
```nginx
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com IP_DA_SUA_VPS;

    # Limite máximo de upload (ex: fotos de produtos)
    client_max_body_size 10M;

    # Servindo Arquivos Estáticos (CSS, JS)
    location /static/ {
        alias /var/www/cardapio-online/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Servindo Mídias Carregadas (Imagens de Produtos, Logos)
    location /media/ {
        alias /var/www/cardapio-online/media/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Encaminhamento HTTP e WebSockets para o Daphne
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        
        # Cabeçalhos cruciais para o funcionamento de WebSockets
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_redirect off;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
    }
}
```

### Habilitando e Ativando as Configurações:
```bash
# Criar o link simbólico na pasta de sites habilitados
sudo ln -s /etc/nginx/sites-available/cardapio-online /etc/nginx/sites-enabled/

# Desativar o site default do Nginx para evitar conflitos
sudo rm /etc/nginx/sites-enabled/default

# Testar integridade da sintaxe do Nginx
sudo nginx -t

# Reiniciar o Nginx
sudo systemctl restart nginx
```

---

## 8. Certificado Digital SSL Gratuito (Certbot / Let's Encrypt)

Para garantir segurança na transmissão de dados e ativar conexões seguras de WebSocket (`wss://`), é obrigatório configurar um certificado SSL.

Instale o Certbot e execute o assistente automatizado:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
```

- Durante o processo interativo do Certbot, insira seu e-mail e concorde com os termos de uso.
- Selecione a opção para redirecionar automaticamente todo o tráfego HTTP para HTTPS. O Certbot atualizará seu arquivo `/etc/nginx/sites-available/cardapio-online` com as novas configurações de segurança de forma 100% automatizada.
- Certifique-se de atualizar a variável `SECURE_SSL_REDIRECT = True` (e as demais flags de segurança de cookies) no seu arquivo `app/settings.py` após o SSL estar ativo!
