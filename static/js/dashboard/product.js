let productModal;
let optionGroupModal;
let optionModal;
let currentProducts = [];
let productCategories = [];

document.addEventListener('DOMContentLoaded',()=>{

    productModal = new bootstrap.Modal(
        document.getElementById('productModal')
    );
    optionGroupModal = new bootstrap.Modal(
        document.getElementById('productOptionGroupModal')
    );
    optionModal = new bootstrap.Modal(
        document.getElementById('productOptionModal')
    );

    document.getElementById('btn-novo-produto').addEventListener('click', newProduct);
    document.getElementById('btn-salvar-produto').addEventListener('click', saveProduct);
    document.getElementById('btn-novo-grupo').addEventListener('click', newOptionGroup);
    document.getElementById('btn-salvar-grupo').addEventListener('click', saveOptionGroup);
    document.getElementById('btn-salvar-opcao').addEventListener('click', saveOption);

    loadCategories();

})

async function loadCategories() {
    await getData('/api/categories/', categories => {
        productCategories = categories;
        const select = document.getElementById('product-category');
        select.innerHTML = '<option value="">Selecione uma categoria...</option>';
        categories.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    });
}


async function openProductModal(){

    const categoryName = this.getAttribute('data-category-name');
    const categoryId = this.getAttribute('data-category-id');

    const productModalLabel = document.getElementById('productModalLabel');
    productModalLabel.innerHTML = `Produtos Para Essa Categoria - ${categoryName}`;

    const id = document.getElementById('product-category-id');
    id.value = categoryId;

    newProduct();

    await getProductsByCategoryId(categoryId);

    productModal.show();

}

async function getProductsByCategoryId(category_id, selectedProductId = null){
    return await getData(
        `/api/products/?category_id=${category_id}`,
        products=>{
            currentProducts = products;
            renderProducts(products, selectedProductId);

            if(products.length){
                let productToSelect = products[0];
                if (selectedProductId) {
                    const found = products.find(p => p.id === parseInt(selectedProductId) || p.id === selectedProductId);
                    if (found) productToSelect = found;
                }
                renderProductDetail(productToSelect);
            }
        }
    );
}


function renderProducts(products, selectedProductId = null){

    const productList = document.getElementById('product-list');
    productList.innerHTML='';

    let toSelectIndex = 0;
    if (selectedProductId) {
        const foundIdx = products.findIndex(p => p.id === parseInt(selectedProductId) || p.id === selectedProductId);
        if (foundIdx !== -1) toSelectIndex = foundIdx;
    }

    products.forEach((product, index)=>{
        const item = document.createElement('a');
        item.className = `
            list-group-item
            list-group-item-action
            sidebar-product
        `;
        if (index === toSelectIndex && products.length > 0) {
            item.classList.add('active');
        }
        item.innerHTML = product.name;

        item.addEventListener('click', async () => {
            document.querySelectorAll('.sidebar-product')
                .forEach(x=>x.classList.remove('active'));
            item.classList.add('active');
            await getData(`/api/products/${product.id}/`, renderProductDetail);
        });

        productList.appendChild(item);

    });

}

function newProduct() {
    document.getElementById('current-product-id').value = '';
    document.getElementById('product-name').value = '';
    document.getElementById('product-description').value = '';
    document.getElementById('product-price').value = '';
    document.getElementById('product-image').value = '';
    
    const catId = document.getElementById('product-category-id').value;
    if (catId) {
        document.getElementById('product-category').value = catId;
    } else {
        document.getElementById('product-category').value = '';
    }

    document.getElementById('product-options').innerHTML = '';
    document.getElementById('options-section').style.display = 'none';
    
    document.querySelectorAll('.sidebar-product').forEach(x => x.classList.remove('active'));
}

async function saveProduct() {
    const id = document.getElementById('current-product-id').value;
    const name = document.getElementById('product-name').value;
    const category = document.getElementById('product-category').value;
    const description = document.getElementById('product-description').value;
    const price = document.getElementById('product-price').value;
    const imageInput = document.getElementById('product-image');

    if (!name || !category || !price) { 
        showToast('Nome, Categoria e Preço são obrigatórios.', 'warning');
        return;
    }

    let formData = new FormData();
    formData.append('name', name);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('price', price);

    if (imageInput.files.length > 0) {
        formData.append('image', imageInput.files[0]);
    }

    const url = id ? `/api/products/${id}/` : '/api/products/';
    const method = id ? 'PATCH' : 'POST';

    const btn = document.getElementById('btn-salvar-produto');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Salvando...';
    btn.disabled = true;

    try {
        await saveData(url, formData, async (savedProduct) => {
            document.getElementById('current-product-id').value = savedProduct.id;
            document.getElementById('options-section').style.display = 'block';
            
            const catId = document.getElementById('product-category-id').value;
            
            if (catId) {
                if (category !== catId) {
                    await getProductsByCategoryId(catId);
                    newProduct();
                    showToast("Produto salvo e movido para a nova categoria!", "success");
                } else {
                    await getProductsByCategoryId(catId, savedProduct.id);
                    showToast(id ? "Produto atualizado com sucesso!" : "Produto criado com sucesso!", "success");
                }
            }
        }, method, true);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function renderProductDetail(product){

    document.getElementById('current-product-id').value = 
        product.id || '';

    document.getElementById('product-name').value =
        product.name || '';

    document.getElementById('product-category').value =
        product.category || '';

    document.getElementById('product-description').value =
        product.description || '';

    document.getElementById('product-price').value =
        product.price || '';

    document.getElementById('product-image').value = '';

    document.getElementById('options-section').style.display = 'block';
    renderOptionGroups(product.option_groups || []);

}


function renderOptionGroups(groups) {
    const container = document.getElementById('product-options');

    // Mantenha o estado do acordeão aberto
    let openGroupId = null;
    const openCollapse = container.querySelector('.accordion-collapse.show');
    if (openCollapse) {
        openGroupId = openCollapse.id;
    }

    container.innerHTML = '';

    groups.forEach((group, index) => {
        let options = '';

        group.options.forEach(option => {
            options += `
                <div class="row mb-2 align-items-center">
                    <div class="col">
                        ${option.name}
                    </div>
                    <div class="col-auto">
                        R$ ${option.additional_price}
                    </div>
                    <div class="col-auto">
                        <button class="btn btn-sm btn-outline-secondary" onclick='editOption(${JSON.stringify(option).replace(/'/g, "&#39;")})'><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick='deleteOption(${option.id})'><i class="bi bi-trash"></i></button>
                    </div>
                </div>
            `;
        });

        const collapseId = `group${group.id}`;
        const isOpen = openGroupId === collapseId;

        container.innerHTML += `
        <div class="accordion-item mb-2 border">
            <h2 class="accordion-header d-flex">
                <button class="accordion-button ${isOpen ? '' : 'collapsed'}" data-bs-toggle="collapse" data-bs-target="#${collapseId}">
                    <strong>${group.name}</strong>
                    <small class="ms-2 text-muted">min ${group.min_select} max ${group.max_select}</small>
                </button>
                <div class="d-flex align-items-center pe-3 border-start">
                    <button class="btn btn-sm btn-secondary me-1" onclick='editOptionGroup(${JSON.stringify(group).replace(/'/g, "&#39;")})'><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-danger" onclick='deleteOptionGroup(${group.id})'><i class="bi bi-trash"></i></button>
                </div>
            </h2>
            <div id="${collapseId}" class="accordion-collapse collapse ${isOpen ? 'show' : ''}">
                <div class="accordion-body">
                    ${options}
                    <button class="btn btn-sm btn-success mt-2" onclick="newOption(${group.id})">+ Nova Opção</button>
                </div>
            </div>
        </div>
        `;
    });
}

async function reloadCurrentProductOptions() {
    const id = document.getElementById('current-product-id').value;
    if(!id) return;
    await getData(`/api/products/${id}/`, product => {
        renderOptionGroups(product.option_groups || []);
        const idx = currentProducts.findIndex(p => p.id === product.id);
        if (idx !== -1) currentProducts[idx] = product;
    });
}

function newOptionGroup() {
    document.getElementById('current-group-id').value = '';
    document.getElementById('group-name').value = '';
    document.getElementById('group-min-select').value = 0;
    document.getElementById('group-max-select').value = 1;
    optionGroupModal.show();
}

function editOptionGroup(group) {
    document.getElementById('current-group-id').value = group.id;
    document.getElementById('group-name').value = group.name;
    document.getElementById('group-min-select').value = group.min_select;
    document.getElementById('group-max-select').value = group.max_select;
    optionGroupModal.show();
}

async function saveOptionGroup() {
    const productId = document.getElementById('current-product-id').value;
    const id = document.getElementById('current-group-id').value;
    const name = document.getElementById('group-name').value;
    const min_select = document.getElementById('group-min-select').value;
    const max_select = document.getElementById('group-max-select').value;

    if(!name) { showToast('Nome é obrigatório', 'warning'); return; }

    const data = {
        product: productId,
        name,
        min_select,
        max_select
    };

    const url = id ? `/api/product-option-groups/${id}/` : '/api/product-option-groups/';
    const method = id ? 'PATCH' : 'POST';

    const btn = document.getElementById('btn-salvar-grupo');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Salvando...';
    btn.disabled = true;

    try {
        await saveData(url, data, async () => {
            optionGroupModal.hide();
            await reloadCurrentProductOptions();
            showToast(id ? "Grupo atualizado com sucesso!" : "Grupo criado com sucesso!", "success");
        }, method);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function deleteOptionGroup(id) {
    if(!confirm("Tem certeza que deseja excluir este grupo?")) return;
    await deleteData(`/api/product-option-groups/${id}/`, async () => {
        await reloadCurrentProductOptions();
    });
}

function newOption(groupId) {
    document.getElementById('current-option-id').value = '';
    document.getElementById('current-option-group-id').value = groupId;
    document.getElementById('option-name').value = '';
    document.getElementById('option-price').value = '0.00';
    optionModal.show();
}

function editOption(option) {
    document.getElementById('current-option-id').value = option.id;
    document.getElementById('current-option-group-id').value = option.group;
    document.getElementById('option-name').value = option.name;
    document.getElementById('option-price').value = option.additional_price;
    optionModal.show();
}

async function saveOption() {
    const id = document.getElementById('current-option-id').value;
    const group = document.getElementById('current-option-group-id').value;
    const name = document.getElementById('option-name').value;
    let additional_price = document.getElementById('option-price').value;
    
    if(!name) { showToast('Nome é obrigatório', 'warning'); return; }

    if(additional_price.includes(',')) {
        additional_price = additional_price.replace(',', '.');
    }

    const data = {
        group,
        name,
        additional_price: parseFloat(additional_price) || 0
    };

    const url = id ? `/api/product-options/${id}/` : '/api/product-options/';
    const method = id ? 'PATCH' : 'POST';

    const btn = document.getElementById('btn-salvar-opcao');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Salvando...';
    btn.disabled = true;

    try {
        await saveData(url, data, async () => {
            optionModal.hide();
            await reloadCurrentProductOptions();
            showToast(id ? "Opção atualizada com sucesso!" : "Opção criada com sucesso!", "success");
        }, method);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function deleteOption(id) {
    if(!confirm("Tem certeza que deseja excluir esta opção?")) return;
    await deleteData(`/api/product-options/${id}/`, async () => {
        await reloadCurrentProductOptions();
    });
}
