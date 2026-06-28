# Cardápio Online (SaaS)

Um sistema SaaS (Software as a Service) para criação, publicação e gerenciamento de cardápios online para restaurantes. O projeto permite que estabelecimentos gerenciem suas configurações operacionais, horários de funcionamento e catálogo de produtos, recebam pedidos em tempo real através de um painel (dashboard) e permitam que os clientes finais façam seus pedidos (checkout) com facilidade, gerando inclusive um link de confirmação para envio via WhatsApp.

---

## 🚀 Tecnologias Utilizadas

O ecossistema do projeto baseia-se em tecnologias modernas do ecossistema Python/Django para entregar alta performance e comunicação bidirecional em tempo real:

- **Backend Web (WSGI/ASGI):** [Django 6.0.6](https://docs.djangoproject.com/en/6.0/)
- **API RESTful:** [Django Rest Framework (DRF) 3.17.1](https://www.django-rest-framework.org/)
- **Assincronismo & WebSockets:** [Django Channels 4.3.2](https://channels.readthedocs.io/), [Daphne 4.2.2](https://github.com/django/daphne/), [Twisted 26.4.0](https://twisted.org/)
- **Banco de Dados (Desenvolvimento):** SQLite 3 (configuração integrada nativa)
- **Manipulação de Mídias:** [Pillow 12.2.0](https://python-pillow.org/) (para redimensionamento de imagens de produtos e logotipos)

---

## 📁 Estrutura do Projeto

A arquitetura do projeto é modular, estruturada de forma limpa em múltiplos *apps* do Django para garantir a manutenibilidade e separação de responsabilidades:

- [accounts/](file:///d:/GitHub/cardapio-online/accounts) — Gerenciamento do modelo de usuário customizado (`CustomUser`, autenticado via email), sessões de login (`UserSession`), cadastro de contas e atribuição de papéis/permissões baseados em Django `Group`.
- [cart/](file:///d:/GitHub/cardapio-online/cart) — Lógica de persistência temporária de itens selecionados no carrinho (`Cart` e `CartItem`), incluindo a associação de opcionais do produto escolhido.
- [catalog/](file:///d:/GitHub/cardapio-online/catalog) — Catálogo completo do restaurante. Gerencia categorias (`Category`), produtos (`Product`), galeria de imagens (`ProductImage`), e a estrutura dinâmica de opcionais: grupos de opções (`ProductOptionGroup` com regras de quantidade mínima/máxima) e as opções individuais (`ProductOption` com acréscimo de valores).
- [checkout/](file:///d:/GitHub/cardapio-online/checkout) — Fluxo público de finalização de compra. Controla os dados de contato do cliente (`Customer`), endereços para entrega (`Address`) e a view de processamento (`PublicCheckoutView`) que consolida o carrinho em um pedido formal e gera a mensagem formatada para WhatsApp.
- [dashboard/](file:///d:/GitHub/cardapio-online/dashboard) — Interface administrativa (frontend em templates Django e WebSockets) onde os restaurantes acompanham as configurações operacionais, cadastro de produtos e visualizam os pedidos recebidos em tempo real.
- [orders/](file:///d:/GitHub/cardapio-online/orders) — Gerenciamento central dos pedidos (`Order`), itens incluídos (`OrderItem`) e o controle histórico de transições de status (`OrderStatusHistory`), permitindo saber quando o pedido foi criado, preparado, saiu para entrega ou foi cancelado.
- [restaurants/](file:///d:/GitHub/cardapio-online/restaurants) — Definições centrais do restaurante (`Restaurant`, `RestaurantSettings` para taxas de entrega e chaves PIX) e a gestão de horários de funcionamento (`BusinessHours`), controlando de forma inteligente se o estabelecimento está aberto ou fechado em cada dia da semana.
- [app/](file:///d:/GitHub/cardapio-online/app) — Núcleo de configuração do Django. Contém as configurações principais (`settings.py`), barramento de rotas HTTP (`urls.py`), permissões customizadas (`permissions.py`) e o roteador de protocolos assíncronos (`asgi.py`).
- [static/](file:///d:/GitHub/cardapio-online/static) e [media/](file:///d:/GitHub/cardapio-online/media) — Arquivos estáticos globais (CSS, JavaScript, imagens base do sistema) e arquivos de upload de usuários (logotipos e imagens do catálogo).

---

## ⚡ Comunicação em Tempo Real (WebSockets)

O sistema conta com integração do **Django Channels** para atualizar o painel de pedidos do restaurante instantaneamente. Quando um cliente realiza o checkout público, o painel administrativo do respectivo restaurante é notificado via WebSocket no canal `ws/dashboard/orders/<restaurant_id>/`, evitando a necessidade de requisições periódicas (polling) e garantindo maior agilidade no atendimento de novos pedidos.

---

## ⚙️ Como Executar o Projeto Localmente

Siga o passo a passo abaixo para rodar a aplicação em seu ambiente de desenvolvimento local:

### 1. Clonar o repositório e acessar a pasta
```bash
git clone <url_do_repositorio> cardapio-online
cd cardapio-online
```

### 2. Criar e Ativar o Ambiente Virtual

- **No Windows:**
  ```powershell
  python -m venv .venv
  .venv\Scripts\activate
  ```
- **No Linux ou macOS:**
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```

### 3. Instalar as Dependências do Projeto
```bash
pip install -r requirements.txt
```

### 4. Rodar as Migrações do Banco de Dados
```bash
python manage.py migrate
```

### 5. Criar um Usuário Administrador (Superuser)
```bash
python manage.py createsuperuser
```
*Siga as instruções exibidas no console para cadastrar um e-mail de acesso e senha segura.*

### 6. Executar o Servidor de Desenvolvimento
```bash
python manage.py runserver
```
*Dica: Como a biblioteca `daphne` está no topo do `INSTALLED_APPS`, o comando `runserver` utilizará automaticamente o Daphne como servidor de desenvolvimento local, permitindo o tráfego de WebSockets normalmente.*

### 7. Acessar a Aplicação
- **Painel Administrativo / Login:** [http://localhost:8000/login/](http://localhost:8000/login/)
- **Visualização Pública de Cardápio:** [http://localhost:8000/menu/<slug-do-seu-restaurante>/](http://localhost:8000/menu/seu-restaurante/)

---

## 📊 APIs e Endpoints
O backend do projeto expõe endpoints REST robustos documentados detalhadamente no arquivo [AGENT.md](file:///d:/GitHub/cardapio-online/AGENT.md).
