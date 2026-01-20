/**
 * TimerManager - Gestiona los timers en tiempo real para cada actividad
 */
class TimerManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.activeTimers = new Map(); // Map<activityTitle, timerData>
        this.loadActiveTimers();
    }

    /**
     * Carga timers activos desde localStorage (en caso de refresh)
     */
    loadActiveTimers() {
        try {
            const stored = localStorage.getItem('active-timers');
            if (stored) {
                const timers = JSON.parse(stored);
                Object.entries(timers).forEach(([activity, data]) => {
                    // Recalcular el tiempo transcurrido
                    const elapsed = Date.now() - data.startTime;
                    this.activeTimers.set(activity, {
                        startTime: data.startTime,
                        pausedTime: data.pausedTime || 0,
                        isPaused: data.isPaused || false
                    });
                });
            }
        } catch (error) {
            console.error('Error cargando timers activos:', error);
        }
    }

    /**
     * Guarda timers activos en localStorage
     */
    saveActiveTimers() {
        try {
            const timersObj = {};
            this.activeTimers.forEach((data, activity) => {
                timersObj[activity] = data;
            });
            localStorage.setItem('active-timers', JSON.stringify(timersObj));
        } catch (error) {
            console.error('Error guardando timers activos:', error);
        }
    }

    /**
     * Inicia un timer para una actividad
     */
    startTimer(activityTitle) {
        if (this.activeTimers.has(activityTitle)) {
            const timer = this.activeTimers.get(activityTitle);
            if (timer.isPaused) {
                // Reanudar timer pausado
                timer.isPaused = false;
                timer.startTime = Date.now() - timer.pausedTime;
            }
        } else {
            // Nuevo timer
            this.activeTimers.set(activityTitle, {
                startTime: Date.now(),
                pausedTime: 0,
                isPaused: false
            });
        }
        this.saveActiveTimers();
        return true;
    }

    /**
     * Pausa un timer
     */
    pauseTimer(activityTitle) {
        const timer = this.activeTimers.get(activityTitle);
        if (timer && !timer.isPaused) {
            timer.pausedTime = Date.now() - timer.startTime;
            timer.isPaused = true;
            this.saveActiveTimers();
            return true;
        }
        return false;
    }

    /**
     * Detiene y guarda un timer
     */
    async stopTimer(activityTitle) {
        const timer = this.activeTimers.get(activityTitle);
        if (!timer) return null;

        const elapsed = timer.isPaused
            ? timer.pausedTime
            : Date.now() - timer.startTime;

        const hours = elapsed / (1000 * 60 * 60); // Convertir ms a horas

        // Guardar en el data manager
        await this.dataManager.logTimeSession(activityTitle, hours);

        // Remover timer
        this.activeTimers.delete(activityTitle);
        this.saveActiveTimers();

        return hours;
    }

    /**
     * Obtiene el tiempo transcurrido de un timer
     */
    getElapsedTime(activityTitle) {
        const timer = this.activeTimers.get(activityTitle);
        if (!timer) return 0;

        if (timer.isPaused) {
            return timer.pausedTime;
        }

        return Date.now() - timer.startTime;
    }

    /**
     * Verifica si una actividad tiene un timer activo
     */
    hasActiveTimer(activityTitle) {
        return this.activeTimers.has(activityTitle);
    }

    /**
     * Verifica si un timer está pausado
     */
    isTimerPaused(activityTitle) {
        const timer = this.activeTimers.get(activityTitle);
        return timer ? timer.isPaused : false;
    }

    /**
     * Formatea el tiempo en formato HH:MM:SS.CC (con centésimas)
     */
    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const centiseconds = Math.floor((milliseconds % 1000) / 10); // Centésimas de segundo

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
    }

    /**
     * Obtiene todos los timers activos
     */
    getAllActiveTimers() {
        return Array.from(this.activeTimers.keys());
    }
}

export default TimerManager;
