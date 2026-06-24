let orderDetailModal;
let selectedStatus = "";
let selectedRestaurant = "";
let allOrders = [];

const statusMapper = {
    'pending': { name: 'Pendente', badge: 'bg-warning text-dark' },
    'confirmed': { name: 'Confirmado', badge: 'bg-info text-dark' },
    'preparing': { name: 'Em preparo', badge: 'bg-primary text-white' },
    'ready': { name: 'Pronto para retirada', badge: 'bg-success text-white' },
    'delivering': { name: 'Em entrega', badge: 'bg-secondary text-white' },
    'delivered': { name: 'Entregue', badge: 'bg-light text-dark border' },
    'cancelled': { name: 'Cancelado', badge: 'bg-danger text-white' }
};

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Modal
    orderDetailModal = new bootstrap.Modal(document.getElementById('orderDetailModal'));

    // Bind event listeners for filters
    document.getElementById('filter-restaurant').addEventListener('change', (e) => {
        selectedRestaurant = e.target.value;
        fetchOrders();
    });

    document.getElementById('filter-status').addEventListener('change', (e) => {
        selectedStatus = e.target.value;
        updateActiveStatusCard(selectedStatus);
        renderOrders();
    });

    document.getElementById('btn-refresh-orders').addEventListener('click', () => {
        fetchOrders();
    });

    // Bind click events on top summary cards
    document.querySelectorAll('#status-summary-cards .status-card').forEach(card => {
        card.addEventListener('click', () => {
            const status = card.getAttribute('data-status');
            if (selectedStatus === status) {
                // Toggle off
                selectedStatus = "";
            } else {
                selectedStatus = status;
            }
            document.getElementById('filter-status').value = selectedStatus;
            updateActiveStatusCard(selectedStatus);
            renderOrders();
        });
    });

    // Load initial data
    loadRestaurants();
});

// Load restaurants to populate dropdown
async function loadRestaurants() {
    try {
        const restaurants = await getData('/api/restaurants/');
        const select = document.getElementById('filter-restaurant');
        
        // Clear options except the first one
        select.innerHTML = '<option value="">Todos os restaurantes</option>';
        
        if (restaurants && restaurants.length > 0) {
            restaurants.forEach(rest => {
                const opt = document.createElement('option');
                opt.value = rest.id;
                opt.textContent = rest.name;
                opt.dataset.slug = rest.slug;
                select.appendChild(opt);
            });

            // If there's only 1 restaurant, select it and trigger load
            if (restaurants.length === 1) {
                select.value = restaurants[0].id;
                selectedRestaurant = restaurants[0].id;
                // If the user has only one restaurant, we can hide the select container or disable it
                if (select.options.length <= 2) {
                    select.disabled = true;
                }
            }
        }
        
        // Function to update the link
        const updateRestaurantLink = () => {
            const link = document.getElementById('restaurant-order-link');
            if (!link) return;
            if (select.value) {
                const selectedOption = select.options[select.selectedIndex];
                const slug = selectedOption.dataset.slug;
                if (slug) {
                    link.href = `/menu/${slug}/`;
                    link.style.display = 'inline-block';
                } else {
                    link.style.display = 'none';
                }
            } else {
                link.style.display = 'none';
            }
        };

        // Update link initially and on change
        updateRestaurantLink();
        select.addEventListener('change', updateRestaurantLink);
       
        // Fetch orders initially
        fetchOrders();
    } catch (error) {
        console.error("Erro ao carregar restaurantes:", error);
        fetchOrders();
    }
}

// Fetch orders from API
async function fetchOrders() {
    let url = '/api/order/';
    const params = [];
    if (selectedRestaurant) {
        params.push(`restaurant_id=${selectedRestaurant}`);
    }
    if (params.length > 0) {
        url += '?' + params.join('&');
    }

    try {
        const orders = await getData(url);
        allOrders = orders || [];
        
        // Update summary cards count
        updateSummaryCounters();
        
        // Render filtered list
        renderOrders();
    } catch (error) {
        console.error("Erro ao carregar pedidos:", error);
    }
}

// Calculate and update top counter numbers
function updateSummaryCounters() {
    const counts = {
        pending: 0,
        confirmed: 0,
        preparing: 0,
        ready: 0,
        delivering: 0,
        delivered: 0,
        cancelled: 0
    };

    allOrders.forEach(order => {
        if (counts[order.status] !== undefined) {
            counts[order.status]++;
        }
    });

    for (const status in counts) {
        const el = document.getElementById(`count-${status}`);
        if (el) {
            el.textContent = counts[status];
        }
    }
}

// Highlight the active status card filter
function updateActiveStatusCard(status) {
    document.querySelectorAll('#status-summary-cards .status-card').forEach(card => {
        if (card.getAttribute('data-status') === status) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
}

// Filter and render orders to UI
function renderOrders() {
    const listContainer = document.getElementById('orders-list');
    const emptyState = document.getElementById('orders-empty-state');
    
    // Clear list but preserve empty state
    listContainer.innerHTML = '';
    listContainer.appendChild(emptyState);

    const filtered = allOrders.filter(order => {
        if (selectedStatus && order.status !== selectedStatus) {
            return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        emptyState.classList.remove('d-none');
        return;
    }

    emptyState.classList.add('d-none');

    filtered.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'order-card card border-0 shadow-lg mb-3';
        orderCard.setAttribute('data-status', order.status);

        const customerName = order.customer_details ? order.customer_details.name : 'Cliente desconhecido';
        const formattedDate = maskDateHour(order.created_at);
        const statusMap = statusMapper[order.status] || { name: order.status, badge: 'bg-secondary' };

        // Build card layout
        orderCard.innerHTML = `
            <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                    <div>
                        <span class="fw-bold fs-5">#${order.id}</span>
                        <span class="text-muted ms-2 small"><i class="bi bi-clock me-1"></i>${formattedDate}</span>
                        ${selectedRestaurant === "" && order.restaurant_name ? `<span class="badge bg-secondary ms-2">${order.restaurant_name}</span>` : ''}
                    </div>
                    <span class="badge ${statusMap.badge} fs-7 py-2 px-3">${statusMap.name}</span>
                </div>
                <div class="row align-items-center g-2 mb-3">
                    <div class="col-12 col-md-8">
                        <div class="fw-semibold"><i class="bi bi-person me-1 text-muted"></i>${customerName}</div>
                        <div class="text-muted small"><i class="bi bi-tag me-1"></i>${order.items.length} itens</div>
                    </div>
                    <div class="col-12 col-md-4 text-md-end">
                        <span class="text-muted small">Total:</span>
                        <span class="fw-bold fs-5 text-primary d-block d-md-inline ms-md-1">R$ ${parseFloat(order.total).toFixed(2).replace('.', ',')}</span>
                    </div>
                </div>
                <div class="d-flex justify-content-between align-items-center border-top pt-3 flex-wrap gap-2">
                    <div class="d-flex gap-2">
                        ${getQuickActionButtons(order)}
                    </div>
                    <button class="btn btn-sm btn-outline-primary" onclick="openOrderDetails(${order.id})">
                        <i class="bi bi-eye me-1"></i> Ver Detalhes
                    </button>
                </div>
            </div>
        `;

        listContainer.appendChild(orderCard);
    });
}

// Generate action buttons for the card based on order status
function getQuickActionButtons(order) {
    if (order.status === 'pending') {
        return `
            <button class="btn btn-sm btn-success" onclick="updateOrderStatus(event, ${order.id}, 'confirmed')">
                <i class="bi bi-check-lg me-1"></i>Confirmar
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="updateOrderStatus(event, ${order.id}, 'cancelled')">
                <i class="bi bi-x-lg me-1"></i>Cancelar
            </button>
        `;
    }
    if (order.status === 'confirmed') {
        return `
            <button class="btn btn-sm btn-primary" onclick="updateOrderStatus(event, ${order.id}, 'preparing')">
                <i class="bi bi-play-fill me-1"></i>Preparar
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="updateOrderStatus(event, ${order.id}, 'cancelled')">
                Cancelar
            </button>
        `;
    }
    if (order.status === 'preparing') {
        return `
            <button class="btn btn-sm btn-success" onclick="updateOrderStatus(event, ${order.id}, 'ready')">
                <i class="bi bi-bell-fill me-1"></i>Pronto para Retirada
            </button>
        `;
    }
    if (order.status === 'ready') {
        return `
            <button class="btn btn-sm btn-secondary" onclick="updateOrderStatus(event, ${order.id}, 'delivering')">
                <i class="bi bi-truck me-1"></i>Saiu para Entrega
            </button>
            <button class="btn btn-sm btn-success" onclick="updateOrderStatus(event, ${order.id}, 'delivered')">
                <i class="bi bi-check-circle-fill me-1"></i>Entregue
            </button>
        `;
    }
    if (order.status === 'delivering') {
        return `
            <button class="btn btn-sm btn-success" onclick="updateOrderStatus(event, ${order.id}, 'delivered')">
                <i class="bi bi-check-circle-fill me-1"></i>Marcar como Entregue
            </button>
        `;
    }
    return ''; // No quick action buttons for finished/cancelled orders
}

// REST call to change status
async function updateOrderStatus(event, orderId, newStatus) {
    if (event) {
        event.stopPropagation();
    }

    try {
        await patchData(`/api/order/${orderId}/`, { status: newStatus }, () => {
            showToast(`Pedido #${orderId} atualizado com sucesso para "${statusMapper[newStatus].name}"!`, "success");
            fetchOrders();
            
            // If the modal is currently open and displaying this order, update it
            const modalEl = document.getElementById('orderDetailModal');
            if (modalEl.classList.contains('show')) {
                // Reload order details in the modal
                setTimeout(() => {
                    openOrderDetails(orderId, false);
                }, 300);
            }
        });
    } catch (error) {
        console.error("Erro ao atualizar pedido:", error);
    }
}

// Open modal with detailed view of order
function openOrderDetails(orderId, showModal = true) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    // Fill modal general fields
    document.getElementById('modal-order-id').textContent = `#${order.id}`;
    
    const statusMap = statusMapper[order.status] || { name: order.status, badge: 'bg-secondary' };
    const badgeEl = document.getElementById('modal-order-status-badge');
    badgeEl.textContent = statusMap.name;
    badgeEl.className = `badge fs-6 py-2 px-3 ${statusMap.badge}`;

    // Fill Customer fields
    const cust = order.customer_details || {};
    document.getElementById('modal-customer-name').textContent = cust.name || '(Nome não foi informado)';
    document.getElementById('modal-customer-email').textContent = cust.email || '(E-mail não foi informado)';
    
    const phoneBtn = document.getElementById('modal-customer-phone-link');
    if (cust.phone) {
        const cleanPhone = cust.phone.replace(/\D/g, '');
        phoneBtn.href = `https://wa.me/55${cleanPhone}?text=Olá,%20${encodeURIComponent(cust.name || '')}!%20Gostaria%20de%20falar%20sobre%20o%20seu%20pedido%20%23${order.id}.`;
        phoneBtn.classList.remove('disabled');
    } else {
        phoneBtn.href = "#";
        phoneBtn.classList.add('disabled');
    }

    // Fill Address fields
    const addr = order.address_details || {};
    const streetInfo = `${addr.street || ''}, ${addr.number || ''}`;
    const complementInfo = addr.complement ? ` - ${addr.complement}` : '';
    const neighborhoodInfo = addr.neighborhood ? `, ${addr.neighborhood}` : '';
    const cityStateInfo = `${addr.city || ''}/${addr.state || ''}`;
    const cepInfo = addr.zip_code ? ` - CEP: ${addr.zip_code}` : '';

    const fullAddress = `${streetInfo}${complementInfo}${neighborhoodInfo} - ${cityStateInfo}${cepInfo}`;
    document.getElementById('modal-address-text').textContent = fullAddress;

    const mapsBtn = document.getElementById('modal-address-maps-link');
    if (addr.street && addr.city) {
        mapsBtn.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
        mapsBtn.classList.remove('disabled');
    } else {
        mapsBtn.href = "#";
        mapsBtn.classList.add('disabled');
    }

    // Fill Items Table
    const tbody = document.getElementById('modal-order-items-body');
    tbody.innerHTML = '';

    let subtotalValue = 0;

    if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
            const itemPrice = parseFloat(item.price || 0);
            const itemQty = parseInt(item.quantity || 1);
            const itemSubtotal = itemPrice * itemQty;
            subtotalValue += itemSubtotal;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="fw-semibold">${item.product_name || 'Produto Desconhecido'}</div>
                </td>
                <td class="text-muted small">${item.notes || ''}</td>
                <td class="text-center">${itemQty}</td>
                <td class="text-end">R$ ${itemPrice.toFixed(2).replace('.', ',')}</td>
                <td class="text-end fw-semibold">R$ ${itemSubtotal.toFixed(2).replace('.', ',')}</td>
            `;
            tbody.appendChild(tr);
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Sem itens</td></tr>';
    }

    // Calculate delivery and total
    const totalValue = parseFloat(order.total || 0);
    // If total is larger than subtotal, delivery fee is the difference, otherwise 0
    const deliveryValue = totalValue > subtotalValue ? (totalValue - subtotalValue) : 0;

    document.getElementById('modal-order-subtotal').textContent = `R$ ${subtotalValue.toFixed(2).replace('.', ',')}`;
    document.getElementById('modal-order-delivery').textContent = `R$ ${deliveryValue.toFixed(2).replace('.', ',')}`;
    document.getElementById('modal-order-total').textContent = `R$ ${totalValue.toFixed(2).replace('.', ',')}`;

    // Fill Timeline history
    const timelineEl = document.getElementById('modal-order-timeline');
    timelineEl.innerHTML = '';

    // Creation entry moved after status history

    // Process history entries (sorted from oldest to newest)
    const history = order.status_history || [];
    const sortedHistory = [...history].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    sortedHistory.forEach(hist => {
        const oldState = statusMapper[hist.old_status] ? statusMapper[hist.old_status].name : hist.old_status;
        const newState = statusMapper[hist.new_status] ? statusMapper[hist.new_status].name : hist.new_status;
        const timeStr = maskDateHour(hist.created_at);

        timelineEl.innerHTML += `
            <div class="timeline-item active">
                <div class="small fw-semibold">Status alterado para "${newState}"</div>
                <div class="text-muted small">${timeStr}</div>
            </div>
        `;
    });

    // Standard entry for order creation (added after status history)
    const creationTime = maskDateHour(order.created_at);
    timelineEl.innerHTML += `
        <div class="timeline-item active">
            <div class="small fw-semibold">Pedido criado</div>
            <div class="text-muted small">${creationTime}</div>
        </div>
    `;
    // Populate Modal Footer Action Buttons
    const actionContainer = document.getElementById('modal-action-buttons');
    actionContainer.innerHTML = '';

    // Add buttons dynamically
    if (order.status === 'pending') {
        actionContainer.innerHTML += `
            <button class="btn btn-danger" onclick="updateOrderStatus(null, ${order.id}, 'cancelled')">
                <i class="bi bi-x-circle me-1"></i> Recusar / Cancelar
            </button>
            <button class="btn btn-success" onclick="updateOrderStatus(null, ${order.id}, 'confirmed')">
                <i class="bi bi-check2-all me-1"></i> Aceitar e Confirmar
            </button>
        `;
    } else if (order.status === 'confirmed') {
        actionContainer.innerHTML += `
            <button class="btn btn-outline-danger" onclick="updateOrderStatus(null, ${order.id}, 'cancelled')">
                Cancelar Pedido
            </button>
            <button class="btn btn-primary" onclick="updateOrderStatus(null, ${order.id}, 'preparing')">
                <i class="bi bi-play-circle-fill me-1"></i> Iniciar Preparo
            </button>
        `;
    } else if (order.status === 'preparing') {
        actionContainer.innerHTML += `
            <button class="btn btn-success" onclick="updateOrderStatus(null, ${order.id}, 'ready')">
                <i class="bi bi-bell-fill me-1"></i> Pronto para Retirada
            </button>
        `;
    } else if (order.status === 'ready') {
        actionContainer.innerHTML += `
            <button class="btn btn-outline-secondary" onclick="updateOrderStatus(null, ${order.id}, 'delivering')">
                <i class="bi bi-truck me-1"></i> Enviar para Entrega
            </button>
            <button class="btn btn-success" onclick="updateOrderStatus(null, ${order.id}, 'delivered')">
                <i class="bi bi-check-circle-fill me-1"></i> Finalizar (Entregue)
            </button>
        `;
    } else if (order.status === 'delivering') {
        actionContainer.innerHTML += `
            <button class="btn btn-success text-white" onclick="updateOrderStatus(null, ${order.id}, 'delivered')">
                <i class="bi bi-check-circle-fill me-1"></i> Confirmar Entrega
            </button>
        `;
    }

    // Print Receipt Event listener
    const printBtn = document.getElementById('btn-print-receipt');
    // Remove existing listener if any
    const newPrintBtn = printBtn.cloneNode(true);
    printBtn.parentNode.replaceChild(newPrintBtn, printBtn);

    newPrintBtn.addEventListener('click', () => {
        printReceipt(order, subtotalValue, deliveryValue, totalValue);
    });

    if (showModal) {
        orderDetailModal.show();
    }
}

// Build receipt design and trigger printing
function printReceipt(order, subtotal, delivery, total) {
    const printArea = document.getElementById('print-receipt-area');
    document.body.appendChild(printArea);
    const customer = order.customer_details || {};
    const address = order.address_details || {};
    const itemsHtml = order.items.map(item => `
        <tr>
            <td>${item.quantity}x ${item.product_name}</td>
            <td class="text-end">R$ ${parseFloat(item.price).toFixed(2).replace('.', ',')}</td>
            <td class="text-end">R$ ${(parseFloat(item.price) * parseInt(item.quantity)).toFixed(2).replace('.', ',')}</td>
        </tr>
    `).join('');

    const formattedDate = maskDateHour(order.created_at);
    const addressStr = `${address.street || ''}, ${address.number || ''} ${address.complement ? '(' + address.complement + ')' : ''} - ${address.neighborhood || ''}, ${address.city || ''}`;

    printArea.innerHTML = `
        <div class="receipt-header">
            <h3 style="margin: 0; font-size: 16px; font-weight: bold;">${order.restaurant_name || 'Restaurante'}</h3>
            <div style="font-size: 11px; margin-top: 5px;">Data: ${formattedDate}</div>
            <div style="font-size: 14px; font-weight: bold; margin-top: 5px;">CUPOM DO PEDIDO #${order.id}</div>
        </div>
        <div class="receipt-body">
            <strong>CLIENTE:</strong> ${customer.name || 'N/A'}<br>
            <strong>CONTATO:</strong> ${customer.phone || 'N/A'}<br>
            <strong>ENDEREÇO:</strong> ${addressStr}<br>
            <div class="receipt-divider"></div>
            <table class="receipt-table">
                <thead>
                    <tr>
                        <th>Produto</th>
                        <th class="text-end">Unit</th>
                        <th class="text-end">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            <div class="receipt-divider"></div>
            <table class="receipt-table" style="font-size: 13px;">
                <tr>
                    <td>Subtotal:</td>
                    <td class="text-end">R$ ${subtotal.toFixed(2).replace('.', ',')}</td>
                </tr>
                <tr>
                    <td>Taxa de Entrega:</td>
                    <td class="text-end">R$ ${delivery.toFixed(2).replace('.', ',')}</td>
                </tr>
                <tr class="receipt-total">
                    <td>TOTAL:</td>
                    <td class="text-end">R$ ${total.toFixed(2).replace('.', ',')}</td>
                </tr>
            </table>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px;">
            Agradecemos a sua preferência!
        </div>
    `;

    window.print();
}
