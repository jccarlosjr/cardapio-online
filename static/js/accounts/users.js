let userModal;
let deleteModal;
let allGroups = [];


document.addEventListener('DOMContentLoaded', async () => {
    userModal = new bootstrap.Modal(
        document.getElementById('userModal')
    );

    deleteModal = new bootstrap.Modal(
        document.getElementById('deleteModal')
    );

    document.getElementById('add-user-button').addEventListener('click', openAddUserModal);
    document.getElementById('form-new-user').addEventListener('submit', saveUser);
    document.getElementById('form-delete').addEventListener('submit', deleteUser);

    await getGroups();
    getUsers();
});



async function getUsers() {
    return await getData('/api/accounts/', renderUsers);
}


async function getGroups() {
    return await getData('/api/groups/', (groups) => {
        allGroups = groups;
        renderGroupCheckboxes();
    });
}


function renderGroupCheckboxes() {
    const container = document.getElementById('user-groups-container');
    if (!container) return;
    container.innerHTML = '';

    if (!allGroups || !allGroups.length) {
        container.innerHTML = '<span class="text-muted small">Nenhum grupo cadastrado.</span>';
        return;
    }

    allGroups.forEach(group => {
        const displayName = group.name.charAt(0).toUpperCase() + group.name.slice(1);
        container.innerHTML += `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" name="groups" value="${group.id}" id="group-${group.id}">
                <label class="form-check-label text-capitalize" for="group-${group.id}">
                    ${displayName}
                </label>
            </div>
        `;
    });
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

        let groupBadges = '';
        if (user.groups && user.groups.length) {
            user.groups.forEach(groupId => {
                const groupObj = allGroups.find(g => g.id === groupId);
                const groupName = groupObj ? groupObj.name : `Grupo ${groupId}`;
                const displayName = groupName.charAt(0).toUpperCase() + groupName.slice(1);
                groupBadges += `<span class="badge bg-info text-dark me-1 text-capitalize">${displayName}</span>`;
            });
        }

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
            <div class="card-body py-2 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <small class="text-muted"><i class="bi bi-envelope"></i> ${user.email}</small>
                <div class="user-groups-badges">${groupBadges}</div>
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

    const selectedGroups = [];
    form.querySelectorAll('input[name="groups"]:checked').forEach(cb => {
        selectedGroups.push(parseInt(cb.value));
    });

    const data = {
        name: form.querySelector('input[name="name"]').value,
        email: form.querySelector('input[name="email"]').value,
        is_active: isActive ? isActive.checked : true,
        groups: selectedGroups,
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

    // Reset group checkboxes
    form.querySelectorAll('input[name="groups"]').forEach(cb => {
        cb.checked = false;
    });

    document.getElementById('userModalLabel').innerHTML = 'Adicionar Usuário';
    userModal.show();
}


function openEditUserModal(user) {
    const form = document.getElementById('form-new-user');

    document.getElementById('userModalLabel').innerHTML = `Editar Usuário - ${user.name}`;

    form.querySelector('input[name="id"]').value = user.id;
    form.querySelector('input[name="name"]').value = user.name;
    form.querySelector('input[name="email"]').value = user.email;
    form.querySelector('input[name="password"]').value = '';
    form.querySelector('input[name="is_active"]').checked = user.is_active;

    // Reset group checkboxes and check user's groups
    form.querySelectorAll('input[name="groups"]').forEach(cb => {
        cb.checked = false;
    });
    if (user.groups && Array.isArray(user.groups)) {
        user.groups.forEach(groupId => {
            const cb = form.querySelector(`input[name="groups"][value="${groupId}"]`);
            if (cb) {
                cb.checked = true;
            }
        });
    }

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
