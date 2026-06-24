let currentProduct = null;
let currentCart = null;
let productDetailModal;
let cartDrawer;
let checkoutModal;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize modals and offcanvas
    productDetailModal = new bootstrap.Modal(document.getElementById('productDetailModal'));
    cartDrawer = new bootstrap.Offcanvas(document.getElementById('cartDrawer'));
    checkoutModal = new bootstrap.Modal(document.getElementById('checkoutModal'));

    // Bind floating cart button
    document.getElementById('btn-floating-cart').addEventListener('click', () => {
        cartDrawer.show();
    });

    // Bind quantity increment/decrement in details modal
    document.getElementById('btn-modal-qty-minus').addEventListener('click', () => updateModalQty(-1));
    document.getElementById('btn-modal-qty-plus').addEventListener('click', () => updateModalQty(1));

    // Bind Add to Cart button in details modal
    document.getElementById('btn-modal-add-to-cart').addEventListener('click', addItemToCart);

    // Bind Checkout button in Cart Drawer
    document.getElementById('btn-cart-checkout').addEventListener('click', () => {
        if (!currentCart || currentCart.items.length === 0) {
            showToast("Seu carrinho está vazio!", "danger");
            return;
        }

        const grandTotal = calculateCartTotal();
        if (grandTotal < MIN_ORDER_VALUE) {
            showToast(`O valor mínimo para pedido é R$ ${MIN_ORDER_VALUE.toFixed(2).replace('.', ',')}`, "warning");
            return;
        }

        cartDrawer.hide();
        checkoutModal.show();
    });

    // Address section toggle based on delivery method
    document.getElementsByName('delivery_method').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const addressSection = document.getElementById('checkout-address-section');
            const deliveryInputs = addressSection.querySelectorAll('input');
            
            if (e.target.value === 'pickup') {
                addressSection.classList.add('d-none');
                deliveryInputs.forEach(input => input.removeAttribute('required'));
            } else {
                addressSection.classList.remove('d-none');
                // Make Cep, Street, Number, Neighborhood, City required for delivery
                document.getElementById('chk-cep').setAttribute('required', 'true');
                document.getElementById('chk-street').setAttribute('required', 'true');
                document.getElementById('chk-number').setAttribute('required', 'true');
                document.getElementById('chk-neighborhood').setAttribute('required', 'true');
                document.getElementById('chk-city').setAttribute('required', 'true');
                document.getElementById('chk-state').setAttribute('required', 'true');
            }
            updateCartSummaryUI();
        });
    });

    // Money change inputs toggle
    document.getElementById('chk-payment').addEventListener('change', (e) => {
        const changeSection = document.getElementById('money-change-section');
        const changeInput = document.getElementById('chk-change');
        
        if (e.target.value === 'money') {
            changeSection.classList.remove('d-none');
            changeInput.setAttribute('required', 'true');
        } else {
            changeSection.classList.add('d-none');
            changeInput.removeAttribute('required');
            changeInput.value = '';
        }
    });

    // Fetch CEP details on blur
    const cepInput = document.getElementById('chk-cep');
    if (cepInput) {
        cepInput.addEventListener('blur', function() {
            const cep = this.value.replace(/\D/g, '');
            if (cep.length === 8) {
                fetch(`https://viacep.com.br/ws/${cep}/json/`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.erro) {
                            showToast("CEP não encontrado!", "danger");
                            return;
                        }
                        document.getElementById('chk-street').value = data.logradouro.toUpperCase();
                        document.getElementById('chk-neighborhood').value = data.bairro.toUpperCase();
                        document.getElementById('chk-city').value = data.localidade.toUpperCase();
                        document.getElementById('chk-state').value = data.uf.toUpperCase();
                    })
                    .catch(err => console.error("Erro ao buscar CEP:", err));
            }
        });
    }

    // Bind checkout form submit
    document.getElementById('form-checkout').addEventListener('submit', submitOrder);

    // Initial cart load
    loadCart();

    // Setup Category Navigation highlight on scroll
    setupScrollSpy();
});


// Session key helper
function getCartSessionKey() {
    let key = localStorage.getItem('cart_session_key');
    if (!key) {
        key = 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        localStorage.setItem('cart_session_key', key);
    }
    return key;
}

// Load Cart details from server
async function loadCart() {
    const sessionKey = getCartSessionKey();
    try {
        const carts = await getData(`/api/cart/?session_key=${sessionKey}`);
        if (carts && carts.length > 0) {
            currentCart = carts[0];
        } else {
            // Create a new cart on backend
            currentCart = await saveData('/api/cart/', { session_key: sessionKey });
        }
        updateCartSummaryUI();
    } catch (error) {
        console.error("Erro ao carregar o carrinho:", error);
    }
}

// Add Item
async function addItemToCart() {
    if (!currentProduct || !currentCart) return;

    // Validate options selections (min/max checks)
    const selections = getSelectedOptions();
    if (!validateSelections(selections)) {
        return;
    }

    // Calculate options sum
    let optionsSum = 0;
    selections.forEach(opt => {
        optionsSum += opt.price;
    });
    const unitPrice = parseFloat(currentProduct.price) + optionsSum;
    const optionIds = selections.map(opt => opt.optionId);

    // Format options as note additions
    const optionsText = formatSelectedOptionsText(selections);
    const notesInput = document.getElementById('modal-item-notes').value.trim();
    
    let finalNotes = optionsText;
    if (notesInput) {
        finalNotes = finalNotes ? `${finalNotes} | Obs: ${notesInput}` : `Obs: ${notesInput}`;
    }

    const qty = parseInt(document.getElementById('modal-item-qty').textContent);
    
    // Check if product is already in the cart with the EXACT SAME notes
    const existingItem = currentCart.items.find(item => item.product === currentProduct.id && item.notes === finalNotes);

    if (existingItem) {
        // Update quantity
        const newQty = existingItem.quantity + qty;
        await patchData(`/api/cart-item/${existingItem.id}/?session_key=${getCartSessionKey()}`, { quantity: newQty }, () => {
            showToast("Quantidade do item atualizada no carrinho!", "success");
            productDetailModal.hide();
            loadCart();
        });
    } else {
        // Create new item
        const payload = {
            cart: currentCart.id,
            product: currentProduct.id,
            quantity: qty,
            price: unitPrice.toFixed(2),
            notes: finalNotes,
            option_ids: optionIds
        };
        await saveData(`/api/cart-item/?session_key=${getCartSessionKey()}`, payload, () => {
            showToast("Item adicionado ao carrinho com sucesso!", "success");
            productDetailModal.hide();
            loadCart();
        });
    }
}

// Edit item quantity from drawer
async function updateCartItemQty(itemId, change) {
    const item = currentCart.items.find(i => i.id === itemId);
    if (!item) return;

    const newQty = item.quantity + change;
    if (newQty <= 0) {
        // Delete item
        await deleteData(`/api/cart-item/${itemId}/?session_key=${getCartSessionKey()}`, () => {
            loadCart();
        });
    } else {
        // Update qty
        await patchData(`/api/cart-item/${itemId}/?session_key=${getCartSessionKey()}`, { quantity: newQty }, () => {
            loadCart();
        });
    }
}

// Calculate grand total in frontend
function calculateCartTotal() {
    if (!currentCart || !currentCart.items) return 0;
    let subtotal = 0;
    currentCart.items.forEach(item => {
        subtotal += parseFloat(item.price || 0) * item.quantity;
    });
    return subtotal;
}

// Update Cart Floating button and Drawer UI
function updateCartSummaryUI() {
    const floatingBtn = document.getElementById('btn-floating-cart');
    const floatingCount = document.getElementById('cart-floating-count');
    const floatingTotal = document.getElementById('cart-floating-total');

    const drawerList = document.getElementById('cart-drawer-items-list');
    const drawerSubtotal = document.getElementById('cart-drawer-subtotal');
    const drawerDelivery = document.getElementById('cart-drawer-delivery');
    const drawerTotal = document.getElementById('cart-drawer-total');

    if (!currentCart || !currentCart.items || currentCart.items.length === 0) {
        floatingBtn.classList.add('d-none');
        drawerList.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="bi bi-cart-x fs-1 mb-2"></i>
                <p>Seu carrinho está vazio</p>
            </div>
        `;
        drawerSubtotal.textContent = "R$ 0,00";
        drawerDelivery.textContent = "R$ 0,00";
        drawerTotal.textContent = "R$ 0,00";
        return;
    }

    // Populate drawer list items
    drawerList.innerHTML = '';
    let subtotalValue = 0;
    let totalItemsCount = 0;

    currentCart.items.forEach(item => {
        const dataEl = document.getElementById(`prod-data-${item.product}`);
        if (!dataEl) return;
        
        const prod = JSON.parse(dataEl.textContent);
        const itemPrice = parseFloat(item.price || prod.price);
        const itemSubtotal = itemPrice * item.quantity;
        subtotalValue += itemSubtotal;
        totalItemsCount += item.quantity;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'd-flex justify-content-between align-items-start border-bottom py-3';
        itemDiv.innerHTML = `
            <div class="flex-grow-1 me-2">
                <h6 class="fw-bold mb-1 text-dark">${prod.name}</h6>
                ${item.notes ? `<p class="text-muted small mb-1" style="font-size: 0.85rem;"><i class="bi bi-info-circle me-1"></i>${item.notes}</p>` : ''}
                <span class="text-primary fw-semibold small">R$ ${itemPrice.toFixed(2).replace('.', ',')}</span>
            </div>
            <div class="d-flex flex-column align-items-end justify-content-between" style="height: 100%;">
                <span class="fw-bold text-dark small mb-2">R$ ${itemSubtotal.toFixed(2).replace('.', ',')}</span>
                <div class="d-flex align-items-center gap-2 border rounded-pill px-2 py-1 bg-white">
                    <button class="btn btn-sm p-0 border-0" onclick="updateCartItemQty(${item.id}, -1)"><i class="bi bi-dash"></i></button>
                    <span class="small fw-bold px-1" style="min-width: 14px; text-align: center;">${item.quantity}</span>
                    <button class="btn btn-sm p-0 border-0" onclick="updateCartItemQty(${item.id}, 1)"><i class="bi bi-plus"></i></button>
                </div>
            </div>
        `;
        drawerList.appendChild(itemDiv);
    });

    // Check delivery fee
    const deliveryMethod = document.querySelector('input[name="delivery_method"]:checked')?.value || 'delivery';
    const deliveryFee = deliveryMethod === 'delivery' ? DELIVERY_FEE : 0;
    const grandTotal = subtotalValue + deliveryFee;

    // Update Floating Button
    floatingBtn.classList.remove('d-none');
    floatingCount.textContent = totalItemsCount;
    floatingTotal.textContent = `R$ ${grandTotal.toFixed(2).replace('.', ',')}`;

    // Update Drawer Pricing Info
    drawerSubtotal.textContent = `R$ ${subtotalValue.toFixed(2).replace('.', ',')}`;
    drawerDelivery.textContent = deliveryFee > 0 ? `R$ ${deliveryFee.toFixed(2).replace('.', ',')}` : 'Grátis';
    drawerTotal.textContent = `R$ ${grandTotal.toFixed(2).replace('.', ',')}`;
}

// Open Product Modal
function openProductDetails(productId) {
    const dataEl = document.getElementById(`prod-data-${productId}`);
    if (!dataEl) return;

    currentProduct = JSON.parse(dataEl.textContent);

    // Modal Image
    const imgContainer = document.getElementById('modal-product-img-container');
    const modalImg = document.getElementById('modal-product-img');
    const headerFallback = document.getElementById('modal-header-fallback');

    if (currentProduct.image_url) {
        modalImg.src = currentProduct.image_url;
        imgContainer.style.display = 'block';
        headerFallback.style.display = 'none';
    } else {
        imgContainer.style.display = 'none';
        headerFallback.style.display = 'flex';
    }

    // Product Title / Desc / Price
    document.getElementById('modal-product-name').textContent = currentProduct.name;
    document.getElementById('modal-product-desc').textContent = currentProduct.description || 'Sem descrição';
    document.getElementById('modal-product-base-price').textContent = `R$ ${parseFloat(currentProduct.price).toFixed(2).replace('.', ',')}`;

    // Render Option Groups
    const optionContainer = document.getElementById('modal-option-groups-container');
    optionContainer.innerHTML = '';

    if (currentProduct.option_groups && currentProduct.option_groups.length > 0) {
        currentProduct.option_groups.forEach(group => {
            const groupBox = document.createElement('div');
            groupBox.className = 'option-group-box';
            groupBox.setAttribute('data-group-id', group.id);
            groupBox.setAttribute('data-min', group.min_select);
            groupBox.setAttribute('data-max', group.max_select);

            let requirementText = '';
            if (group.min_select > 0) {
                requirementText = `<span class="badge bg-warning text-dark float-end">Obrigatório (Mín ${group.min_select})</span>`;
            } else if (group.max_select > 1) {
                requirementText = `<span class="badge bg-light text-secondary float-end">Opcional (Máx ${group.max_select})</span>`;
            } else {
                requirementText = `<span class="badge bg-light text-secondary float-end">Opcional</span>`;
            }

            groupBox.innerHTML = `
                <div class="mb-2 flex-wrap gap-2">
                    <span class="fw-bold text-dark small text-uppercase">${group.name}</span>
                    ${requirementText}
                </div>
                <div class="options-list mt-2"></div>
            `;

            const listDiv = groupBox.querySelector('.options-list');
            const inputType = group.max_select === 1 && group.min_select === 1 ? 'radio' : 'checkbox';

            group.options.forEach(opt => {
                const optSubtotalText = parseFloat(opt.additional_price) > 0 ? `+ R$ ${parseFloat(opt.additional_price).toFixed(2).replace('.', ',')}` : '';
                const optionId = `opt-${group.id}-${opt.id}`;
                const optionDiv = document.createElement('div');
                optionDiv.className = 'option-item';
                
                optionDiv.innerHTML = `
                    <div class="form-check">
                        <input class="form-check-input" type="${inputType}" name="group-${group.id}" id="${optionId}" value="${opt.id}" data-price="${opt.additional_price}" data-name="${opt.name}">
                        <label class="form-check-label text-dark small" for="${optionId}">
                            ${opt.name}
                        </label>
                    </div>
                    <span class="text-muted small fw-semibold">${optSubtotalText}</span>
                `;
                
                // Add event listener to inputs
                optionDiv.querySelector('input').addEventListener('change', handleOptionChange);
                listDiv.appendChild(optionDiv);
            });

            optionContainer.appendChild(groupBox);
        });
    }

    // Reset notes and quantity counter
    document.getElementById('modal-item-notes').value = '';
    document.getElementById('modal-item-qty').textContent = '1';

    // Calculate initial price
    calculateProductPriceInModal();

    productDetailModal.show();
}

// Increment / Decrement Modal Qty
function updateModalQty(change) {
    const qtyEl = document.getElementById('modal-item-qty');
    let currentQty = parseInt(qtyEl.textContent);
    currentQty += change;
    if (currentQty < 1) currentQty = 1;
    qtyEl.textContent = currentQty;
    calculateProductPriceInModal();
}

// Calculate Modal Total Price
function calculateProductPriceInModal() {
    if (!currentProduct) return;

    const basePrice = parseFloat(currentProduct.price);
    let optionsSum = 0;

    // Sum options
    const selected = getSelectedOptions();
    selected.forEach(opt => {
        optionsSum += opt.price;
    });

    const qty = parseInt(document.getElementById('modal-item-qty').textContent);
    const totalItemPrice = (basePrice + optionsSum) * qty;

    document.getElementById('modal-item-total-price').textContent = `R$ ${totalItemPrice.toFixed(2).replace('.', ',')}`;
}

// Helpers for selections
function getSelectedOptions() {
    const selections = [];
    const optionContainer = document.getElementById('modal-option-groups-container');
    
    optionContainer.querySelectorAll('.option-group-box').forEach(groupBox => {
        const groupId = parseInt(groupBox.getAttribute('data-group-id'));
        const inputs = groupBox.querySelectorAll('input:checked');
        
        inputs.forEach(input => {
            selections.push({
                groupId: groupId,
                optionId: parseInt(input.value),
                name: input.getAttribute('data-name'),
                price: parseFloat(input.getAttribute('data-price') || 0)
            });
        });
    });
    return selections;
}

// Selection requirements validation
function validateSelections(selections) {
    let isValid = true;
    const optionContainer = document.getElementById('modal-option-groups-container');

    optionContainer.querySelectorAll('.option-group-box').forEach(groupBox => {
        if (!isValid) return; // Break early if already invalid
        
        const groupName = groupBox.querySelector('.fw-bold').textContent;
        const min = parseInt(groupBox.getAttribute('data-min'));
        const max = parseInt(groupBox.getAttribute('data-max'));
        const groupId = parseInt(groupBox.getAttribute('data-group-id'));
        
        const count = selections.filter(sel => sel.groupId === groupId).length;

        if (count < min) {
            showToast(`Por favor, selecione no mínimo ${min} opções para "${groupName}".`, "warning");
            isValid = false;
        } else if (count > max) {
            showToast(`Por favor, selecione no máximo ${max} opções para "${groupName}".`, "warning");
            isValid = false;
        }
    });

    return isValid;
}

// Format options as notes text
function formatSelectedOptionsText(selections) {
    if (selections.length === 0) return '';
    
    // Group selections by group name for clean rendering
    const groupNames = {};
    document.querySelectorAll('.option-group-box').forEach(box => {
        const id = parseInt(box.getAttribute('data-group-id'));
        const name = box.querySelector('.fw-bold').textContent;
        groupNames[id] = name;
    });

    const lines = [];
    const grouped = {};
    
    selections.forEach(sel => {
        if (!grouped[sel.groupId]) {
            grouped[sel.groupId] = [];
        }
        grouped[sel.groupId].push(sel.name);
    });

    for (const groupId in grouped) {
        const gName = groupNames[groupId];
        const optsText = grouped[groupId].join(', ');
        lines.push(`${gName}: ${optsText}`);
    }

    return lines.join(' | ');
}

// Submit Checkout Order
async function submitOrder(event) {
    event.preventDefault();

    if (!currentCart || currentCart.items.length === 0) {
        showToast("Seu carrinho está vazio!", "danger");
        return;
    }

    const submitBtn = document.getElementById('btn-submit-order');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Enviando...';

    // Personal details
    const name = document.getElementById('chk-name').value;
    const phone = document.getElementById('chk-phone').value;
    
    // Delivery method
    const deliveryMethod = document.querySelector('input[name="delivery_method"]:checked').value;
    
    // Address (only if delivery)
    let address = null;
    if (deliveryMethod === 'delivery') {
        address = {
            zip_code: document.getElementById('chk-cep').value,
            street: document.getElementById('chk-street').value,
            number: document.getElementById('chk-number').value,
            complement: document.getElementById('chk-complement').value,
            neighborhood: document.getElementById('chk-neighborhood').value,
            city: document.getElementById('chk-city').value,
            state: document.getElementById('chk-state').value
        };
    }

    // Payment method
    const paymentMethod = document.getElementById('chk-payment').value;
    const changeFor = document.getElementById('chk-change').value;

    // Items mapped
    const items = currentCart.items.map(item => {
        return {
            product_id: item.product,
            quantity: item.quantity,
            notes: item.notes,
            option_ids: item.option_ids || []
        };
    });

    const payload = {
        restaurant_id: RESTAURANT_ID,
        customer: {
            name: name,
            phone: phone,
            email: ""
        },
        delivery_method: deliveryMethod,
        address: address,
        payment_method: paymentMethod,
        change_for: changeFor,
        items: items
    };

    try {
        await saveData('/api/public/checkout/', payload, async (response) => {
            showToast("Pedido gerado com sucesso! Redirecionando para o WhatsApp...", "success");

            // Reset session key so next order uses a fresh cart and session
            localStorage.removeItem('cart_session_key');

            // Hide modal
            checkoutModal.hide();
            document.getElementById('form-checkout').reset();
            
            // Reload cart
            loadCart();

            // Open WhatsApp link
            const cleanPhone = response.restaurant_phone.replace(/\D/g, '');
            const waUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(response.whatsapp_message)}`;
            
            setTimeout(() => {
                window.open(waUrl, '_blank');
            }, 1000);

        });
    } catch (err) {
        console.error("Erro no checkout:", err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-whatsapp me-2"></i>Enviar Pedido via WhatsApp';
    }
}

// Highlight Category links on scroll
function setupScrollSpy() {
    const sections = document.querySelectorAll('.category-section');
    const navLinks = document.querySelectorAll('#category-scroll-nav .category-link');

    window.addEventListener('scroll', () => {
        let currentSectionId = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            if (window.scrollY >= (sectionTop - 150)) {
                currentSectionId = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active');
                
                // Auto scroll the category bar to keep active link centered
                const container = document.getElementById('category-scroll-nav');
                const offsetLeft = link.offsetLeft;
                const width = link.offsetWidth;
                const containerWidth = container.offsetWidth;
                container.scrollLeft = offsetLeft - (containerWidth / 2) + (width / 2);
            } else {
                link.classList.remove('active');
            }
        });
    });

    // Smooth click scrolling for nav links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetEl = document.querySelector(targetId);
            if (targetEl) {
                window.scrollTo({
                    top: targetEl.offsetTop - 120,
                    behavior: 'smooth'
                });
            }
        });
    });
}

function handleOptionChange(event) {
    const input = event.target;
    if (input.type === 'checkbox') {
        const groupBox = input.closest('.option-group-box');
        const max = parseInt(groupBox.getAttribute('data-max'));
        const checkedInputs = groupBox.querySelectorAll('input:checked');

        if (checkedInputs.length > max) {
            input.checked = false; // Prevent checking
            showToast(`Você pode selecionar no máximo ${max} opções para este grupo.`, "warning");
            return;
        }
    }
    calculateProductPriceInModal();
}

