let restaurantSettingsModal


document.addEventListener('DOMContentLoaded', () => {
    restaurantSettingsModal = new bootstrap.Modal(
        document.getElementById('restaurantSettingsModal')
    );

    document.getElementById('form-settings').addEventListener('submit', saveSettings);
});

async function saveSettings(event) {
    event.preventDefault();

    const formSettings = document.getElementById('form-settings');
    const label = document.getElementById('restaurantSettingsModalLabel');
    label.innerHTML = "Adicionando...";

    const data = new FormData(formSettings);
    const id = formSettings.querySelector('input[name="id"]').value;

    const url = id ? `/api/settings/${id}/` : '/api/settings/';
    const method = id ? 'PATCH' : 'POST';

    try {
        await saveData(url, data, () => {
            getRestaurants();
            showToast(id ? "Configuração atualizada com sucesso!" : "Configuração adicionada com sucesso!", "success");
            label.innerHTML = "Configuração";
            restaurantSettingsModal.hide();
            formSettings.reset();
        }, method, true);
    } catch (e) {
        label.innerHTML = "Configuração";
    }
}

async function openSettingsRestaurantModal(restaurant) {
    const formSettings = document.getElementById('form-settings');
    document.getElementById("restaurant").value = restaurant.id;

    await getData(`/api/settings/?restaurant_id=${restaurant.id}`, (data) => {
        const item = data[0];
        if (item) {
            for(let key in item) {
                const input = formSettings.querySelector(`input[name="${key}"]`);
                if (input) input.value = item[key];
            }
        }
    });

    document.getElementById("restaurantSettingsModalLabel").innerHTML = "Configurar - " + restaurant.name;
    restaurantSettingsModal.show();
}
