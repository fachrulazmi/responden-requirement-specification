document.addEventListener('DOMContentLoaded', () => {
    const STORAGE_KEY = 'rrs_studio_data';
    const THEME_KEY = 'rcs_theme';

    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;

    let formQuestions = [];

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

    ['project_owner', 'project_name', 'target_durasi_hari', 'target_total', 'gform_test', 'gform_main'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                autoSave();
                updateInvoice();
            });
        }
    });

    function stripHtml(html) {
        if (!html) return '';
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    function extractFormId(url) {
        if (!url) return null;
        const match = url.match(/\/forms\/d(?:\/e)?\/([^\/]+)/);
        return match ? match[1] : null;
    }

    function parseFormResponse(data) {
        if (!data || !Array.isArray(data) || !data[1]) return { info: {}, questions: [] };

        const formDescription = data[1][0] ? stripHtml(data[1][0]) : '';
        const formTitle = data[8] ? stripHtml(data[8]) : '';
        const items = data[1][1];

        if (!Array.isArray(items)) return { info: { title: formTitle, description: formDescription }, questions: [] };

        const questions = [];
        let questionNumber = 0;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!Array.isArray(item)) continue;

            const id = item[0];
            const rawTitle = item[1];
            const description = item[2];
            const type = item[3];
            const fields = item[4];

            const title = stripHtml(rawTitle);

            if (type === 8) {
                questions.push({
                    id: id,
                    type: 'section',
                    title: title,
                    description: description ? stripHtml(description) : ''
                });
            } else if (type === 2) {
                questionNumber++;
                const options = [];
                if (fields && fields[0] && fields[0][1]) {
                    fields[0][1].forEach(opt => {
                        if (opt && opt[0]) {
                            options.push(stripHtml(opt[0]));
                        }
                    });
                }
                questions.push({
                    id: id,
                    number: questionNumber,
                    type: 'multiple_choice',
                    title: title,
                    description: description ? stripHtml(description) : '',
                    options: options
                });
            } else if (type === 0) {
                questionNumber++;
                questions.push({
                    id: id,
                    number: questionNumber,
                    type: 'text',
                    title: title,
                    description: description ? stripHtml(description) : ''
                });
            } else {
                questionNumber++;
                questions.push({
                    id: id,
                    number: questionNumber,
                    type: 'other',
                    title: title,
                    description: description ? stripHtml(description) : ''
                });
            }
        }

        return { info: { title: formTitle, description: formDescription }, questions: questions };
    }

    function renderFormQuestions(formData) {
        const container = document.getElementById('form-questions-container');
        const section = document.getElementById('form-questions-section');

        const questions = (formData && formData.questions) ? formData.questions : [];
        const info = (formData && formData.info) ? formData.info : {};

        if (questions.length === 0 && !info.title && !info.description) {
            section.classList.add('hidden');
            container.innerHTML = '';
            return;
        }

        section.classList.remove('hidden');
        container.innerHTML = '';

        if (info.title || info.description) {
            const infoDiv = document.createElement('div');
            infoDiv.className = 'p-4 bg-black dark:bg-zinc-100 text-white dark:text-black';
            infoDiv.innerHTML = `
                ${info.title ? `<p class="font-bold text-sm mb-1">${info.title}</p>` : ''}
                ${info.description ? `<p class="text-[10px] opacity-80 whitespace-pre-line">${info.description}</p>` : ''}
            `;
            container.appendChild(infoDiv);
        }

        const typeLabels = {
            'section': 'Bagian',
            'multiple_choice': 'Pilihan Ganda',
            'text': 'Isian Singkat',
            'other': 'Lainnya'
        };

        const typeColors = {
            'section': 'text-black dark:text-white',
            'multiple_choice': 'text-blue-600 dark:text-blue-400',
            'text': 'text-green-600 dark:text-green-400',
            'other': 'text-zinc-500 dark:text-zinc-400'
        };

        questions.forEach(q => {
            const div = document.createElement('div');

            if (q.type === 'section') {
                div.className = 'p-4 bg-zinc-50 dark:bg-zinc-800/50 border-l-4 border-black dark:border-white';
                div.innerHTML = `
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-[9px] font-bold uppercase tracking-widest ${typeColors[q.type]} px-2 py-0.5">${typeLabels[q.type]}</span>
                    </div>
                    <p class="font-bold text-xs text-black dark:text-white">${q.title}</p>
                    ${q.description ? `<p class="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">${q.description}</p>` : ''}
                `;
            } else {
                div.className = 'p-4 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 hover:border-black dark:hover:border-zinc-600 transition-all';
                
                let optionsHtml = '';
                if (q.type === 'multiple_choice' && q.options.length > 0) {
                    optionsHtml = `
                        <div class="flex flex-wrap gap-1.5 mt-3">
                            ${q.options.map(opt => `
                                <span class="text-[10px] px-2 py-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">${opt}</span>
                            `).join('')}
                        </div>
                    `;
                }

                const category = q.category || '';
                const catChecked = (val) => category === val ? 'checked' : '';

                div.innerHTML = `
                    <div class="flex items-start justify-between gap-3 mb-2">
                        <div class="flex items-center gap-2">
                            <span class="text-[9px] font-mono font-bold text-zinc-300 dark:text-zinc-600">${q.number}.</span>
                            <span class="text-[9px] font-bold uppercase tracking-widest ${typeColors[q.type]} px-2 py-0.5">${typeLabels[q.type]}</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <label class="flex items-center gap-1 cursor-pointer text-[9px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 hover:text-black dark:hover:text-white transition-colors">
                                <input type="radio" name="cat_${q.id}" value="demografi" ${catChecked('demografi')} class="category-radio w-3 h-3 accent-black dark:accent-white">
                                Demografi
                            </label>
                            <label class="flex items-center gap-1 cursor-pointer text-[9px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 hover:text-black dark:hover:text-white transition-colors">
                                <input type="radio" name="cat_${q.id}" value="variabel_x" ${catChecked('variabel_x')} class="category-radio w-3 h-3 accent-black dark:accent-white">
                                Variabel X
                            </label>
                            <label class="flex items-center gap-1 cursor-pointer text-[9px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 hover:text-black dark:hover:text-white transition-colors">
                                <input type="radio" name="cat_${q.id}" value="variabel_y" ${catChecked('variabel_y')} class="category-radio w-3 h-3 accent-black dark:accent-white">
                                Variabel Y
                            </label>
                        </div>
                    </div>
                    <p class="text-[11px] font-medium text-black dark:text-white">${q.title}</p>
                    ${q.description ? `<p class="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">${q.description}</p>` : ''}
                    ${optionsHtml}
                `;

                div.querySelectorAll('.category-radio').forEach(radio => {
                    radio.addEventListener('change', (e) => {
                        q.category = e.target.value;
                        autoSave();
                    });
                });
            }

            container.appendChild(div);
        });
    }

    async function fetchFormQuestions() {
        const fetchBtn = document.getElementById('fetch-btn');
        const gformTestInput = document.getElementById('gform_test');
        const url = gformTestInput.value.trim();

        if (!url) {
            alert('Silakan isi Link Google Form (Tes) terlebih dahulu.');
            return;
        }

        const formId = extractFormId(url);
        if (!formId) {
            alert('Format link Google Form tidak valid. Pastikan link mengandung /forms/d/e/ atau /forms/d/.');
            return;
        }

        const originalContent = fetchBtn.innerHTML;
        fetchBtn.disabled = true;
        fetchBtn.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> Fetching...';
        lucide.createIcons();

        try {
            const response = await fetch(`https://google-form-proxy.afaa0304.workers.dev/?formId=${formId}`);
            const data = await response.json();

            if (data.error) {
                alert(`Gagal mengambil data: ${data.error}`);
                return;
            }

            formQuestions = parseFormResponse(data);
            renderFormQuestions(formQuestions);
            syncGroupingInputs();
            autoSave();

            if (!formQuestions.questions || formQuestions.questions.length === 0) {
                alert('Tidak ada pertanyaan yang ditemukan pada form ini.');
            }
        } catch (err) {
            console.error('Fetch error:', err);
            alert('Terjadi kesalahan saat menghubungi server. Periksa koneksi internet Anda.');
        } finally {
            fetchBtn.disabled = false;
            fetchBtn.innerHTML = originalContent;
            lucide.createIcons();
        }
    }

    document.getElementById('fetch-btn').addEventListener('click', fetchFormQuestions);

    function parseRangeInput(str) {
        if (!str || !str.trim()) return [];
        const numbers = [];
        str.split(',').forEach(part => {
            part = part.trim();
            if (!part) return;
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(n => parseInt(n.trim()));
                if (!isNaN(start) && !isNaN(end)) {
                    for (let i = start; i <= end; i++) {
                        numbers.push(i);
                    }
                }
            } else {
                const num = parseInt(part);
                if (!isNaN(num)) {
                    numbers.push(num);
                }
            }
        });
        return numbers;
    }

    function formatRangeOutput(numbers) {
        if (!numbers || numbers.length === 0) return '';
        const sorted = [...numbers].sort((a, b) => a - b);
        const parts = [];
        let start = sorted[0];
        let end = sorted[0];

        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i] === end + 1) {
                end = sorted[i];
            } else {
                parts.push(start === end ? `${start}` : `${start}-${end}`);
                start = sorted[i];
                end = sorted[i];
            }
        }
        parts.push(start === end ? `${start}` : `${start}-${end}`);
        return parts.join(', ');
    }

    function syncGroupingInputs() {
        if (!formQuestions || !formQuestions.questions) return;

        const groups = { demografi: [], variabel_x: [], variabel_y: [] };
        formQuestions.questions.forEach(q => {
            if (q.category && q.number && groups[q.category] !== undefined) {
                groups[q.category].push(q.number);
            }
        });

        const demografiInput = document.getElementById('group-demografi');
        const variabelXInput = document.getElementById('group-variabel_x');
        const variabelYInput = document.getElementById('group-variabel_y');

        if (demografiInput) demografiInput.value = formatRangeOutput(groups.demografi);
        if (variabelXInput) variabelXInput.value = formatRangeOutput(groups.variabel_x);
        if (variabelYInput) variabelYInput.value = formatRangeOutput(groups.variabel_y);
    }

    function applyGrouping() {
        const demografiNums = parseRangeInput(document.getElementById('group-demografi').value);
        const variabelXNums = parseRangeInput(document.getElementById('group-variabel_x').value);
        const variabelYNums = parseRangeInput(document.getElementById('group-variabel_y').value);

        if (!formQuestions || !formQuestions.questions) return;

        formQuestions.questions.forEach(q => {
            if (!q.number) return;
            if (demografiNums.includes(q.number)) {
                q.category = 'demografi';
            } else if (variabelXNums.includes(q.number)) {
                q.category = 'variabel_x';
            } else if (variabelYNums.includes(q.number)) {
                q.category = 'variabel_y';
            } else {
                delete q.category;
            }
        });

        renderFormQuestions(formQuestions);
        autoSave();
    }

    document.getElementById('apply-grouping-btn').addEventListener('click', applyGrouping);

    function buildQuestionGroups() {
        const groups = {};
        if (!formQuestions || !formQuestions.questions) return groups;

        formQuestions.questions.forEach(q => {
            if (q.category && q.number) {
                if (!groups[q.category]) {
                    groups[q.category] = [];
                }
                groups[q.category].push(q.number);
            }
        });

        return groups;
    }

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
            form_questions: formQuestions,
            question_groups: buildQuestionGroups()
        };

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

        formQuestions = data.form_questions || { info: {}, questions: [] };
        renderFormQuestions(formQuestions);
        syncGroupingInputs();
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
            });
    }
});