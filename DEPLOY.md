# Plano de Deploy (Linux VPS)

Este guia detalha o passo a passo para realizar o deploy do projeto **Cardápio Online** em uma VPS baseada em Linux (Ubuntu/Debian). O ambiente de produção utilizará **Nginx** (como proxy reverso e servidor estático), **Redis** (para suporte aos WebSockets no Django Channels), e **Daphne** (como servidor de aplicação ASGI).

---

## 1. Alterações Necessárias no Projeto (Código)

Antes de mover a aplicação para a VPS, você deve adaptar o arquivo `app/settings.py` para um ambiente de produção seguro.

### A. Ajustes no `app/settings.py`
1. **Desativar o modo de depuração (Crítico para segurança):**
   ```python
   DEBUG = False
   ```
2. **Configurar Hosts Permitidos:**
   ```python
   ALLOWED_HOSTS = ['seu-dominio.com', 'WWW.SEU-DOMINIO.COM', 'IP_DA_SUA_VPS']
   ```
3. **Configuração de Arquivos Estáticos e Media:**
   Em produção, o Django não serve mais arquivos estáticos. O Nginx fará isso.
   ```python
   import os
   
   STATIC_URL = '/static/'
   STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

   MEDIA_URL = '/media/'
   MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
   ```
4. **Configurar o Redis para o Django Channels:**
   Para garantir que as requisições assíncronas (WebSockets) funcionem corretamente.
   ```python
   CHANNEL_LAYERS = {
       "default": {
           "BACKEND": "channels_redis.core.RedisChannelLayer",
           "CONFIG": {
               "hosts": [("127.0.0.1", 6379)],
           },
       },
   }
   ```
   *(Obs: Você precisará adicionar `channels_redis` no seu `requirements.txt`)*.

---

## 2. Configuração Inicial da VPS (Ubuntu/Debian)

Acesse sua VPS via SSH e execute a instalação dos serviços básicos:

```bash
# Atualizar lista de pacotes
sudo apt update && sudo apt upgrade -y

# Instalar dependências essenciais
sudo apt install python3-pip python3-venv nginx redis-server curl git -y

# (Opcional - mas altamente recomendado) Instalar PostgreSQL para produção
sudo apt install postgresql postgresql-contrib libpq-dev -y
```

### Configurando o Redis
Habilite o Redis para iniciar junto com o sistema:
```bash
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

---

## 3. Preparando o Ambiente do Projeto na VPS

Baixe o projeto e instale o ambiente virtual. Neste exemplo, o projeto ficará no diretório padrão web `/var/www/`.

```bash
# Navegar até o diretório web e clonar o repositório
cd /var/www/
sudo git clone URL_DO_SEU_REPOSITORIO cardapio-online
sudo chown -R $USER:$USER cardapio-online
cd cardapio-online

# Criar ambiente virtual
python3 -m venv .venv
source .venv/bin/activate

# Instalar os pacotes Python do projeto e o Channels Redis
pip install -r requirements.txt
pip install channels_redis gunicorn daphne
```

### Fechando as preparações Django
Com o ambiente ativado, execute as preparações de banco e arquivos estáticos:
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py collectstatic --noinput
```

---

## 4. Configurando o Servidor ASGI (Daphne) via Systemd

Como seu projeto depende de *WebSockets* (Django Channels), usaremos o **Daphne** como servidor da aplicação rodando em background.

Crie o arquivo de serviço do Systemd:
```bash
sudo nano /etc/systemd/system/daphne.service
```

Cole o seguinte conteúdo (ajuste o caminho se necessário):
```ini
[Unit]
Description=Daphne ASGI daemon para o Cardápio Online
After=network.target

[Service]
User=root
Group=www-data
WorkingDirectory=/var/www/cardapio-online
Environment="PATH=/var/www/cardapio-online/.venv/bin"
ExecStart=/var/www/cardapio-online/.venv/bin/daphne -b 127.0.0.1 -p 8000 app.asgi:application

[Install]
WantedBy=multi-user.target
```

Ative e inicie o serviço do Daphne:
```bash
sudo systemctl daemon-reload
sudo systemctl enable daphne
sudo systemctl start daphne
sudo systemctl status daphne # Verifique se não houve erros
```

---

## 5. Configurando o Nginx (Proxy Reverso)

O Nginx vai gerenciar a porta `80`, redirecionando conexões HTTP e WebSockets para o Daphne na porta `8000`, e vai entregar imagens e arquivos estáticos super rápido.

Crie o bloco de servidor no Nginx:
```bash
sudo nano /etc/nginx/sites-available/cardapio
```

Cole o seguinte código:
```nginx
server {
    listen 80;
    server_name seu-dominio.com IP_DA_SUA_VPS;

    # Entregando Arquivos Estáticos (CSS, JS)
    location /static/ {
        alias /var/www/cardapio-online/staticfiles/;
    }

    # Entregando Media (Fotos de produtos, logotipos)
    location /media/ {
        alias /var/www/cardapio-online/media/;
    }

    # Proxy para rotas HTTP e WebSockets (Redirecionando para o Daphne)
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_redirect off;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Host $server_name;
    }
}
```

Habilite o site e reinicie o Nginx:
```bash
# Crie o link simbólico
sudo ln -s /etc/nginx/sites-available/cardapio /etc/nginx/sites-enabled/

# Teste se a configuração Nginx está correta
sudo nginx -t

# Reinicie o Nginx
sudo systemctl restart nginx
```

---

## 6. (Opcional, porém Crítico) Certificado SSL com Certbot

Para disponibilizar o HTTPS gratuitamente e habilitar cadeados de segurança, rode:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d seu-dominio.com
```

O próprio painel interativo do certbot irá configurar o redirecionamento de HTTP para HTTPS na sua configuração do Nginx automaticamente.
