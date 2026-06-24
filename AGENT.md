# Agent Documentation / Architecture Guide

Este arquivo detalha a estrutura interna do projeto **Cardápio Online**, os padrões de desenvolvimento seguidos e os endpoints disponíveis, para ajudar desenvolvedores (e IAs) a entenderem a arquitetura da aplicação.

## 🏗️ Padrão de Desenvolvimento

O sistema adota o padrão **SaaS Multitenant** leve, onde a entidade principal é o `Restaurant` (Restaurante). Cada restaurante gerencia seu próprio catálogo, pedidos e horários de funcionamento.

### Separação de Responsabilidades:
1. **Templates e Views Clássicas:** Para a interface administrativa (Dashboard) e controle de sessão (Accounts), o sistema utiliza *Class-Based Views* (CBVs) do Django que renderizam templates HTML diretamente.
2. **API RESTful (DRF):** A lógica de negócios, gestão de produtos, carrinho e checkout são fortemente baseados no Django Rest Framework (DRF), expondo endpoints via `ViewSets` e `Routers`. Isso facilita uma futura integração com *Single Page Applications* (SPA) ou aplicativos mobile.

---

## 🗺️ Mapa de Endpoints

### 1. 🖥️ Interface Administrativa & Templates (Frontend Renderizado)

- **Accounts:**
  - `GET/POST /login/` - Autenticação no sistema.
  - `GET /logout/` - Encerramento de sessão.
  - `GET /users/` - Template de gerenciamento de usuários.

- **Dashboard (Painel do Restaurante):**
  - `GET /` - Página inicial do Dashboard.
  - `GET /restaurants/` - Painel de configurações do Restaurante.
  - `GET /products/` - Gerenciamento visual do catálogo.
  - `GET /orders/` - Painel de controle de pedidos.

- **Catálogo Público:**
  - `GET /menu/<slug:restaurant_slug>/` - Visualização do cardápio público do restaurante.

---

### 2. 🔌 API RESTful (Endpoints DRF)

A API do projeto é acessível sob o prefixo `/api/` e utiliza os *Routers* padrão do DRF para fornecer automaticamente os métodos de CRUD (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).

#### 🏢 Restaurantes (`restaurants`)
- `/api/restaurants/` - CRUD de restaurantes.
- `/api/settings/` - Configurações gerais.
- `/api/business-hours/` - Horários de funcionamento.

#### 🔐 Contas e Usuários (`accounts`)
- `/api/accounts/` - Gestão de contas (usuários).
- `/api/roles/` - Papéis de acesso/permissões.

#### 📦 Catálogo de Produtos (`catalog`)
- `/api/categories/` - Categorias do cardápio (ex: Pizzas, Bebidas).
- `/api/products/` - Produtos do cardápio (ex: Pizza de Calabresa).
- `/api/product-images/` - Imagens adicionais de um produto.
- `/api/product-option-groups/` - Agrupamento de opções (ex: Tamanho, Borda).
- `/api/product-options/` - Valores das opções (ex: P, M, G, Catupiry).

#### 🛒 Carrinho de Compras (`cart`)
- `/api/cart/` - Sessões do carrinho de compras do usuário.
- `/api/cart-item/` - Itens inseridos no carrinho atual.

#### 💳 Checkout (`checkout`)
- `/api/public/checkout/` - Endpoint especializado para recebimento/processamento de checkout.
- `/api/customers/` - Dados dos clientes.
- `/api/addresses/` - Endereços de entrega.

#### 🛵 Pedidos (`orders`)
- `/api/order/` - Pedidos consolidados.
- `/api/orderitem/` - Itens específicos vinculados ao pedido.
- `/api/orderstatus/` - Histórico de atualização do status de entrega.
