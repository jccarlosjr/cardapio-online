let businessHourModal;

document.addEventListener('DOMContentLoaded', () => {
    businessHourModal = new bootstrap.Modal(
        document.getElementById('businessHourModal')
    );

    document.getElementById('form-business-hour').addEventListener('submit', saveBusinessHour);
});

async function saveBusinessHour(event) {
    event.preventDefault();
    const formBusinessHour = document.getElementById('form-business-hour');
    const label = document.getElementById('businessHourModalLabel');
    label.innerHTML = 'Salvando...';
    const data = new FormData(formBusinessHour);

    if(!document.getElementById('is_closed').checked){
        data.set('is_closed', false);
    } else {
        data.set('is_closed', true);
    }
    
    const id = formBusinessHour.querySelector('input[name="id"]').value;

    const url = id ? `/api/business-hours/${id}/` : '/api/business-hours/';
    const method = id ? 'PATCH' : 'POST';

    try {
        await saveData(url, data, () => {
            loadBusinessHours(data.get('restaurant'));
            formBusinessHour.reset();
            showToast(id ? 'Horário atualizado!' : 'Horário salvo!', 'success');
            label.innerHTML = 'Horário de Funcionamento';
        }, method, true);
    } catch {
        label.innerHTML = 'Horário de Funcionamento';
    }
}

async function openBusinessHourModal(restaurant) {
    const restaurantId = restaurant.id;
    const restaurantName = restaurant.name;
    const form = document.getElementById('form-business-hour');

    form.reset();

    form.querySelector('input[name="id"]').value = '';
    form.querySelector('input[name="restaurant"]').value = restaurantId;
    document.getElementById('businessHourModalLabel').innerHTML = `Horários de Funcionamento - ${restaurantName}`;

    await getData(`/api/business-hours/?restaurant_id=${restaurantId}`,
        (data)=>{
            if(data.length){
                const item = data[0];
                form.querySelector('input[name="id"]').value = item.id;
                form.querySelector('select[name="day_of_week"]').value = item.day_of_week;
                form.querySelector('input[name="open_time"]').value = item.open_time;
                form.querySelector('input[name="close_time"]').value = item.close_time;
                form.querySelector('input[name="is_closed"]').checked = item.is_closed;
            }
        }
    );

    await loadBusinessHours(restaurantId);
    businessHourModal.show();
}

const weekdays = {
    0: 'Domingo',
    1: 'Segunda',
    2: 'Terça',
    3: 'Quarta',
    4: 'Quinta',
    5: 'Sexta',
    6: 'Sábado'
};


function renderBusinessHours(hours) {
    const tbody = document.getElementById('business-hours-list');
    tbody.innerHTML = '';

    for(let i = 0; i < 7; i++) {
        const hour = hours.find(h => h.day_of_week == i);

        let open_time = hour?.open_time || '--:--:--';
        let close_time = hour?.close_time || '--:--:--';

        tbody.innerHTML += `
        <tr>
            <td>
                <strong>${weekdays[i]}</strong>
            </td>
            <td>
                ${open_time}
            </td>
            <td>
                ${close_time}
            </td>
            <td>
                ${hour ? (hour.is_closed ? '<i class="bi bi-x text-danger"> fechado</i>' : '<i class="bi bi-check text-success"> aberto</i>') : '-'}
            </td>
            <td>
                ${
                    hour ?
                    `
                    <button class="btn btn-sm btn-outline-success" onclick='editBusinessHour(${JSON.stringify(hour).replace(/'/g, "&#39;")})'>
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick='deleteBusinessHour(${hour.id})'>
                        <i class="bi bi-trash"></i>
                    </button>
                    `
                    :
                    `
                    <button class="btn btn-sm btn-outline-primary" onclick='createBusinessHour(${i})'>
                        <i class="bi bi-plus"></i>
                    </button>
                    `
                }
            </td>
        </tr>
        `;
    }
}

function createBusinessHour(day){
    const form = document.getElementById('form-business-hour');
    form.reset();
    form.id.value = '';
    form.day_of_week.value=day;
    form.open_time.focus();
}

function editBusinessHour(item){
    const form = document.getElementById('form-business-hour');
    form.id.value = item.id;
    form.day_of_week.value = item.day_of_week;
    form.open_time.value = item.open_time;
    form.close_time.value = item.close_time;
    form.is_closed.checked = item.is_closed;
}

async function deleteBusinessHour(id){
    if(!confirm('Excluir horário?')) return;

    const formBusinessHour = document.getElementById('form-business-hour');
    const restaurantId = formBusinessHour.querySelector('input[name="restaurant"]').value;

    await deleteData(`/api/business-hours/${id}/`, () => {
        showToast('Horário removido', 'success');
        loadBusinessHours(restaurantId);
    }
    );
}

async function loadBusinessHours(restaurantId){
    return await getData(
        `/api/business-hours/?restaurant_id=${restaurantId}`,
        renderBusinessHours
    );
}