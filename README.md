# Cardápio Online (SaaS)

Um sistema SaaS (Software as a Service) para criação e gerenciamento de cardápios online para restaurantes. O projeto permite que restaurantes gerenciem seus catálogos de produtos, recebam pedidos e controlem o status das entregas, fornecendo uma interface pública para que os clientes finais façam seus pedidos (checkout).

## 🚀 Tecnologias Utilizadas

- **Backend:** Django 6.0, Django Rest Framework (DRF)
- **Assincronismo & WebSockets:** Django Channels, Daphne, Twisted
- **Banco de Dados:** SQLite (desenvolvimento padrão configurado no Django)
- **Outras Bibliotecas:** Pillow (para imagens de produtos)

## 📁 Estrutura do Projeto

O projeto é modular e dividido nos seguintes *apps* do Django:

- `accounts/`: Gerenciamento de usuários, autenticação, login, logout e papéis (roles).
- `cart/`: Gerenciamento de carrinho de compras (itens no carrinho).
- `catalog/`: Catálogo de produtos do restaurante, incluindo categorias, opções de produtos (ex: tamanho, bordas) e grupos de opções.
- `checkout/`: Processo de finalização de pedidos, informações do cliente e endereços.
- `dashboard/`: Views e templates do painel administrativo do restaurante.
- `orders/`: Gerenciamento de pedidos, itens do pedido e histórico de status.
- `restaurants/`: Gerenciamento das configurações dos restaurantes (horário de funcionamento, dados comerciais).

## ⚙️ Como Executar o Projeto Localmente

1. Clone o repositório.
2. Crie um ambiente virtual (recomendado):
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Linux/Mac:
   source .venv/bin/activate
   ```
3. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```
4. Execute as migrações do banco de dados:
   ```bash
   python manage.py migrate
   ```
5. Inicie o servidor de desenvolvimento:
   ```bash
   python manage.py runserver
   ```
6. Acesse no navegador: `http://localhost:8000/`

## 📊 Endpoints e APIs

O projeto possui tanto views renderizadas em templates HTML quanto uma API RESTful completa servida no prefixo `/api/`. (Veja o arquivo `AGENT.md` para uma lista detalhada da arquitetura de endpoints).
