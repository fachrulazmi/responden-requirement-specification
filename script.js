document.addEventListener('DOMContentLoaded', () => {
    const socioContainer = document.getElementById('sociodemographics-container');
    const xContainer = document.getElementById('x-questions-container');
    const yContainer = document.getElementById('y-questions-container');
    const likertOptionsInput = document.getElementById('likert_options');
    
    const socioCategoryTemplate = document.getElementById('socio-category-template');
    const socioOptionTemplate = document.getElementById('socio-option-template');
    const likertQuestionTemplate = document.getElementById('likert-question-template');

    const STORAGE_KEY = 'rrs_studio_data';
    const THEME_KEY = 'rcs_theme';

    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;

    function applyTheme(theme) {
        if (theme === 'dark') {
            html.classList.add('dark');
        } else {
            html.classList.remove('dark');
        }
        localStorage.setItem(THEME_KEY, theme);
    }

    const savedTheme = localStorage.getItem(THEME_KEY) || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);

    themeToggle.addEventListener('click', () => {
        const isDark = html.classList.contains('dark');
        applyTheme(isDark ? 'light' : 'dark');
    });

    let likertOptions = ["Sangat Tidak Setuju", "Tidak Setuju", "Setuju", "Sangat Setuju"];
    likertOptionsInput.value = likertOptions.join(', ');

    function updateInvoice() {
        const durasi = parseInt(document.getElementById('target_durasi_hari').value) || 0;
        const responden = parseInt(document.getElementById('target_total').value) || 0;
        const invoiceSection = document.getElementById('invoice-section');

        if (durasi > 0 || responden > 0) {
            invoiceSection.classList.remove('hidden');
        } else {
            invoiceSection.classList.add('hidden');
        }

        const durasiRate = 25000;
        let respondenRate = 350;

        if (durasi === 1) {
            if (responden <= 50) {
                respondenRate = 500;
            } else if (responden === 75) {
                respondenRate = 400;
            } else if (responden >= 100) {
                respondenRate = 350;
            }
        }

        const durasiCost = durasi * durasiRate;
        const respondenCost = responden * respondenRate;
        const total = durasiCost + respondenCost;

        const formatter = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        });

        document.getElementById('durasi-label').textContent = `${durasi} Hari x Rp. 25.000`;
        document.getElementById('durasi-cost').textContent = formatter.format(durasiCost).replace('Rp', 'Rp.');
        
        document.getElementById('responden-label').textContent = `${responden} Responden x Rp. ${respondenRate.toLocaleString('id-ID')}`;
        document.getElementById('responden-cost').textContent = formatter.format(respondenCost).replace('Rp', 'Rp.');
        
        document.getElementById('total-cost').textContent = formatter.format(total).replace('Rp', 'Rp.');
    }

    function saveToLocalStorage() {
        const data = getFormData();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function loadFromLocalStorage() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                populateForm(data);
                return true;
            } catch (e) {
                console.error('Error loading from local storage', e);
            }
        }
        return false;
    }

    let saveTimeout;
    function autoSave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveToLocalStorage, 1000);
    }

    ['project_owner', 'project_name', 'target_durasi_hari', 'target_total', 'likert_options', 'gform_test', 'gform_main'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                autoSave();
                updateInvoice();
            });
        }
    });

    function createSocioCategory(name = '', data = {}) {
        const clone = socioCategoryTemplate.content.cloneNode(true);
        const categoryDiv = clone.querySelector('div');
        const nameInput = clone.querySelector('.category-name');
        const optionsContainer = clone.querySelector('.options-container');
        
        nameInput.value = name;
        nameInput.addEventListener('input', autoSave);
        
        categoryDiv.querySelector('.remove-category').addEventListener('click', () => {
            categoryDiv.remove();
            autoSave();
        });

        categoryDiv.querySelector('.add-option').addEventListener('click', () => {
            createSocioOption(optionsContainer);
            autoSave();
        });

        Object.entries(data).forEach(([label, value]) => {
            createSocioOption(optionsContainer, label, value);
        });

        if (Object.keys(data).length === 0) {
            createSocioOption(optionsContainer);
        }

        socioContainer.appendChild(clone);
        lucide.createIcons();
    }

    function createSocioOption(container, label = '', value = '') {
        const clone = socioOptionTemplate.content.cloneNode(true);
        const optionDiv = clone.querySelector('div');
        const labelInput = clone.querySelector('.option-label');
        const valueInput = clone.querySelector('.option-value');
        
        labelInput.value = label;
        valueInput.value = value;

        labelInput.addEventListener('input', autoSave);
        valueInput.addEventListener('input', autoSave);

        clone.querySelector('.remove-option').addEventListener('click', () => {
            optionDiv.remove();
            autoSave();
        });

        container.appendChild(clone);
        lucide.createIcons();
    }

    document.getElementById('add-socio-category').addEventListener('click', () => {
        createSocioCategory();
        autoSave();
    });

    function updateLikertOptions() {
        const val = likertOptionsInput.value.trim();
        if (val) {
            likertOptions = val.split(',').map(s => s.trim()).filter(s => s !== '');
            document.querySelectorAll('.likert-question').forEach(q => {
                const container = q.querySelector('.distribution-inputs');
                const existingValues = Array.from(container.querySelectorAll('input')).map(i => i.value);
                
                container.innerHTML = '';
                container.className = `distribution-inputs grid grid-cols-${Math.min(likertOptions.length, 6)} gap-2`;
                
                likertOptions.forEach((option, index) => {
                    const input = document.createElement('input');
                    input.type = 'number';
                    input.className = 'text-center py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-[11px] font-medium text-black dark:text-zinc-100 transition-all focus:border-black dark:focus:border-zinc-500 focus:bg-white dark:focus:bg-zinc-700 outline-none';
                    input.placeholder = `${option} (%)`;
                    input.title = option;
                    input.value = existingValues[index] || '';
                    input.addEventListener('input', autoSave);
                    container.appendChild(input);
                });
            });
            autoSave();
        }
    }

    likertOptionsInput.addEventListener('change', updateLikertOptions);

    function createLikertQuestion(container, id = '', distribution = [], questionText = '') {
        const clone = likertQuestionTemplate.content.cloneNode(true);
        const questionDiv = clone.querySelector('div');
        const idInput = clone.querySelector('.question-id');
        const textInput = clone.querySelector('.question-text');
        const inputsContainer = clone.querySelector('.distribution-inputs');
        
        idInput.value = id;
        textInput.value = questionText;

        idInput.addEventListener('input', autoSave);
        textInput.addEventListener('input', autoSave);
        
        inputsContainer.className = `distribution-inputs grid grid-cols-${Math.min(likertOptions.length, 6)} gap-2`;

        likertOptions.forEach((option, index) => {
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'text-center py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-[11px] font-medium text-black dark:text-zinc-100 transition-all focus:border-black dark:focus:border-zinc-500 focus:bg-white dark:focus:bg-zinc-700 outline-none';
            input.placeholder = `${option} (%)`;
            input.title = option;
            input.value = distribution[index] || '';
            input.addEventListener('input', autoSave);
            inputsContainer.appendChild(input);
        });

        clone.querySelector('.remove-question').addEventListener('click', () => {
            questionDiv.remove();
            autoSave();
        });

        container.appendChild(clone);
        lucide.createIcons();
    }

    document.getElementById('add-x-question').addEventListener('click', () => {
        const nextId = `X${xContainer.children.length + 1}`;
        createLikertQuestion(xContainer, nextId);
        autoSave();
    });

    document.getElementById('add-y-question').addEventListener('click', () => {
        const nextId = `Y${yContainer.children.length + 1}`;
        createLikertQuestion(yContainer, nextId);
        autoSave();
    });

    function getFormData() {
        const durasi = parseInt(document.getElementById('target_durasi_hari').value) || 0;
        const responden = parseInt(document.getElementById('target_total').value) || 0;
        
        const durasiRate = 25000;
        let respondenRate = 350;

        if (durasi === 1) {
            if (responden <= 50) {
                respondenRate = 500;
            } else if (responden === 75) {
                respondenRate = 400;
            } else if (responden >= 100) {
                respondenRate = 350;
            }
        }

        const durasiCost = durasi * durasiRate;
        const respondenCost = responden * respondenRate;
        const totalCost = durasiCost + respondenCost;

        const data = {
            project_owner: document.getElementById('project_owner').value,
            project_name: document.getElementById('project_name').value,
            target_durasi_hari: durasi,
            target_total: responden,
            gform_test: document.getElementById('gform_test').value,
            gform_main: document.getElementById('gform_main').value,
            cost_estimation: {
                duration_cost: durasiCost,
                respondent_cost: respondenCost,
                total_cost: totalCost
            },
            sociodemographics: {},
            likert_distributions: {
                options: likertOptions,
                X: {},
                Y: {}
            }
        };

        document.querySelectorAll('#sociodemographics-container > div').forEach(cat => {
            const nameInput = cat.querySelector('.category-name');
            if (nameInput) {
                const name = nameInput.value;
                if (name) {
                    data.sociodemographics[name] = {};
                    cat.querySelectorAll('.options-container > div').forEach(opt => {
                        const labelInput = opt.querySelector('.option-label');
                        const valueInput = opt.querySelector('.option-value');
                        if (labelInput && valueInput) {
                            const label = labelInput.value;
                            const val = parseInt(valueInput.value) || 0;
                            if (label) {
                                data.sociodemographics[name][label] = val;
                            }
                        }
                    });
                }
            }
        });

        xContainer.querySelectorAll('.likert-question').forEach(q => {
            const id = q.querySelector('.question-id').value;
            const text = q.querySelector('.question-text').value;
            if (id) {
                const dist = Array.from(q.querySelectorAll('.distribution-inputs input')).map(i => parseInt(i.value) || 0);
                data.likert_distributions.X[id] = { soal: text, data: dist };
            }
        });

        yContainer.querySelectorAll('.likert-question').forEach(q => {
            const id = q.querySelector('.question-id').value;
            const text = q.querySelector('.question-text').value;
            if (id) {
                const dist = Array.from(q.querySelectorAll('.distribution-inputs input')).map(i => parseInt(i.value) || 0);
                data.likert_distributions.Y[id] = { soal: text, data: dist };
            }
        });

        return data;
    }

    document.getElementById('export-btn').addEventListener('click', () => {
        const data = getFormData();
        
        // Validation for required fields
        const requiredFields = [
            { id: 'project_owner', label: 'Nama Lengkap' },
            { id: 'project_name', label: 'Nama Survey' },
            { id: 'target_durasi_hari', label: 'Durasi' },
            { id: 'gform_test', label: 'Link Google Form (Tes)' },
            { id: 'gform_main', label: 'Link Google Form (Utama)' }
        ];

        const missingFields = requiredFields
            .filter(field => !document.getElementById(field.id).value.trim())
            .map(field => field.label);

        if (missingFields.length > 0) {
            alert(`Ekspor Gagal! Silakan lengkapi bidang berikut:\n- ${missingFields.join('\n- ')}`);
            return;
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        const hhmmss = pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
        const ddmmyyyy = pad(now.getDate()) + pad(now.getMonth() + 1) + now.getFullYear();
        const filename = `rcs_${hhmmss}_${ddmmyyyy}.json`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        localStorage.removeItem(STORAGE_KEY);
    });

    const fileInput = document.getElementById('file-input');
    document.getElementById('import-btn').addEventListener('click', () => fileInput.click());

    document.getElementById('reset-btn').addEventListener('click', () => {
        if (confirm('Apakah Anda yakin ingin menghapus semua data dan mereset workspace? Tindakan ini tidak dapat dibatalkan.')) {
            localStorage.removeItem(STORAGE_KEY);
            window.location.reload();
        }
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                populateForm(data);
                saveToLocalStorage();
            } catch (err) {
                alert('Kesalahan saat membaca file JSON');
            }
        };
        reader.readAsText(file);
    });

    function populateForm(data) {
        document.getElementById('project_owner').value = data.project_owner || '';
        document.getElementById('project_name').value = data.project_name || '';
        document.getElementById('target_durasi_hari').value = data.target_durasi_hari || '';
        document.getElementById('target_total').value = data.target_total || '';
        document.getElementById('gform_test').value = data.gform_test || '';
        document.getElementById('gform_main').value = data.gform_main || '';

        updateInvoice();

        if (data.likert_distributions && data.likert_distributions.options) {
            likertOptions = data.likert_distributions.options;
            likertOptionsInput.value = likertOptions.join(', ');
        }

        socioContainer.innerHTML = '';
        if (data.sociodemographics) {
            Object.entries(data.sociodemographics).forEach(([name, options]) => {
                createSocioCategory(name, options);
            });
        }

        xContainer.innerHTML = '';
        if (data.likert_distributions && data.likert_distributions.X) {
            Object.entries(data.likert_distributions.X).forEach(([id, content]) => {
                if (Array.isArray(content)) {
                    createLikertQuestion(xContainer, id, content);
                } else {
                    createLikertQuestion(xContainer, id, content.data, content.soal);
                }
            });
        }

        yContainer.innerHTML = '';
        if (data.likert_distributions && data.likert_distributions.Y) {
            Object.entries(data.likert_distributions.Y).forEach(([id, content]) => {
                if (Array.isArray(content)) {
                    createLikertQuestion(yContainer, id, content);
                } else {
                    createLikertQuestion(yContainer, id, content.data, content.soal);
                }
            });
        }
    }

    if (!loadFromLocalStorage()) {
        fetch('rrs.json')
            .then(response => response.json())
            .then(data => {
                populateForm(data);
                saveToLocalStorage();
            })
            .catch(err => {
                console.log('File rrs.json tidak ditemukan, memulai dari awal');
                createSocioCategory('Jenis Kelamin', { 'Laki-Laki': '', 'Perempuan': '' });
                createLikertQuestion(xContainer, 'X1');
                createLikertQuestion(yContainer, 'Y1');
            });
    }
});
