let categoryModal;
let deleteModal;


document.addEventListener('DOMContentLoaded', () => {
    categoryModal = new bootstrap.Modal(
        document.getElementById('categoryModal')
    );

    deleteModal = new bootstrap.Modal(
        document.getElementById('deleteModal')
    );

    document.getElementById('add-category-button').addEventListener('click', openCategoryModal);

    getCategories();

    document.getElementById('form-new-category').addEventListener('submit', saveCategory);
    document.getElementById('form-delete').addEventListener('submit', deleteCategory);
});

async function saveCategory(event) {
    event.preventDefault();

    const form = document.getElementById('form-new-category');
    const label = document.getElementById('categoryModalLabel');
    label.innerHTML = "Adicionando...";

    const data = new FormData(form);
    const id = form.querySelector('input[name="id"]').value;

    const url = id ? `/api/categories/${id}/` : '/api/categories/';
    const method = id ? 'PATCH' : 'POST';

    try {
        await saveData(url, data, () => {
            getCategories();
            showToast(id ? "Categoria atualizada com sucesso!" : "Categoria adicionada com sucesso!", "success");
            label.innerHTML = "Adicionar Categoria";
            categoryModal.hide();
            form.reset();
        }, method, true);
    } catch (e) {
        label.innerHTML = "Adicionar Categoria";
    }
}

async function deleteCategory(event) {
    event.preventDefault();

    const formDelete = document.getElementById('form-delete');
    const label = document.getElementById('deleteModalLabel');
    label.innerHTML = "Excluindo...";

    const id = formDelete.querySelector('input[name="id"]').value;

    try {
        await deleteData(`/api/categories/${id}/`, () => {
            getCategories();
            showToast("Categoria removida com sucesso!", "success");
            label.innerHTML = "Excluir Categoria";
            deleteModal.hide();
            formDelete.reset();
        });
    } catch (e) {
        label.innerHTML = "Excluir Categoria";
    }
}


async function getCategories() {
    return await getData('/api/categories/', renderCategories);
}


function renderCategories(categories) {
    const categoryList = document.querySelector('.category_list');
    categoryList.innerHTML = '';

    categories.forEach(category => {
        categoryList.innerHTML += `
        <div class="card mb-3">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="card-title bi bi-list text-muted fw-bold">${category.order} - ${category.name}</h5>
                <div class="d-flex justify-content-between align-items-center btn-group">
                    <i class="bi bi-gear fw-bold btn btn-sm btn-outline-info" 
                       style="cursor: pointer;" 
                       title="Configurar"
                       data-category-id="${category.id}" 
                       data-category-name="${category.name}" 
                       onclick="openProductModal.call(this)"></i>
                    <i class="bi bi-pencil fw-bold btn btn-sm btn-outline-success" 
                       style="cursor: pointer;" 
                       title="Editar"
                       onclick='openEditCategoryModal(${JSON.stringify(category).replace(/'/g, "&#39;")})'></i>
                    <i class="bi bi-trash fw-bold btn btn-sm btn-outline-danger" 
                       style="cursor: pointer;" 
                       title="Excluir"
                       onclick='openDeleteCategoryModal(${JSON.stringify(category).replace(/'/g, "&#39;")})'></i>
                </div>
            </div>
        </div>
        `;
    });
}

function openCategoryModal() {
    const form = document.getElementById('form-new-category');
    form.reset();

    document.querySelector('input[name="id"]').value = '';
    document.querySelector('input[name="name"]').value = '';
    document.querySelector('input[name="order"]').value = '';

    document.getElementById('categoryModalLabel').innerHTML = "Adicionar Categoria";
    categoryModal.show();
}

function openEditCategoryModal(category) {
    const form = document.getElementById('form-new-category');

    const label = document.getElementById('categoryModalLabel');
    label.innerHTML = "Editar Categoria - " + category.name;

    form.querySelector('input[name="id"]').value = category.id;
    form.querySelector('input[name="name"]').value = category.name;
    form.querySelector('input[name="order"]').value = category.order;

    categoryModal.show();
}

function openDeleteCategoryModal(category) {
    const deleteModalLabel = document.getElementById('deleteModalLabel');
    deleteModalLabel.innerHTML = `Excluir Categoria - ${category.name}`;

    const nameElement = document.getElementById('delete-name');
    nameElement.innerHTML = category.name;

    const id = document.getElementById('delete-id');
    id.value = category.id;

    const deleteMessage = document.getElementById('delete-message');
    deleteMessage.innerHTML = 'Deletar essa categoria também vai deletar todos os produtos desta categoria';

    deleteModal.show();
}
