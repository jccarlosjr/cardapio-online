let restaurantModal;
let deleteModal;

document.addEventListener('DOMContentLoaded', () => {
    restaurantModal = new bootstrap.Modal(
        document.getElementById('restaurantModal')
    );

    deleteModal = new bootstrap.Modal(
        document.getElementById('deleteModal')
    );

    getRestaurants();

    document.getElementById('form-new-restaurant').addEventListener('submit', saveRestaurant);
    document.getElementById('form-delete').addEventListener('submit', deleteRestaurant);

    document.getElementById('restaurantModal').addEventListener('hidden.bs.modal', function () {
        const form = document.getElementById('form-new-restaurant');
        form.reset();
        form.querySelector('input[name="id"]').value = '';
        form.querySelector('input[name="is_active"]').checked = true;
        document.getElementById('restaurantModalLabel').innerHTML = "Adicionar Restaurante";
    });
});

async function saveRestaurant(event) {
    event.preventDefault();

    const form = document.getElementById('form-new-restaurant');
    const label = document.getElementById('restaurantModalLabel');
    label.innerHTML = "Adicionando...";

    const data = new FormData(form);
    const id = form.querySelector('input[name="id"]').value;

    const isActive = form.querySelector('input[name="is_active"]');
    if (isActive) {
        data.set('is_active', isActive.checked ? 'true' : 'false');
    }

    const url = id ? `/api/restaurants/${id}/` : '/api/restaurants/';
    const method = id ? 'PATCH' : 'POST';

    try {
        await saveData(url, data, () => {
            getRestaurants();
            showToast(id ? "Restaurante atualizado com sucesso!" : "Restaurante adicionado com sucesso!", "success");
            label.innerHTML = "Adicionar Restaurante";
            restaurantModal.hide();
            form.reset();
        }, method, true);
    } catch (e) {
        label.innerHTML = "Adicionar Restaurante";
    }
}

async function deleteRestaurant(event) {
    event.preventDefault();

    const formDelete = document.getElementById('form-delete');
    const label = document.getElementById('deleteModalLabel');
    label.innerHTML = "Excluindo...";

    const id = formDelete.querySelector('input[name="id"]').value;

    try {
        await deleteData(`/api/restaurants/${id}/`, () => {
            getRestaurants();
            showToast("Restaurante removido com sucesso!", "success");
            label.innerHTML = "Excluir Restaurante";
            deleteModal.hide();
            formDelete.reset();
        });
    } catch (e) {
        label.innerHTML = "Excluir Restaurante";
    }
}

document.getElementById("zip_code").addEventListener("blur", function () {
    const cep = this.value.replace("-", "");
    if (cep.length === 8) {
        fetch(`https://viacep.com.br/ws/${cep}/json/`)
            .then(response => response.json())
            .then(data => {
                if (data.erro) {
                    showToast("CEP não encontrado!", "danger");
                    return;
                } else {
                    document.getElementById("address").value = data.logradouro.toUpperCase();
                    document.getElementById("neighborhood").value = data.bairro.toUpperCase();
                    document.getElementById("city").value = data.localidade.toUpperCase();
                    document.getElementById("state").value = data.uf.toUpperCase();
                }
            })
            .catch(error => console.error("Erro ao buscar CEP:", error));
    }
});

async function getRestaurants() {
    return await getData('/api/restaurants/', renderRestaurants);
}

function renderRestaurants(restaurants) {
    const restaurantList = document.querySelector('.restaurant_list');
    restaurantList.innerHTML = '';

    restaurants.forEach(restaurant => {
        restaurantList.innerHTML += `
        <div class="card mb-3">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="card-title bi bi-buildings text-muted fw-bold"> ${restaurant.name}</h5>
                <div class="d-flex justify-content-between align-items-center btn-group">
                    <i class="bi bi-pencil fw-bold btn btn-sm btn-outline-success" 
                       style="cursor: pointer;" 
                       title="Editar"
                       onclick='openEditRestaurantModal(${JSON.stringify(restaurant).replace(/'/g, "&#39;")})'></i>
                    <i class="bi bi-calendar fw-bold btn btn-sm btn-outline-info" 
                       style="cursor: pointer;" 
                       title="Horários de Funcionamento"
                       onclick='openBusinessHourModal(${JSON.stringify(restaurant).replace(/'/g, "&#39;")})'></i>
                    <i class="bi bi-gear fw-bold btn btn-sm btn-outline-primary" 
                       style="cursor: pointer;" 
                       title="Configurar"
                       onclick='openSettingsRestaurantModal(${JSON.stringify(restaurant).replace(/'/g, "&#39;")})'></i>
                    <i class="bi bi-trash fw-bold btn btn-sm btn-outline-danger" 
                       style="cursor: pointer;" 
                       title="Excluir"
                       onclick='openDeleteRestaurantModal(${JSON.stringify(restaurant).replace(/'/g, "&#39;")})'></i>
                </div>
            </div>
            <div class="card-body">
                <p class="card-text bi bi-telephone text-muted fw-semibold"> ${restaurant.phone}</p>
                <small class="card-text bi bi-geo-alt text-muted fw-semibold"> ${restaurant.zip_code} - ${restaurant.address} - ${restaurant.number} - ${restaurant.neighborhood} - ${restaurant.city} - ${restaurant.state}</small>
            </div>
        </div>
        `;
    });
}

function openEditRestaurantModal(restaurant) {
    const form = document.getElementById('form-new-restaurant');

    const label = document.getElementById('restaurantModalLabel');
    label.innerHTML = "Editar Restaurante - " + restaurant.name;

    form.querySelector('input[name="id"]').value = restaurant.id;
    form.querySelector('input[name="name"]').value = restaurant.name;
    form.querySelector('input[name="phone"]').value = restaurant.phone;
    form.querySelector('input[name="zip_code"]').value = restaurant.zip_code;
    form.querySelector('input[name="address"]').value = restaurant.address;
    form.querySelector('input[name="number"]').value = restaurant.number;
    form.querySelector('input[name="neighborhood"]').value = restaurant.neighborhood;
    form.querySelector('input[name="city"]').value = restaurant.city;
    form.querySelector('select[name="state"]').value = restaurant.state;
    form.querySelector('input[name="is_active"]').checked = restaurant.is_active;

    restaurantModal.show();
}

function openDeleteRestaurantModal(restaurant) {
    const deleteModalLabel = document.getElementById('deleteModalLabel');
    deleteModalLabel.innerHTML = `Excluir Restaurante - ${restaurant.name}`;

    const nameElement = document.getElementById('delete-name');
    nameElement.innerHTML = restaurant.name;

    const id = document.getElementById('delete-id');
    id.value = restaurant.id;

    const deleteMessage = document.getElementById('delete-message');
    deleteMessage.innerHTML = 'Deletar esse restaurante também vai deletar todas as categorias e produtos deste restaurante';

    deleteModal.show();
}
