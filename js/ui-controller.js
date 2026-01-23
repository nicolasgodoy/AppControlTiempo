/**
 * UIController - Maneja la interfaz de usuario y las interacciones
 */
import TimerManager from './timer-manager.js';
import userManager from './user-manager.js';

class UIController {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.timerManager = new TimerManager(dataManager);
        this.currentTimeframe = 'daily';
        this.timerInterval = null;
        // Paleta cálida con gradientes (se adaptan automáticamente al tema)
        this.BackgroundColors = [
            'var(--gradient-1)',   // Trabajo
            'var(--gradient-2)',   // Juegos
            'var(--gradient-3)',   // Estudio
            'var(--gradient-4)',   // Ejercicio
            'var(--gradient-5)',   // Social
            'var(--gradient-6)'    // Salud
        ];
        this.initializeEventListeners();

        this.dataManager.onDataSync(async (nuevosDatos) => {
            // Renderizamos directamente con los datos que nos envía Firebase
            await this.renderCards(nuevosDatos);
        });
    }

    /**
     * Inicializa los event listeners
     */
    /**
     * Inicializa los event listeners
     */
    initializeEventListeners() {
        // Botones de período
        const btnDay = document.querySelector('#Dia');
        const btnWeek = document.querySelector('#Mes'); // IDs match HTML
        const btnMonth = document.querySelector('#Anio');

        if (btnDay) {
            btnDay.addEventListener('click', () => this.switchTimeframe('daily', btnDay));
        }
        if (btnWeek) {
            btnWeek.addEventListener('click', () => this.switchTimeframe('weekly', btnWeek));
        }
        if (btnMonth) {
            btnMonth.addEventListener('click', () => this.switchTimeframe('monthly', btnMonth));
        }

        // Export/Import Buttons
        const btnCopy = document.querySelector('#btnCopy');
        if (btnCopy) {
            btnCopy.addEventListener('click', async () => {
                const success = await this.dataManager.copyToClipboard();
                if (success) {
                    this.showNotification('✓ Copiado. Pega (Ctrl+V) en tu hoja de cálculo');
                } else {
                    alert('No se pudo copiar automáticamente.');
                }
            });
        }

        const btnExportExcel = document.querySelector('#btnExportExcel');
        if (btnExportExcel) {
            btnExportExcel.addEventListener('click', async () => {
                const success = await this.dataManager.exportToExcel();
                if (success) {
                    this.showNotification('✓ Descarga de Excel iniciada');
                }
            });
        }

        // Marcar el botón activo por defecto (ahora search for .filter-btn)
        this.setActiveButton(btnDay);
        // Create Activity Button
        const btnCreateActivity = document.querySelector('#btnCreateActivity');
        if (btnCreateActivity) {
            btnCreateActivity.addEventListener('click', () => this.openCreateActivityModal());
        }

        // Color selection logic for Create Modal
        const colorOptions = document.querySelectorAll('.color-option');
        colorOptions.forEach(opt => {
            opt.addEventListener('click', (e) => {
                colorOptions.forEach(o => o.style.border = '2px solid transparent');
                e.target.style.border = '2px solid white';
                document.getElementById('newActivityColor').value = e.target.dataset.color;
            });
        });

        // Icon selection logic
        const iconOptions = document.querySelectorAll('.icon-option');
        iconOptions.forEach(opt => {
            opt.addEventListener('click', (e) => {
                iconOptions.forEach(o => o.classList.remove('selected'));
                e.currentTarget.classList.add('selected');
                document.getElementById('newActivityIcon').value = e.currentTarget.dataset.icon;
            });
        });

        // User Management Listeners
        const btnEnterUser = document.getElementById('btnEnterUser');
        if (btnEnterUser) {
            btnEnterUser.addEventListener('click', () => this.handlePrivateLogin());
        }

        const btnLogout = document.getElementById('btnLogout');
        if (btnLogout) {
            btnLogout.addEventListener('click', () => this.handleLogout());
        }

        const btnDeleteAccount = document.getElementById('btnDeleteAccount');
        if (btnDeleteAccount) {
            btnDeleteAccount.addEventListener('click', (e) => {
                const currentUser = localStorage.getItem('currentUser');
                if (currentUser) {
                    this.handleDeleteUser(currentUser, e);
                }
            });
        }

        const userInputField = document.getElementById('userInputField');
        if (userInputField) {
            userInputField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handlePrivateLogin();
            });
        }

        const userNameLabel = document.getElementById('userNameLabel');
        if (userNameLabel) {
            userNameLabel.addEventListener('click', () => this.showUserSelectionModal());
        }

        // Hours validation for existing modals
        const hoursInput = document.getElementById('hoursInput');
        if (hoursInput) this.setupNumericInputValidation(hoursInput, 5);

        const editHoursInput = document.getElementById('editHoursInput');
        if (editHoursInput) this.setupNumericInputValidation(editHoursInput, 5);

        // Navigation Tabs
        const tabDashboard = document.getElementById('tabDashboard');
        const tabHistory = document.getElementById('tabHistory');
        if (tabDashboard) tabDashboard.addEventListener('click', () => this.switchView('dashboard'));
        if (tabHistory) tabHistory.addEventListener('click', () => this.switchView('history'));

        // History Filters
        const filterDate = document.getElementById('historyFilterDate');
        const filterActivity = document.getElementById('historyFilterActivity');
        if (filterDate) filterDate.addEventListener('change', () => this.renderHistoryTable());
        if (filterActivity) filterActivity.addEventListener('change', () => this.renderHistoryTable());

        // Pagination
        const btnPrev = document.getElementById('btnPrevPage');
        const btnNext = document.getElementById('btnNextPage');
        if (btnPrev) btnPrev.addEventListener('click', () => this.changePage(-1));
        if (btnNext) btnNext.addEventListener('click', () => this.changePage(1));

        this.historyPage = 1;
        this.historyPageSize = 10;
    }

    /**
     * Configura validación para inputs numéricos
     */
    setupNumericInputValidation(input, maxLength) {
        if (!input) return;

        // Evitar caracteres no deseados en el keydown
        input.addEventListener('keypress', (e) => {
            const char = String.fromCharCode(e.which);
            // Permitir números y un solo punto
            if (!/[0-9.]/.test(char)) {
                e.preventDefault();
                return;
            }
            if (char === '.' && input.value.includes('.')) {
                e.preventDefault();
                return;
            }
        });

        // Limpiar en el input (por si pegan texto) y limitar longitud
        input.addEventListener('input', () => {
            let val = input.value;
            // Eliminar cualquier cosa que no sea número o punto
            val = val.replace(/[^0-9.]/g, '');
            // Asegurar un solo punto
            const parts = val.split('.');
            if (parts.length > 2) {
                val = parts[0] + '.' + parts.slice(1).join('');
            }
            // Limitar longitud
            if (val.length > maxLength) {
                val = val.substring(0, maxLength);
            }
            input.value = val;
        });
    }

    /**
     * Maneja el ingreso privado de usuario
     */
    async handlePrivateLogin() {
        const input = document.getElementById('userInputField');
        const status = document.getElementById('loginStatus');
        if (!input || !input.value.trim()) return;

        const name = input.value.trim();
        const btn = document.getElementById('btnEnterUser');

        if (status) status.textContent = 'Verificando...';
        if (btn) btn.disabled = true;

        try {
            const metadata = await this.dataManager.getUserMetadata(name);
            const deviceToken = this.getDeviceToken();

            if (metadata) {
                // El usuario ya existe, verificamos propiedad
                const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

                if (!metadata.ownerToken || metadata.ownerToken === deviceToken || isLocal) {
                    // Es el dueño, perfil viejo or estamos en LOCAL (bypass para pruebas)
                    if (isLocal && metadata.ownerToken && metadata.ownerToken !== deviceToken) {
                        console.log("ℹ️ Bypass de seguridad activado por estar en localhost");
                    }
                    await this.handleUserLogin(name);
                } else {
                    // Pertenece a otro dispositivo
                    if (status) status.textContent = '⚠️ Este nombre ya está registrado en otro dispositivo.';
                }
            } else {
                // Si no existe, lo creamos enviando nuestro token de dispositivo
                if (status) status.textContent = 'Creando nuevo perfil...';
                const result = await this.dataManager.createUserInCloud(name, deviceToken);
                if (result.success) {
                    await this.handleUserLogin(name);
                } else {
                    if (status) status.textContent = 'Error: ' + result.message;
                }
            }
        } catch (error) {
            if (status) status.textContent = 'Error de conexión';
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    /**
     * Obtiene o genera un token único para identificar este dispositivo
     */
    getDeviceToken() {
        let token = localStorage.getItem('device_token');
        if (!token) {
            token = 'tk_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
            localStorage.setItem('device_token', token);
        }
        return token;
    }

    /**
     * Cambia el período de tiempo mostrado
     */
    async switchTimeframe(timeframe, button) {
        this.currentTimeframe = timeframe;
        this.setActiveButton(button);
        await this.renderCards();
    }

    /**
     * Marca el botón activo
     */
    setActiveButton(activeButton) {
        // Remover clase activa de todos los botones de filtro
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Agregar clase activa al botón seleccionado
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }

    /**
     * Renderiza las tarjetas de actividades
     */
    async renderCards(dataFromCloud = null) {
        // Si vienen datos de la nube, los usamos. Si no, los pedimos al manager.
        const data = dataFromCloud || await this.dataManager.getData();
        const sectionCards = document.querySelector('#sectionCards');

        if (!sectionCards) return;

        sectionCards.innerHTML = '';

        data.forEach((activity, index) => {
            const timeframe = activity.timeframes[this.currentTimeframe];
            const card = this.createCard(activity, timeframe, index);
            sectionCards.appendChild(card);
        });
    }

    /**
     * Map Title to Card Gradient Class
     */
    getGradientClass(title, activity = {}) {
        const map = {
            'trabajo': 'banner-trabajo',
            'juegos': 'banner-juego', // Fix for plural
            'play': 'banner-juego', // Fallback for english? or alternative
            'estudio': 'banner-estudio',
            'study': 'banner-estudio',
            'ejercicio': 'banner-ejercicio',
            'exercise': 'banner-ejercicio',
            'social': 'banner-social',
            'auto-cuidado': 'banner-autocuidado',
            'self care': 'banner-autocuidado',
            'salud': 'banner-autocuidado' // Fix for specific case seen
        };
        const normalized = title.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/\s+/g, '-');

        // Check map, then check if colorType is valid string, then fallback
        return map[normalized] || (activity.colorType && activity.colorType !== 'undefined' ? `banner-${activity.colorType}` : 'banner-trabajo');
    }

    /**
     * Crea una tarjeta de actividad (Updated Template)
     */
    createCard(activity, timeframe, index) {
        const card = document.createElement('div');

        // Get banner gradient class
        const bannerClass = this.getGradientClass(activity.title, activity);
        card.className = 'card';

        const titleLowerCase = activity.title.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, '-');

        // Mapeo de iconos específicos (Solo si no hay uno explicito en la actividad)
        // Mapeo de iconos específicos (Solo si no hay uno explicito en la actividad)
        const iconMap = {
            'juego': 'icon-juegos.svg',
            'auto-cuidado': 'icon-cuidados-personales.svg',
            'juegos': 'icon-juegos.svg',
            'play': 'icon-juegos.svg',
            'salud': 'icon-cuidados-personales.svg' // Fallback for salud
        };

        // Use stored icon, or mapped icon, or fallback
        const iconName = activity.icon || iconMap[titleLowerCase] || `icon-${titleLowerCase}.svg`;

        const hasTimer = this.timerManager.hasActiveTimer(activity.title);
        const isPaused = this.timerManager.isTimerPaused(activity.title);

        const previousLabel = {
            'daily': 'Ayer',
            'weekly': 'Semana Pasada',
            'monthly': 'Mes Pasado'
        };

        const currentPreviousLabel = previousLabel[this.currentTimeframe] || 'Anterior';

        card.innerHTML = `
            <div class="card-banner ${bannerClass}">
                <img src="./images/${iconName}" class="card-icon" alt="${activity.title}" onerror="this.style.display='none'">
            </div>
            
            <div class="card-content">
                <!-- VIEW 1: STATS -->
                <div class="card-view-stats">
                    <div class="card-header">
                        <div class="card-title">${activity.title}</div>
                        <img src="./images/icon-ellipsis.svg" class="image-options" title="Opciones">
                    </div>
                    
                    <div class="card-stats">
                        <div class="card-time">${this.formatHours(timeframe.current)}hrs</div>
                        <div class="card-previous">${currentPreviousLabel} - ${this.formatHours(timeframe.previous)} hrs</div>
                        
                        ${hasTimer ? `
                            <div class="timer-display" data-activity="${activity.title}">
                                 <span>${isPaused ? '⏸️' : '⏱️'}</span>
                                 <span class="timer-time">00:00:00</span>
                            </div>
                        ` : ''}
                    </div>

                    <div class="card-actions">
                         ${!hasTimer ? `
                            <button class="btn btn-start" data-activity="${activity.title}">
                                ▶ Iniciar
                            </button>
                            <button class="btn btn-add" data-activity="${activity.title}">
                                + Agregar
                            </button>
                         ` : `
                            ${!isPaused ? `
                                <button class="btn btn-pause" data-activity="${activity.title}" title="Pausar">
                                    ⏸
                                </button>
                            ` : `
                                <button class="btn btn-resume" data-activity="${activity.title}" title="Reanudar">
                                    ▶
                                </button>
                            `}
                            <button class="btn btn-stop" data-activity="${activity.title}" title="Detener">
                                ⏹
                            </button>
                         `}
                    </div>

                    <!-- FOOTER TRIGGER -->
                    <div class="card-notes-trigger" title="Ver historial de notas">
                        <span class="trigger-label">📋 NOTAS</span>
                        <span class="trigger-count">${this.getFilteredNotes(timeframe.notes || []).length}</span>
                    </div>
                </div>

                <!-- VIEW 2: NOTES (HIDDEN BY DEFAULT) -->
                <div class="card-view-notes">
                    <div class="notes-view-header">
                        <button class="btn-back-stats" title="Volver a estadísticas">←</button>
                        <span class="notes-view-title">${activity.title} - Notas</span>
                    </div>
                    
                    <div class="notes-scroll-area">
                        <ul class="notes-list">
                            ${this.renderNotesList(timeframe.notes || [])}
                        </ul>
                    </div>

                    <div class="add-note-container">
                        <input type="text" class="note-input-premium" placeholder="Nueva nota..." data-activity="${activity.title}">
                        <button class="btn-add-note" data-activity="${activity.title}" title="Agregar nota">+</button>
                    </div>
                </div>
            </div>
        `;

        // Event listeners para timer (Same logic, updated classes if needed)
        // Note: Logic below finds .btn-start, so it should work as class="btn btn-start" matches querySelector('.btn-start')

        const btnStart = card.querySelector('.btn-start');
        const btnPause = card.querySelector('.btn-pause');
        const btnResume = card.querySelector('.btn-resume');
        const btnStop = card.querySelector('.btn-stop');
        const btnAddTime = card.querySelector('.btn-add');

        if (btnStart) {
            btnStart.addEventListener('click', () => this.startTimer(activity.title));
        }
        if (btnPause) {
            btnPause.addEventListener('click', () => this.pauseTimer(activity.title));
        }
        if (btnResume) {
            btnResume.addEventListener('click', () => this.resumeTimer(activity.title));
        }
        if (btnStop) {
            btnStop.addEventListener('click', () => this.stopTimer(activity.title));
        }
        if (btnAddTime) {
            btnAddTime.addEventListener('click', () => this.openAddTimeModal(activity.title));
        }

        // Restore Options Menu
        const btnOptions = card.querySelector('.image-options');
        if (btnOptions) {
            btnOptions.addEventListener('click', (e) => {
                this.showOptionsMenu(e, activity.title);
            });
        }

        // Note: New Premium Notes View Toggle Listeners
        const notesTrigger = card.querySelector('.card-notes-trigger');
        const btnBack = card.querySelector('.btn-back-stats');

        if (notesTrigger) {
            notesTrigger.addEventListener('click', () => {
                card.classList.add('showing-notes');
            });
        }

        if (btnBack) {
            btnBack.addEventListener('click', () => {
                card.classList.remove('showing-notes');
            });
        }

        // Note: New Premium Notes Listeners
        const noteInputField = card.querySelector('.note-input-premium');
        const btnAddNoteAtCard = card.querySelector('.btn-add-note');

        const handleAddNote = async () => {
            const text = noteInputField.value.trim();
            if (text) {
                await this.dataManager.addNoteToActivity(activity.title, text);
                noteInputField.value = '';
            }
        };

        if (btnAddNoteAtCard) {
            btnAddNoteAtCard.addEventListener('click', handleAddNote);
        }
        if (noteInputField) {
            noteInputField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleAddNote();
            });
        }

        // Delegación de eventos para borrar o completar notas
        const notesList = card.querySelector('.notes-list');
        if (notesList) {
            notesList.addEventListener('click', async (e) => {
                // Borrar Nota
                const btnDelete = e.target.closest('.btn-delete-note');
                if (btnDelete) {
                    const timestamp = btnDelete.dataset.timestamp;
                    if (confirm('¿Eliminar esta nota?')) {
                        await this.dataManager.deleteNoteFromActivity(activity.title, timestamp);
                    }
                }

                // Completar Nota (Checkbox)
                const checkbox = e.target.closest('.note-checkbox');
                if (checkbox && checkbox.checked) {
                    const timestamp = checkbox.dataset.timestamp;
                    const noteItem = checkbox.closest('.note-item');

                    // Efecto visual antes de procesar
                    noteItem.classList.add('completing');

                    setTimeout(async () => {
                        const success = await this.dataManager.completeNoteInActivity(activity.title, timestamp);
                        if (success) {
                            this.showNotification('✓ Tarea completada y guardada en el historial');
                        }
                    }, 600);
                }
            });
        }

        return card;
    }

    /**
     * Abre el modal para agregar tiempo
     */
    openAddTimeModal(activityTitle) {
        const modal = document.getElementById('addTimeModal');
        const modalTitle = document.getElementById('modalActivityTitle');
        const hoursInput = document.getElementById('hoursInput');

        if (modal && modalTitle && hoursInput) {
            modalTitle.textContent = activityTitle;
            hoursInput.value = '';
            modal.dataset.activity = activityTitle;
            modal.style.display = 'flex';
            hoursInput.focus();
        }
    }

    /**
     * Cierra el modal de agregar tiempo
     */
    closeAddTimeModal() {
        const modal = document.getElementById('addTimeModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Guarda el tiempo agregado
     */
    async saveAddedTime() {
        const modal = document.getElementById('addTimeModal');
        const hoursInput = document.getElementById('hoursInput');
        const notesInput = document.getElementById('notesInput'); // Note: This is on the modal

        if (!modal || !hoursInput) return;

        const activityTitle = modal.dataset.activity;
        const hours = parseFloat(hoursInput.value);
        const notes = notesInput ? notesInput.value : '';

        if (isNaN(hours) || hours <= 0) {
            alert('Por favor ingresa un número válido de horas');
            return;
        }

        // Agregar horas a la actividad
        const success = await this.dataManager.addHoursToActivity(
            activityTitle,
            this.currentTimeframe,
            hours
        );

        if (success) {
            // Obtener la nota actual de la card
            const noteInput = document.querySelector(`.note-input[data-activity="${activityTitle}"]`);
            const currentNote = noteInput ? noteInput.value : '';

            // Registrar la sesión con la nota
            await this.dataManager.logTimeSession(activityTitle, hours, currentNote);

            // Actualizar la vista
            await this.renderCards();

            // Cerrar modal
            this.closeAddTimeModal();

            // Mostrar notificación
            this.showNotification(`✓ ${hours} hrs agregadas a ${activityTitle}`);
        } else {
            alert('Error al agregar tiempo');
        }
    }

    /**
     * Muestra un menú de opciones
     */
    showOptionsMenu(event, activityTitle) {
        event.stopPropagation();

        // Remover menú existente si hay uno
        const existingMenu = document.querySelector('.options-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const menu = document.createElement('div');
        menu.className = 'options-menu';
        menu.innerHTML = `
            <div class="options-menu-item" data-action="edit">
                <span>✏️</span> Editar
            </div>
            <div class="options-menu-item" data-action="reset">
                <span>🔄</span> Resetear
            </div>
            <div class="options-menu-item" data-action="delete">
                <span>🗑️</span> Eliminar
            </div>
        `;

        // Posicionar el menú
        const rect = event.target.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = `${rect.bottom + 5}px`;
        menu.style.left = `${rect.left - 100}px`;

        document.body.appendChild(menu);

        // Event listeners para las opciones
        menu.querySelectorAll('.options-menu-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                const action = e.currentTarget.dataset.action;
                await this.handleOptionAction(action, activityTitle);
                menu.remove();
            });
        });

        // Cerrar menú al hacer click fuera
        setTimeout(() => {
            document.addEventListener('click', function closeMenu() {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            });
        }, 100);
    }

    /**
     * Maneja las acciones del menú de opciones
     */
    async handleOptionAction(action, activityTitle) {
        switch (action) {
            case 'edit':
                this.openEditActivityModal(activityTitle);
                break;
            case 'reset':
                if (confirm(`¿Resetear todas las horas de ${activityTitle}?`)) {
                    await this.resetActivity(activityTitle);
                }
                break;
            case 'delete':
                if (confirm(`¿Eliminar la actividad ${activityTitle}?`)) {
                    await this.deleteActivity(activityTitle);
                }
                break;
        }
    }

    /**
     * Resetea las horas de una actividad
     */
    async resetActivity(activityTitle) {
        const data = await this.dataManager.getData();
        const activity = data.find(a => a.title === activityTitle);

        if (activity) {
            activity.timeframes.daily = { current: 0, previous: 0 };
            activity.timeframes.weekly = { current: 0, previous: 0 };
            activity.timeframes.monthly = { current: 0, previous: 0 };

            // Al guardar en la nube, el listener del constructor 
            // se encargará de refrescar la UI automáticamente.
            await this.dataManager.saveToCloud(data);
            this.showNotification(`✓ ${activityTitle} reseteada`);
        }
    }

    /**
     * Elimina una actividad
     */
    async deleteActivity(activityTitle) {
        const success = await this.dataManager.deleteActivity(activityTitle);
        if (success) {
            await this.renderCards();
            this.showNotification(`✓ ${activityTitle} eliminada`);
        }
    }

    /**
     * Abre modal para editar actividad
     */
    async openEditActivityModal(activityTitle) {
        const modal = document.getElementById('editActivityModal');
        const modalTitle = document.getElementById('editModalActivityTitle');
        const inputHours = document.getElementById('editHoursInput');

        if (!modal || !modalTitle || !inputHours) return; // Guard clause

        // Get current data
        const data = await this.dataManager.getData();
        const activity = data.find(a => a.title === activityTitle);

        if (!activity) return;

        // Populate modal
        modalTitle.textContent = activityTitle;
        // Pre-fill with CURRENT timeframe hours
        const currentHours = activity.timeframes[this.currentTimeframe].current;
        inputHours.value = currentHours;

        modal.dataset.activity = activityTitle;
        modal.style.display = 'flex';

        // Setup Save/Cancel listeners (one-time setup or clean previous)
        const btnSave = document.getElementById('btnSaveEdit');
        const btnCancel = document.getElementById('btnCancelEdit');
        const btnClose = modal.querySelector('.modal-close-edit');

        // Helper to remove listeners and close
        const closeEdit = () => {
            modal.style.display = 'none';
        };

        // NOTE: A better approach for listeners is in initializeEventListeners or using 'onclick' to avoid duplicates.
        // For now, we'll use onclick properties to ensure simple replacement without accumulation.

        if (btnSave) {
            btnSave.onclick = async () => {
                const newHours = parseFloat(inputHours.value);
                if (isNaN(newHours) || newHours < 0) {
                    alert('Por favor valida las horas.');
                    return;
                }

                // Update Data
                activity.timeframes[this.currentTimeframe].current = newHours;

                // Save
                await this.dataManager.saveToCloud(data);
                await this.renderCards();

                this.showNotification(`✓ ${activityTitle} actualizado`);
                closeEdit();
            };
        }

        if (btnCancel) btnCancel.onclick = closeEdit;
        if (btnClose) btnClose.onclick = closeEdit;
    }

    /**
     * Opens the Create Activity Modal
     */
    openCreateActivityModal() {
        const modal = document.getElementById('createActivityModal');
        const inputName = document.getElementById('newActivityName');

        if (!modal || !inputName) return;

        inputName.value = '';
        // Reset color selection
        const colorOptions = document.querySelectorAll('.color-option');
        colorOptions.forEach(o => o.style.border = '2px solid transparent');
        if (colorOptions.length > 0) {
            colorOptions[0].style.border = '2px solid white'; // Select first by default
            document.getElementById('newActivityColor').value = colorOptions[0].dataset.color;
        }

        modal.style.display = 'flex';
        inputName.focus();

        // Default Icon Select
        const iconOptions = document.querySelectorAll('.icon-option');
        iconOptions.forEach(o => o.classList.remove('selected'));
        if (iconOptions.length > 0) {
            iconOptions[0].classList.add('selected');
            document.getElementById('newActivityIcon').value = iconOptions[0].dataset.icon;
        }

        // Setup Buttons
        const btnSave = document.getElementById('btnSaveCreate');
        const btnCancel = document.getElementById('btnCancelCreate');
        const btnClose = modal.querySelector('.modal-close-create');

        const closeCreate = () => {
            modal.style.display = 'none';
        }

        if (btnSave) {
            btnSave.onclick = async () => {
                await this.saveNewActivity();
                closeCreate();
            }
        }

        if (btnCancel) btnCancel.onclick = closeCreate;
        if (btnClose) btnClose.onclick = closeCreate;
    }

    /**
     * Saves the new activity
     */
    async saveNewActivity() {
        const inputName = document.getElementById('newActivityName');
        const inputColor = document.getElementById('newActivityColor');

        if (!inputName || !inputName.value.trim()) {
            alert('Por favor ingresa un nombre para la actividad.');
            return;
        }

        const title = inputName.value.trim();
        // Check if exists
        const data = await this.dataManager.getData();
        if (data.some(a => a.title.toLowerCase() === title.toLowerCase())) {
            alert('Ya existe una actividad con este nombre.');
            return;
        }

        // Although we can't easily save the "color type" permanently without modifying the data structure extensively (since logic uses title name),
        // we can assume the user wants to mimic one of the existing types.
        // However, the current logic derives class from title. `getGradientClass` uses title.
        // To support "Colors", we might need to update `getGradientClass` to look at a stored property, OR simpler:
        // We just add it, and if the name matches a key it gets that color, otherwise default.
        // WAIT. The user specifically asked for "Type (Color)" selection.
        // Meaning we need to store this preference.
        // Update: I will modify `createCard` to handle a `type` or `color` property if it exists, or fallback to title mapping.

        const newActivity = {
            title: title,
            colorType: inputColor.value, // New property to store the selected color theme
            timeframes: {
                daily: { current: 0, previous: 0 },
                weekly: { current: 0, previous: 0 },
                monthly: { current: 0, previous: 0 }
            }
        };

        await this.dataManager.addActivity(newActivity); // Need to implement/ensure this exists
        await this.renderCards();
        this.showNotification(`✓ Actividad "${title}" creada`);
    }

    /**
     * Muestra una notificación temporal
     */
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Inicia un timer
     */
    startTimer(activityTitle) {
        this.timerManager.startTimer(activityTitle);
        this.renderCards();
        this.startTimerUpdates();
        this.showNotification(`⏱️ Timer iniciado para ${activityTitle}`);
    }

    /**
     * Pausa un timer
     */
    pauseTimer(activityTitle) {
        this.timerManager.pauseTimer(activityTitle);
        this.renderCards();
        this.showNotification(`⏸️ Timer pausado para ${activityTitle}`);
    }

    /**
     * Reanuda un timer
     */
    resumeTimer(activityTitle) {
        this.timerManager.startTimer(activityTitle);
        this.renderCards();
        this.showNotification(`▶️ Timer reanudado para ${activityTitle}`);
    }

    /**
     * Detiene un timer
     */
    async stopTimer(activityTitle) {
        const hours = await this.timerManager.stopTimer(activityTitle);
        if (hours !== null) {
            // Obtener la nota actual de la card (del nuevo input premium)
            const noteInput = document.querySelector(`.note-input-premium[data-activity="${activityTitle}"]`);
            const currentNote = noteInput ? noteInput.value.trim() : '';

            if (noteInput) noteInput.value = ''; // Limpiar después de guardar

            // Agregar las horas a la actividad
            await this.dataManager.addHoursToActivity(activityTitle, this.currentTimeframe, hours);

            // Registrar la sesión con la nota
            await this.dataManager.logTimeSession(activityTitle, hours, currentNote);

            // Actualizar la vista
            await this.renderCards();

            this.showNotification(`⏹️ Timer detenido: ${hours.toFixed(2)} hrs guardadas`);

            // Detener actualizaciones si no hay más timers
            if (this.timerManager.getAllActiveTimers().length === 0) {
                this.stopTimerUpdates();
            }
        }
    }

    /**
     * Inicia el loop de actualización de timers
     */
    startTimerUpdates() {
        if (this.timerInterval) return; // Ya está corriendo

        this.timerInterval = setInterval(() => {
            this.updateTimerDisplays();
        }, 100); // Actualizar cada 100ms (10 veces por segundo) para efecto de cronómetro real
    }

    /**
     * Detiene el loop de actualización de timers
     */
    stopTimerUpdates() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    /**
     * Actualiza los displays de los timers
     */
    updateTimerDisplays() {
        const activeTimers = this.timerManager.getAllActiveTimers();

        activeTimers.forEach(activityTitle => {
            const timerDisplay = document.querySelector(`.timer-display[data-activity="${activityTitle}"] .timer-time`);
            if (timerDisplay) {
                const elapsed = this.timerManager.getElapsedTime(activityTitle);
                timerDisplay.textContent = this.timerManager.formatTime(elapsed);
            }
        });
    }

    async initialize() {
        const savedUser = localStorage.getItem('currentUser');

        // Si estamos en modo local y no hay usuario, forzamos un estado básico
        if (this.dataManager.isLocalMode && !savedUser) {
            console.log("🛠️ Inicializando modo local sin usuario");
            await this.renderCards();
            return;
        }

        if (savedUser) {
            await this.handleUserLogin(savedUser);
        } else {
            await this.showUserSelectionModal();
        }

        if (this.timerManager.getAllActiveTimers().length > 0) {
            this.startTimerUpdates();
        }
    }

    async showUserSelectionModal() {
        const modal = document.getElementById('userSelectionModal');
        const input = document.getElementById('userInputField');
        const status = document.getElementById('loginStatus');
        const currentUserStatus = document.getElementById('currentUserStatus');
        const loggedUserName = document.getElementById('loggedUserName');
        const userModalTitle = document.getElementById('userModalTitle');
        const userLoginDesc = document.getElementById('userLoginDesc');

        if (!modal) return;

        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            if (currentUserStatus) currentUserStatus.style.display = 'block';
            if (loggedUserName) loggedUserName.textContent = currentUser;
            if (userModalTitle) userModalTitle.textContent = "Gestionar Perfil";
            if (userLoginDesc) userLoginDesc.style.display = 'none';
        } else {
            if (currentUserStatus) currentUserStatus.style.display = 'none';
            if (userModalTitle) userModalTitle.textContent = "Ingresar Usuario";
            if (userLoginDesc) userLoginDesc.style.display = 'block';
        }

        if (input) input.value = '';
        if (status) status.textContent = '';

        // Cargar y mostrar usuarios recientes (locales)
        this.renderRecentUsers();

        modal.style.display = 'flex';
        if (input) input.focus();

        this.setupModalInteractions();
    }

    /**
     * Renderiza la lista de usuarios que se han logueado en este navegador
     */
    renderRecentUsers() {
        const recentList = document.getElementById('recentUsersList');
        const section = document.getElementById('recentUsersSection');
        if (!recentList || !section) return;

        const users = JSON.parse(localStorage.getItem('recentUsers') || '[]');
        const currentUser = localStorage.getItem('currentUser');

        // Filtrar el usuario actual de la lista de "otros" si queremos, 
        // o mostrarlo para que sea fácil volver a él.
        const otherUsers = users.filter(name => name !== currentUser);

        if (otherUsers.length > 0) {
            section.style.display = 'block';
            recentList.innerHTML = '';
            otherUsers.forEach(username => {
                const btn = document.createElement('button');
                btn.className = 'btn-modal';
                btn.style.background = 'rgba(255,255,255,0.05)';
                btn.style.border = '1px solid rgba(255,255,255,0.1)';
                btn.style.color = 'white';
                btn.style.textAlign = 'left';
                btn.style.padding = '12px 20px';
                btn.innerHTML = `<span>👤</span> ${username}`;
                btn.onclick = () => this.handleUserLogin(username);
                recentList.appendChild(btn);
            });
        } else {
            section.style.display = 'none';
        }
    }

    /**
     * Guarda un usuario en la lista de recientes del equipo
     */
    saveToRecentUsers(username) {
        let users = JSON.parse(localStorage.getItem('recentUsers') || '[]');
        if (!users.includes(username)) {
            users.push(username);
            localStorage.setItem('recentUsers', JSON.stringify(users));
        }
    }

    /**
     * Elimina un usuario de la lista de recientes
     */
    removeFromRecentUsers(username) {
        let users = JSON.parse(localStorage.getItem('recentUsers') || '[]');
        users = users.filter(u => u !== username);
        localStorage.setItem('recentUsers', JSON.stringify(users));
    }

    /**
     * Asegura que los botones del modal de usuario funcionen correctamente
     */
    setupModalInteractions() {
        const btnLogout = document.getElementById('btnLogout');
        const btnDeleteAccount = document.getElementById('btnDeleteAccount');
        const btnEnterUser = document.getElementById('btnEnterUser');

        if (btnLogout) {
            btnLogout.onclick = () => this.handleLogout();
        }
        if (btnDeleteAccount) {
            btnDeleteAccount.onclick = (e) => {
                const currentUser = localStorage.getItem('currentUser');
                if (currentUser) {
                    this.handleDeleteUser(currentUser, e);
                }
            };
        }
        if (btnEnterUser) {
            btnEnterUser.onclick = () => this.handlePrivateLogin();
        }

        const btnCloseX = document.getElementById('btnCloseUserModal');
        const btnCancel = document.getElementById('btnCancelUserModal');
        const modal = document.getElementById('userSelectionModal');

        const closeModal = () => {
            const currentUser = localStorage.getItem('currentUser');
            // Si no hay usuario, no permitimos cerrar a menos que cancelen la acción de cambio
            if (!currentUser) {
                alert("Debes ingresar un usuario para continuar.");
                return;
            }
            modal.style.display = 'none';
        };

        if (btnCloseX) btnCloseX.onclick = closeModal;
        if (btnCancel) btnCancel.onclick = closeModal;

        // También permitir cerrar haciendo click fuera
        if (modal) {
            modal.onclick = (e) => {
                if (e.target === modal) closeModal();
            };
        }
    }

    /**
     * Cierra la sesión del usuario actual
     */
    handleLogout() {
        localStorage.removeItem('currentUser');
        location.reload();
    }

    /**
     * Maneja el login de usuario
     */
    async handleUserLogin(username) {
        // Antes de loguear, verificamos si tenemos el token por si el usuario se cambió manualmente en el DOM
        const metadata = await this.dataManager.getUserMetadata(username);
        const deviceToken = this.getDeviceToken();

        if (metadata && metadata.ownerToken && metadata.ownerToken !== deviceToken) {
            alert("Error: No tienes permiso para acceder a este perfil desde este dispositivo.");
            return;
        }

        await this.dataManager.setUser(username);

        // Persistir en local para futuras sesiones
        localStorage.setItem('currentUser', username);

        // Guardar en la lista de usuarios de este equipo
        this.saveToRecentUsers(username);

        // Actualizar UI nombre
        const userNameLabel = document.getElementById('userNameLabel');
        if (userNameLabel) userNameLabel.textContent = username;

        // Renderizar datos del usuario actual
        await this.renderCards();

        // Cerrar modal
        const modal = document.getElementById('userSelectionModal');
        if (modal) modal.style.display = 'none';

        this.showNotification(`👋 Hola, ${username}`);
    }

    /**
     * Maneja la eliminación de un usuario
     */
    async handleDeleteUser(username, event) {
        if (event && event.stopPropagation) event.stopPropagation();

        // Verificación de tokens antes de siquiera preguntar
        const metadata = await this.dataManager.getUserMetadata(username);
        const deviceToken = this.getDeviceToken();

        if (metadata && metadata.ownerToken && metadata.ownerToken !== deviceToken) {
            alert("No puedes borrar este perfil porque fue creado en otro dispositivo.");
            return;
        }

        const message = `⚠️ ¿Estás seguro de que quieres eliminar a "${username}"?`;

        if (confirm(message)) {
            // Mostrar estado de carga en el botón si es posible
            const btnDelete = document.getElementById('btnDeleteAccount');
            const originalText = btnDelete ? btnDelete.textContent : '';
            if (btnDelete) {
                btnDelete.textContent = 'Eliminando...';
                btnDelete.disabled = true;
            }

            try {
                const success = await this.dataManager.deleteUserInCloud(username);
                if (success) {
                    this.showNotification(`🗑️ Usuario ${username} eliminado`);

                    // Quitar de la lista de recientes también
                    this.removeFromRecentUsers(username);

                    // Limpiar sesión siempre que borramos el usuario actual
                    if (localStorage.getItem('currentUser') === username) {
                        localStorage.removeItem('currentUser');
                        location.reload();
                    } else {
                        await this.showUserSelectionModal();
                    }
                } else {
                    alert('No se pudo eliminar el usuario. Verifica tu conexión.');
                }
            } catch (error) {
                alert('Ocurrió un error inesperado al eliminar el usuario.');
            } finally {
                if (btnDelete) {
                    btnDelete.textContent = originalText;
                    btnDelete.disabled = false;
                }
            }
        }
    }

    /**
     * Alterna entre vistas (Dashboard o Historial)
     */
    switchView(viewName) {
        const dashboard = document.getElementById('viewDashboard');
        const history = document.getElementById('viewHistory');
        const tabDash = document.getElementById('tabDashboard');
        const tabHist = document.getElementById('tabHistory');

        if (viewName === 'dashboard') {
            dashboard.style.display = 'block';
            history.style.display = 'none';
            tabDash.classList.add('active');
            tabHist.classList.remove('active');
            this.renderCards();
        } else {
            dashboard.style.display = 'none';
            history.style.display = 'block';
            tabDash.classList.remove('active');
            tabHist.classList.add('active');
            this.renderHistoryTable();
            this.populateActivityFilter();
        }
    }

    /**
     * Guarda la nota de una actividad para el período actual
     */
    async saveNote(activityTitle, note) {
        if (!note.trim()) return;
        await this.dataManager.addNoteToActivity(activityTitle, note);
    }

    /**
     * Población de filtro de actividades en el historial
     */
    async populateActivityFilter() {
        const select = document.getElementById('historyFilterActivity');
        if (!select) return;

        const data = await this.dataManager.getData();
        const currentVal = select.value;
        select.innerHTML = '<option value="">Todas las actividades</option>';

        data.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.title;
            opt.textContent = a.title;
            select.appendChild(opt);
        });
        select.value = currentVal;
    }

    /**
     * Renderiza la tabla de historial con filtros y paginación
     */
    async renderHistoryTable() {
        const tbody = document.getElementById('historyTableBody');
        const filterDate = document.getElementById('historyFilterDate').value;
        const filterActivity = document.getElementById('historyFilterActivity').value;

        if (!tbody) return;

        // Obtener sesiones vía DataManager (centralizado)
        let sessions = await this.dataManager.getSessions();

        // Aplicar filtros
        let filtered = sessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (filterDate) {
            filtered = filtered.filter(s => s.timestamp.startsWith(filterDate));
        }
        if (filterActivity) {
            filtered = filtered.filter(s => s.activity === filterActivity);
        }

        // Paginación
        const total = filtered.length;
        const start = (this.historyPage - 1) * this.historyPageSize;
        const end = start + this.historyPageSize;
        const pageData = filtered.slice(start, end);

        // Actualizar UI paginación
        const indicator = document.getElementById('pageIndicator');
        if (indicator) indicator.textContent = `Pág ${this.historyPage} de ${Math.ceil(total / this.historyPageSize) || 1}`;

        tbody.innerHTML = '';

        if (pageData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #555; padding: 40px;">No hay registros para mostrar.</td></tr>';
            return;
        }

        pageData.forEach(s => {
            const tr = document.createElement('tr');
            const isTask = s.isTask === true;
            const typeBadge = isTask ?
                '<span class="badge-task" style="background: rgba(46, 204, 113, 0.1); color: #2ecc71; padding: 2px 8px; border-radius: 12px; font-size: 11px; border: 1px solid rgba(46, 204, 113, 0.2);">TAREA</span>' :
                '<span class="badge-time" style="background: rgba(52, 152, 219, 0.1); color: #3498db; padding: 2px 8px; border-radius: 12px; font-size: 11px; border: 1px solid rgba(52, 152, 219, 0.2);">SESIÓN</span>';

            tr.innerHTML = `
                <td>
                    <div style="font-weight: 500;">${this.formatDate(s.timestamp)}</div>
                    <div style="font-size: 11px; color: #666;">${new Date(s.timestamp).toLocaleTimeString()}</div>
                </td>
                <td><span class="badge-activity">${s.activity}</span></td>
                <td>${typeBadge}</td>
                <td><strong style="${isTask ? 'color: #777;' : ''}">${s.hours.toFixed(2)}</strong> hrs</td>
                <td><div class="note-text-cell" style="${isTask ? 'font-style: italic;' : ''}">${s.note || '-'}</div></td>
                <td>
                    <!-- Acciones futuras (borrar log, etc) -->
                    <span style="color: #444; cursor: not-allowed;">⚙️</span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    changePage(offset) {
        this.historyPage += offset;
        if (this.historyPage < 1) this.historyPage = 1;
        this.renderHistoryTable();
    }

    /**
     * Filtra una lista de notas según el período calendario actual
     */
    getFilteredNotes(notes) {
        if (!notes || notes.length === 0) return [];

        const now = new Date();
        return notes.filter(note => {
            const noteDate = new Date(note.timestamp);
            if (this.currentTimeframe === 'daily') {
                return noteDate.toDateString() === now.toDateString();
            } else if (this.currentTimeframe === 'weekly') {
                return noteDate.getMonth() === now.getMonth() && noteDate.getFullYear() === now.getFullYear();
            } else if (this.currentTimeframe === 'monthly') {
                return noteDate.getFullYear() === now.getFullYear();
            }
            return true;
        });
    }

    /**
     * Renders the list of notes for a card
     */
    renderNotesList(notes) {
        const filteredNotes = this.getFilteredNotes(notes);

        if (filteredNotes.length === 0) {
            return '<li class="note-item-empty">No hay notas para este periodo.</li>';
        }

        // Mostrar solo las últimas 5 notas filtradas
        const latestNotes = filteredNotes.slice(0, 5);

        return latestNotes.map(note => `
            <li class="note-item">
                <input type="checkbox" class="note-checkbox" data-timestamp="${note.timestamp}" title="Marcar como completada">
                <div class="note-body">
                    <span class="note-text">${note.text}</span>
                    <span class="note-date">${this.formatDate(note.timestamp)}</span>
                </div>
                <button class="btn-delete-note" data-timestamp="${note.timestamp}" title="Eliminar nota">
                    &times;
                </button>
            </li>
        `).join('');
    }

    formatDate(isoString) {
        const d = new Date(isoString);
        return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
    }

    /**
     * Formats hours to prevent overflow (e.g., 2.50 or 32)
     */
    formatHours(hours) {
        if (!hours === undefined || hours === null) return '0';
        const numHours = parseFloat(hours);
        if (isNaN(numHours)) return '0';
        if (Number.isInteger(numHours)) return numHours.toString();
        return numHours.toFixed(2).replace(/\.00$/, '');
    }

}
export default UIController;
