function showLoader() {
    document.getElementById('global-loader').classList.remove('d-none');
}

function hideLoader() {
    document.getElementById('global-loader').classList.add('d-none');
}


function getCSRFToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]').value
}

function showToast(message, type = 'danger') {
    const container = document.getElementById('toastContainer')

    const toastEl = document.createElement('div')
    toastEl.className = `toast text-bg-${type} border-0`
    toastEl.role = 'alert'

    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white ms-auto"
                    data-bs-dismiss="toast"></button>
        </div>
    `

    container.appendChild(toastEl)

    const toast = new bootstrap.Toast(toastEl, { delay: 4000 })
    toast.show()

    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove())
}


function maskCPF(value) {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskCNPJ(value) {
    return value
        .replace(/\D/g, '')
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
}

function maskCelphone(value) {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d{4})$/, '$1-$2');
}

function maskData(dataISO) {
    if (!dataISO) return '';

    const partes = dataISO.split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function maskCEP(value) {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{5})(\d{3})$/, '$1-$2');
}

function maskDateHour(isoString) {
    if (!isoString) return null;

    const date = new Date(isoString);

    const pad = (n) => String(n).padStart(2, '0');

    const dia = pad(date.getDate());
    const mes = pad(date.getMonth() + 1);
    const ano = date.getFullYear();

    const hora = pad(date.getHours());
    const min = pad(date.getMinutes());

    return `${dia}/${mes}/${ano} - ${hora}:${min}`;
}

function floatFormat(input) {
    let value = input.value.replace(/\D/g, "");
    if (value.length >= 2) {
        const decimalPart = value.slice(-2);
        const integerPart = value.slice(0, -2);

        input.value = `${integerPart}.${decimalPart}`;
    } else {
        input.value = value;
    }
}

document.querySelectorAll('.numbers-only').forEach(input => {
    input.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, "");
    });
});

document.querySelectorAll('.currency').forEach(input => {
    input.addEventListener('input', function () {
        floatFormat(this);
    });
});

document.querySelectorAll(".cpf-mask").forEach(input => {
    input.addEventListener("input", function () {
        this.value = maskCPF(this.value);
    });
});

document.querySelectorAll(".cep-mask").forEach(input => {
    input.addEventListener("input", function () {
        this.value = maskCEP(this.value);
    });
});

document.querySelectorAll(".celphone-mask").forEach(input => {
    input.addEventListener("input", function () {
        this.value = maskCelphone(this.value);
    });
});

document.querySelectorAll(".nome-mask").forEach(input => {
    input.addEventListener("input", function () {
        this.value = this.value.replace(/[^A-Za-z\s]/g, '');
        this.value = this.value.toUpperCase();
    });
});

document.querySelectorAll(".cnpj-mask").forEach(input => {
    input.addEventListener("input", function () {
        this.value = maskCNPJ(this.value);
    });
});


document.querySelectorAll(".capitalize-mask").forEach(input => {
    input.addEventListener("input", function () {
        this.value = this.value
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .toUpperCase();
    });
});