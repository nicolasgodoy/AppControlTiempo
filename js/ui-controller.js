/**
 * UIController - Maneja la interfaz de usuario y las interacciones
 */
import TimerManager from './timer-manager.js';

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
    }

    /**
     * Inicializa los event listeners
     */
    initializeEventListeners() {
        // Botones de período
        const btnDay = document.querySelector('#Dia');
        const btnWeek = document.querySelector('#Mes');
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

        // Marcar el botón activo por defecto
        this.setActiveButton(btnDay);
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
        // Remover clase activa de todos los botones
        document.querySelectorAll('.tituloDia, .tituloMes, .tituloAnio').forEach(btn => {
            btn.classList.remove('active-period');
        });

        // Agregar clase activa al botón seleccionado
        if (activeButton) {
            activeButton.classList.add('active-period');
        }
    }

    /**
     * Renderiza las tarjetas de actividades
     */
    async renderCards() {
        const data = await this.dataManager.getData();
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
     * Crea una tarjeta de actividad
     */
    createCard(activity, timeframe, index) {
        const card = document.createElement('div');
        card.className = 'Card';

        const titleLowerCase = activity.title.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, '-');

        const backgroundColor = this.BackgroundColors[index] || 'var(--gradient-1)';

        const hasTimer = this.timerManager.hasActiveTimer(activity.title);
        const isPaused = this.timerManager.isTimerPaused(activity.title);

        card.innerHTML = `
            <div class="card-background" style="background: ${backgroundColor}">
                <img src="/images/icon-${titleLowerCase}.svg" onerror="this.style.display='none'">
            </div>

            <div class="card-detalles">
                <!-- Header: Título y Opciones -->
                <div class="card-header">
                    <p class="Tipo-Actividad">${activity.title}</p>
                    <img class="imagen-puntos" src="./images/icon-ellipsis.svg" 
                         data-activity="${activity.title}" 
                         style="cursor: pointer;"
                         title="Opciones">
                </div>

                <!-- Body: Horas y Timer -->
                <div class="card-body">
                    <p class="card-hora">${timeframe.current.toFixed(1)}hrs</p>
                    <p class="horas-previas">Previous - ${timeframe.previous} hrs</p>
                    
                    ${hasTimer ? `
                        <div class="timer-display" data-activity="${activity.title}">
                            <span class="timer-icon">${isPaused ? '⏸️' : '⏱️'}</span>
                            <span class="timer-time">00:00:00</span>
                        </div>
                    ` : ''}
                </div>

                <!-- Footer: Acciones -->
                <div class="card-actions">
                    ${!hasTimer ? `
                        <button class="btn-timer btn-start" data-activity="${activity.title}" title="Iniciar timer">
                            ▶️ Iniciar
                        </button>
                        <button class="btn-add-time" data-activity="${activity.title}" title="Agregar tiempo manual">
                            + Agregar
                        </button>
                    ` : `
                        ${!isPaused ? `
                            <button class="btn-timer btn-pause" data-activity="${activity.title}" title="Pausar">
                                ⏸️ Pausar
                            </button>
                        ` : `
                            <button class="btn-timer btn-resume" data-activity="${activity.title}" title="Reanudar">
                                ▶️ Reanudar
                            </button>
                        `}
                        <button class="btn-timer btn-stop" data-activity="${activity.title}" title="Detener y guardar">
                            ⏹️ Detener
                        </button>
                    `}
                </div>
            </div>
        `;

        // Event listeners para timer
        const btnStart = card.querySelector('.btn-start');
        const btnPause = card.querySelector('.btn-pause');
        const btnResume = card.querySelector('.btn-resume');
        const btnStop = card.querySelector('.btn-stop');
        const btnAddTime = card.querySelector('.btn-add-time');

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

        // Event listener para opciones (menú de 3 puntos)
        const btnOptions = card.querySelector('.imagen-puntos');
        btnOptions.addEventListener('click', (e) => {
            this.showOptionsMenu(e, activity.title);
        });

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

            this.dataManager.saveToStorage(data);
            await this.renderCards();
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
    openEditActivityModal(activityTitle) {
        // Por implementar en siguiente paso
        alert('Función de edición próximamente');
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

    /**
     * Inicializa la aplicación
     */
    async initialize() {
        await this.renderCards();

        // Iniciar actualizaciones de timer si hay timers activos
        if (this.timerManager.getAllActiveTimers().length > 0) {
            this.startTimerUpdates();
        }
    }
}

export default UIController;
