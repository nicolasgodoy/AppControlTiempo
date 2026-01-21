/**
 * DataManager - Gestiona los datos de actividades con LocalStorage
 */
class DataManager {
    constructor() {
        this.BASE_STORAGE_KEY = 'activity-tracker-data';
        this.STORAGE_KEY = this.BASE_STORAGE_KEY; // Default legacy
        this.currentUser = null;
        this.initializeData();
    }

    /**
     * Establece el usuario actual y recarga los datos
     */
    async setUser(username) {
        this.currentUser = username;
        // Si hay usuario, usamos postfijo, si no (null), usamos legacy o default
        this.STORAGE_KEY = username
            ? `${this.BASE_STORAGE_KEY}-${username}`
            : this.BASE_STORAGE_KEY;

        // Recargar datos para este usuario
        await this.initializeData();
        return true;
    }

    /**
     * Inicializa los datos desde LocalStorage o carga datos por defecto
     */
    initializeData() {
        const storedData = this.loadFromStorage();
        if (!storedData) {
            // Cargar datos iniciales desde data.json
            this.loadDefaultData();
        }
    }

    /**
     * Carga datos por defecto desde data.json
     */
    async loadDefaultData() {
        try {
            const response = await fetch('./data.json');
            const data = await response.json();
            this.saveToStorage(data);
            return data;
        } catch (error) {
            console.error('Error cargando datos por defecto:', error);
            return this.getEmptyData();
        }
    }

    /**
     * Obtiene estructura de datos vacía
     */
    getEmptyData() {
        return [];
    }

    /**
     * Carga datos desde LocalStorage
     */
    loadFromStorage() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error cargando desde LocalStorage:', error);
            return null;
        }
    }

    /**
     * Guarda datos en LocalStorage
     */
    saveToStorage(data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error guardando en LocalStorage:', error);
            return false;
        }
    }

    /**
     * Obtiene todos los datos
     */
    async getData() {
        let data = this.loadFromStorage();
        if (!data) {
            data = await this.loadDefaultData();
        }
        return data;
    }

    /**
     * Actualiza las horas de una actividad específica
     */
    async updateActivityHours(activityTitle, timeframe, current, previous) {
        const data = await this.getData();
        const activity = data.find(item => item.title === activityTitle);

        if (activity && activity.timeframes[timeframe]) {
            activity.timeframes[timeframe].current = current;
            activity.timeframes[timeframe].previous = previous;
            this.saveToStorage(data);
            return true;
        }
        return false;
    }

    /**
     * Agrega horas a una actividad (suma a las existentes)
     */
    async addHoursToActivity(activityTitle, timeframe, hoursToAdd) {
        const data = await this.getData();
        const activity = data.find(item => item.title === activityTitle);

        if (activity && activity.timeframes[timeframe]) {
            activity.timeframes[timeframe].current += hoursToAdd;
            this.saveToStorage(data);
            return true;
        }
        return false;
    }

    /**
     * Crea una nueva categoría de actividad
     */
    async createActivity(title, color) {
        const data = await this.getData();

        // Verificar si ya existe
        if (data.find(item => item.title === title)) {
            return { success: false, message: 'La actividad ya existe' };
        }

        const newActivity = {
            title: title,
            color: color || 'hsl(200, 50%, 50%)',
            timeframes: {
                daily: { current: 0, previous: 0 },
                weekly: { current: 0, previous: 0 },
                monthly: { current: 0, previous: 0 }
            }
        };

        data.push(newActivity);
        this.saveToStorage(data);
        return { success: true, activity: newActivity };
    }

    /**
     * Agrega una actividad completa directamente
     */
    async addActivity(activity) {
        const data = await this.getData();
        data.push(activity);
        this.saveToStorage(data);
        return true;
    }

    /**
     * Elimina una actividad
     */
    async deleteActivity(activityTitle) {
        const data = await this.getData();
        const filteredData = data.filter(item => item.title !== activityTitle);

        if (filteredData.length < data.length) {
            this.saveToStorage(filteredData);
            return true;
        }
        return false;
    }

    /**
     * Exporta datos a JSON
     */
    exportToJSON() {
        const data = this.loadFromStorage();
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `activity-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        URL.revokeObjectURL(url);
    }

    /**
     * Exporta datos a Excel (CSV)
     */
    exportToExcel() {
        const data = this.loadFromStorage();

        if (typeof XLSX === 'undefined') {
            console.error('SheetJS (XLSX) not loaded');
            alert('Error: La librería de Excel no se ha cargado.');
            return;
        }

        // Preparar datos para Excel
        const rows = data.map(activity => ({
            'Actividad': activity.title,
            'Día (Actual)': activity.timeframes.daily.current,
            'Día (Anterior)': activity.timeframes.daily.previous,
            'Semana (Actual)': activity.timeframes.weekly.current,
            'Semana (Anterior)': activity.timeframes.weekly.previous,
            'Mes (Actual)': activity.timeframes.monthly.current,
            'Mes (Anterior)': activity.timeframes.monthly.previous
        }));

        // Crear Libro y Hoja
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);

        // Auto-width columns (Optional polish)
        const wscols = [
            { wch: 20 }, // Actividad
            { wch: 15 }, { wch: 15 },
            { wch: 15 }, { wch: 15 },
            { wch: 15 }, { wch: 15 }
        ];
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, "Reporte Horarios");

        // Descargar archivo .xlsx real
        XLSX.writeFile(wb, `Reporte_Actividades_${new Date().toISOString().split('T')[0]}.xlsx`);
    }

    /**
     * Exporta datos a CSV (Compatible con Google Sheets drag-drop)
     */
    exportToCSV() {
        const data = this.loadFromStorage();
        // Encabezados con BOM para caracteres latinos
        let csv = '\uFEFFActividad,Día (Actual),Día (Anterior),Semana (Actual),Semana (Anterior),Mes (Actual),Mes (Anterior)\n';

        data.forEach(activity => {
            const row = [
                `"${activity.title}"`, // Quote contents
                activity.timeframes.daily.current,
                activity.timeframes.daily.previous,
                activity.timeframes.weekly.current,
                activity.timeframes.weekly.previous,
                activity.timeframes.monthly.current,
                activity.timeframes.monthly.previous
            ];
            csv += row.join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Reporte_Actividades_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Copia datos al portapapeles (Formato TSV para pegar directo en Excel/Sheets)
     */
    async copyToClipboard() {
        const data = this.loadFromStorage();
        // Usamos TAB (\t) como separador, es lo mejor para Copiar/Pegar en Sheets
        let tsv = 'Actividad\tDía (Actual)\tDía (Anterior)\tSemana (Actual)\tSemana (Anterior)\tMes (Actual)\tMes (Anterior)\n';

        data.forEach(activity => {
            const row = [
                activity.title,
                activity.timeframes.daily.current,
                activity.timeframes.daily.previous,
                activity.timeframes.weekly.current,
                activity.timeframes.weekly.previous,
                activity.timeframes.monthly.current,
                activity.timeframes.monthly.previous
            ];
            tsv += row.join('\t') + '\n';
        });

        // Intentar usar API moderna, fallback a método antiguo si falla (ej: http/file protocol)
        try {
            await navigator.clipboard.writeText(tsv);
            return true;
        } catch (err) {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = tsv;
            textarea.style.position = 'fixed'; // Avoid scrolling to bottom
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                document.body.removeChild(textarea);
                return true;
            } catch (ex) {
                console.error('Copy failed', ex);
                document.body.removeChild(textarea);
                return false;
            }
        }
    }

    /**
     * Importa datos desde JSON
     */
    async importFromJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    this.saveToStorage(data);
                    resolve({ success: true, data });
                } catch (error) {
                    reject({ success: false, message: 'Error al parsear JSON' });
                }
            };

            reader.onerror = () => {
                reject({ success: false, message: 'Error al leer archivo' });
            };

            reader.readAsText(file);
        });
    }

    /**
     * Resetea todos los datos a valores por defecto
     */
    async resetData() {
        localStorage.removeItem(this.STORAGE_KEY);
        return await this.loadDefaultData();
    }

    /**
     * Registra una sesión de tiempo (para el timer)
     * NOTA: Esta función solo registra la sesión, NO suma las horas automáticamente
     */
    async logTimeSession(activityTitle, hours, date = new Date()) {
        const sessionsKey = `${this.STORAGE_KEY}-sessions`;
        let sessions = [];

        try {
            const stored = localStorage.getItem(sessionsKey);
            sessions = stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error cargando sesiones:', error);
        }

        const session = {
            id: Date.now(),
            activity: activityTitle,
            hours: hours,
            date: date.toISOString(),
            timestamp: Date.now()
        };

        sessions.push(session);
        localStorage.setItem(sessionsKey, JSON.stringify(sessions));

        return session;
    }

    /**
     * Obtiene el historial de sesiones
     */
    getTimeSessions(activityTitle = null, startDate = null, endDate = null) {
        const sessionsKey = `${this.STORAGE_KEY}-sessions`;
        let sessions = [];

        try {
            const stored = localStorage.getItem(sessionsKey);
            sessions = stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error cargando sesiones:', error);
            return [];
        }

        // Filtrar por actividad si se especifica
        if (activityTitle) {
            sessions = sessions.filter(s => s.activity === activityTitle);
        }

        // Filtrar por rango de fechas si se especifica
        if (startDate || endDate) {
            sessions = sessions.filter(s => {
                const sessionDate = new Date(s.date);
                if (startDate && sessionDate < startDate) return false;
                if (endDate && sessionDate > endDate) return false;
                return true;
            });
        }

        return sessions;
    }
}

// Exportar instancia única
const dataManager = new DataManager();
export default dataManager;
