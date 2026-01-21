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
            // Buscamos si el usuario existe en la lista de Firebase
            const allUsers = await this.dataManager.getAllUsersFromCloud();
            const exists = allUsers.some(u => u.name.toLowerCase() === name.toLowerCase());

            if (exists) {
                // Si existe, entramos con el nombre correcto (case-sensitive as saved)
                const actualName = allUsers.find(u => u.name.toLowerCase() === name.toLowerCase()).name;
                await this.handleUserLogin(actualName);
            } else {
                // Si no existe, lo creamos
                if (status) status.textContent = 'Creando nuevo perfil...';
                const result = await this.dataManager.createUserInCloud(name);
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
        const notesInput = document.getElementById('notesInput');

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
            // Registrar la sesión
            await this.dataManager.logTimeSession(activityTitle, hours);

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
            // Agregar las horas a la actividad
            await this.dataManager.addHoursToActivity(activityTitle, this.currentTimeframe, hours);

            // Registrar la sesión
            await this.dataManager.logTimeSession(activityTitle, hours);

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
        // Verificar si hay un usuario guardado en LocalStorage (sesión persistente)
        const savedUser = localStorage.getItem('currentUser');

        if (savedUser) {
            await this.handleUserLogin(savedUser);
        } else {
            // Mostrar modal de selección si no hay sesión iniciada
            await this.showUserSelectionModal();
        }

        // Iniciar actualizaciones de timer si hay timers activos
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

        modal.style.display = 'flex';
        if (input) input.focus();

        // Asegurar que los botones del modal tengan los listeners actuales
        // (En caso de que el modal haya sido manipulado dinámicamente)
        this.setupModalInteractions();
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
        await this.dataManager.setUser(username);

        // Persistir en local para futuras sesiones
        localStorage.setItem('currentUser', username);

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

        const message = `⚠️ ¿Estás seguro de que quieres eliminar a "${username}"?\n\nEsta acción borrará TODOS tus datos y actividades permanentemente en la nube.`;

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
     * Ya no usamos handleCreateUser directamente, se integró en handlePrivateLogin
     */
    /**
     * Formats hours to prevent overflow (e.g., 2.50 or 32)
     */
    formatHours(hours) {
        if (!hours) return '0';
        // If whole number, return as is (string)
        if (Number.isInteger(hours)) return hours.toString();
        // If decimal, return max 2 decimals
        return hours.toFixed(2).replace(/\.00$/, '');
    }

}
export default UIController;
