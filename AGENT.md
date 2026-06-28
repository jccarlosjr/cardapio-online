# Guia de Arquitetura e Desenvolvimento (Agent & Dev Guide)

Este guia detalha a estrutura interna do projeto **Cardápio Online**, os padrões de design seguidos, as regras de segurança/multitenancy e a documentação completa dos endpoints e WebSockets. Foi elaborado para dar suporte tanto a desenvolvedores quanto a assistentes de IA que navegam pela base de código.

---

## 🏗️ Padrão de Desenvolvimento e Multitenancy

O sistema foi arquitetado como uma aplicação **SaaS Multitenant** leve. A entidade pivô de isolamento de dados é o modelo `Restaurant` (Restaurante).

### 1. Isolamento Multitenant de Dados
Cada usuário (`CustomUser`) está opcionalmente vinculado a um `Restaurant` através de uma chave estrangeira. A isolação lógica é garantida a nível de banco de dados por meio de filtros nos querysets dos ViewSets:
- **Função Utilitária:** A função helper [return_same_restaurant_queryset](file:///d:/GitHub/cardapio-online/app/permissions.py#L40-L43) (e similares locais nos apps) restringe a consulta de modo que o usuário logado só consiga ler ou modificar dados associados ao seu próprio restaurante (`request.user.restaurant`).
- **Acesso Superuser:** Caso o usuário seja um Superusuário e não possua um restaurante atribuído, ele pode ver todos os registros da tabela ou filtrar os registros dinamicamente passando o parâmetro `restaurant_id` na URL (por exemplo, `/api/settings/?restaurant_id=1`).

### 2. Controle de Acesso (RBAC) e Permissões Customizadas
O projeto utiliza um sistema de permissões baseado nos seguintes pilares:
- [GlobalDefaultPermission](file:///d:/GitHub/cardapio-online/app/permissions.py#L4-L38): Uma classe de permissão padrão que automatiza o mapeamento de métodos HTTP para permissões nativas do Django (Django codenames). Ela verifica automaticamente se o usuário possui a permissão no formato `<app_label>.<action>_<model_name>`:
  - `GET`, `OPTIONS`, `HEAD` ➔ `view`
  - `POST` ➔ `add`
  - `PUT`, `PATCH` ➔ `change`
  - `DELETE` ➔ `delete`
- [OrderStatusHistoryPermission](file:///d:/GitHub/cardapio-online/orders/views.py#L46-L51): Uma restrição específica aplicada ao histórico de transição de status de pedidos. Ela concede acesso de alteração se o usuário possuir explicitamente a permissão `orders.change_order`.

---

## 📡 Comunicação em Tempo Real (WebSockets)

O projeto integra **Django Channels** para permitir a notificação em tempo real de novos pedidos diretamente na tela do gestor do restaurante (Dashboard).

### Componentes de Rede:
- **Protocol Router:** O arquivo [app/asgi.py](file:///d:/GitHub/cardapio-online/app/asgi.py) encapsula as requisições HTTP normais via Django WSGI e as conexões assíncronas WebSockets via `AuthMiddlewareStack` e `URLRouter`.
- **Roteamento de Websockets:** Definido em [dashboard/routing.py](file:///d:/GitHub/cardapio-online/dashboard/routing.py). A rota exposta é:
  - `ws/dashboard/orders/<restaurant_id>/`
- **Consumidor:** O `OrderConsumer` (em `dashboard/consumers.py`) gerencia a entrada de conexões WebSocket, adiciona o cliente a um grupo do Django Channels baseado no `restaurant_id` e realiza o broadcast de mensagens quando pedidos forem criados ou atualizados.

---

## 🗺️ Mapa Completo de Endpoints

### 1. Interface Administrativa e Views Renderizadas (HTML)

Estas rotas são renderizadas no lado do servidor via Django Template Engine e exigem autenticação do usuário (através de `LoginRequiredMixin` nas Class-Based Views):

#### 🔐 Sessão e Contas
- `GET/POST /login/` — Tela de login do sistema administrativo. Usa formulário customizado `CustomAuthenticationForm`.
- `GET /logout/` — Realiza o encerramento da sessão ativa e redireciona para a tela de login.
- `GET /users/` — Página de gerenciamento de usuários vinculados ao restaurante.

#### 🖥️ Painel Operacional (Dashboard)
- `GET /` — Tela inicial consolidada do painel.
- `GET /restaurants/` — Interface para edição dos dados básicos do restaurante.
- `GET /products/` — Página visual para cadastrar, editar e desativar produtos e categorias do cardápio.
- `GET /orders/` — Central de monitoramento em tempo real dos pedidos recebidos com controle de status.

#### 📖 Cardápio Público
- `GET /menu/<slug:restaurant_slug>/` — Página pública onde o cliente final visualiza o cardápio ativo, calcula se o restaurante está aberto/fechado e monta o carrinho de compras.

---

### 2. API RESTful (Django Rest Framework)

Todas as requisições de dados utilizam o prefixo `/api/`. Os ViewSets utilizam os Routers do DRF, fornecendo automaticamente operações CRUD completas (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).

#### 🏢 Restaurante (`restaurants`)
- `/api/restaurants/` — CRUD dos dados institucionais do restaurante (nome, telefone, endereço, logo).
- `/api/settings/` — Configuração operacional (taxa de entrega, valor mínimo do pedido, chave PIX).
- `/api/business-hours/` — Grade de horários de funcionamento por dia da semana (abertura, fechamento e dias fechados).

#### 🔐 Gestão de Contas (`accounts`)
- `/api/accounts/` — Gerenciamento de usuários administradores e colaboradores do restaurante.
- `/api/groups/` — Leitura dos grupos de segurança / papéis de acesso cadastrados (ex: Administrador, Atendente, Cozinha). *Nota: substituindo a referência legada a `/api/roles/`.*

#### 📦 Catálogo (`catalog`)
- `/api/categories/` — Categorias do cardápio (ex: Entradas, Pizzas, Bebidas).
- `/api/products/` — Produtos cadastrados (nome, descrição, preço base, status ativo).
- `/api/product-images/` — Imagens secundárias para a galeria de fotos de cada produto.
- `/api/product-option-groups/` — Grupos de opcionais de um produto (ex: "Escolha o tamanho", "Escolha a borda"). Controla regras de `min_select` e `max_select`.
- `/api/product-options/` — As opções individuais de acréscimo (ex: "Tamanho G" (+ R$ 5.00), "Borda com Catupiry" (+ R$ 3.00)).

#### 🛒 Carrinho de Compras (`cart`)
- `/api/cart/` — Identifica as sessões ativas de carrinhos via `session_key`.
- `/api/cart-item/` — Itens adicionados ao carrinho, guardando referências ao produto, quantidade, observações e opcionais em formato JSON (`option_ids`).

#### 💳 Checkout e Fechamento (`checkout`)
- `POST /api/public/checkout/` — endpoint público e transacional que recebe os dados do cliente, monta o endereço, valida os opcionais e preços do produto, cria o pedido e retorna uma mensagem formatada de confirmação do WhatsApp.
- `/api/customers/` — Cadastro consolidado de clientes que já fizeram compras no sistema.
- `/api/addresses/` — Cadastro de endereços vinculados aos clientes.

#### 🛵 Pedidos (`orders`)
- `/api/order/` — Pedidos consolidados, exibindo totalizador, status atual e cliente.
- `/api/orderitem/` — Itens específicos associados a cada pedido.
- `/api/orderstatus/` — Histórico de mudanças de status do pedido. Ao alterar este histórico, o status principal do pedido e o histórico cronológico são atualizados em cadeia.
