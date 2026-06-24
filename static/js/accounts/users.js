let userModal;
let deleteModal;


document.addEventListener('DOMContentLoaded', () => {
    userModal = new bootstrap.Modal(
        document.getElementById('userModal')
    );

    deleteModal = new bootstrap.Modal(
        document.getElementById('deleteModal')
    );

    document.getElementById('add-user-button').addEventListener('click', openAddUserModal);
    document.getElementById('form-new-user').addEventListener('submit', saveUser);
    document.getElementById('form-delete').addEventListener('submit', deleteUser);

    loadRoles();
    getUsers();
});


async function loadRoles() {
    await getData('/api/roles/', roles => {
        const select = document.getElementById('user-role');
        select.innerHTML = '<option value="">Selecione...</option>';
        roles.forEach(role => {
            select.innerHTML += `<option value="${role.id}">${role.name}</option>`;
        });
    });
}


async function getUsers() {
    return await getData('/api/accounts/', renderUsers);
}


function renderUsers(users) {
    const userList = document.querySelector('.user_list');
    userList.innerHTML = '';

    if (!users.length) {
        userList.innerHTML = '<p class="text-muted">Nenhum usuário cadastrado.</p>';
        return;
    }

    users.forEach(user => {
        const activeTag = user.is_active
            ? '<span class="badge bg-success">Ativo</span>'
            : '<span class="badge bg-secondary">Inativo</span>';

        userList.innerHTML += `
        <div class="card mb-3">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="card-title bi bi-person text-muted fw-bold mb-0"> ${user.name}</h5>
                <div class="d-flex align-items-center gap-2">
                    ${activeTag}
                    <div class="btn-group">
                        <i class="bi bi-pencil fw-bold btn btn-sm btn-outline-success"
                           style="cursor: pointer;"
                           title="Editar"
                           onclick='openEditUserModal(${JSON.stringify(user).replace(/'/g, "&#39;")})'></i>
                        <i class="bi bi-trash fw-bold btn btn-sm btn-outline-danger"
                           style="cursor: pointer;"
                           title="Excluir"
                           onclick='openDeleteUserModal(${JSON.stringify(user).replace(/'/g, "&#39;")})'></i>
                    </div>
                </div>
            </div>
            <div class="card-body py-2">
                <small class="text-muted"><i class="bi bi-envelope"></i> ${user.email}</small>
                ${user.role_name ? `<span class="ms-3 text-muted"><i class="bi bi-person-badge"></i> ${user.role_name}</span>` : ''}
            </div>
        </div>
        `;
    });
}


async function saveUser(event) {
    event.preventDefault();

    const form = document.getElementById('form-new-user');
    const label = document.getElementById('userModalLabel');
    const btn = document.getElementById('btn-save-user');
    const originalText = btn.innerHTML;

    label.innerHTML = 'Salvando...';
    btn.innerHTML = 'Salvando...';
    btn.disabled = true;

    const id = form.querySelector('input[name="id"]').value;

    const isActive = form.querySelector('input[name="is_active"]');

    const data = {
        name: form.querySelector('input[name="name"]').value,
        email: form.querySelector('input[name="email"]').value,
        role: form.querySelector('select[name="role"]').value || null,
        is_active: isActive ? isActive.checked : true,
    };

    const password = form.querySelector('input[name="password"]').value;
    if (password) {
        data.password = password;
    }

    const url = id ? `/api/accounts/${id}/` : '/api/accounts/';
    const method = id ? 'PATCH' : 'POST';

    try {
        await saveData(url, data, () => {
            getUsers();
            showToast(id ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!', 'success');
            label.innerHTML = 'Adicionar Usuário';
            userModal.hide();
            form.reset();
        }, method);
    } catch (e) {
        label.innerHTML = id ? 'Editar Usuário' : 'Adicionar Usuário';
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}


async function deleteUser(event) {
    event.preventDefault();

    const formDelete = document.getElementById('form-delete');
    const label = document.getElementById('deleteModalLabel');
    label.innerHTML = 'Excluindo...';

    const id = formDelete.querySelector('input[name="id"]').value;

    try {
        await deleteData(`/api/accounts/${id}/`, () => {
            getUsers();
            showToast('Usuário removido com sucesso!', 'success');
            label.innerHTML = 'Excluir Usuário';
            deleteModal.hide();
            formDelete.reset();
        });
    } catch (e) {
        label.innerHTML = 'Excluir Usuário';
    }
}


function openAddUserModal() {
    const form = document.getElementById('form-new-user');
    form.reset();
    document.getElementById('user-id').value = '';
    document.getElementById('user-is-active').checked = true;
    document.getElementById('userModalLabel').innerHTML = 'Adicionar Usuário';
    userModal.show();
}


function openEditUserModal(user) {
    const form = document.getElementById('form-new-user');

    document.getElementById('userModalLabel').innerHTML = `Editar Usuário - ${user.name}`;

    form.querySelector('input[name="id"]').value = user.id;
    form.querySelector('input[name="name"]').value = user.name;
    form.querySelector('input[name="email"]').value = user.email;
    form.querySelector('select[name="role"]').value = user.role != null ? String(user.role) : '';
    form.querySelector('input[name="password"]').value = '';
    form.querySelector('input[name="is_active"]').checked = user.is_active;

    userModal.show();
}


function openDeleteUserModal(user) {
    const deleteModalLabel = document.getElementById('deleteModalLabel');
    deleteModalLabel.innerHTML = `Excluir Usuário - ${user.name}`;

    document.getElementById('delete-name').innerHTML = user.name;
    document.getElementById('delete-id').value = user.id;
    document.getElementById('delete-message').innerHTML = '';

    deleteModal.show();
}
