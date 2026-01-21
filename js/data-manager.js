import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Tu configuración (Cópiala de Firebase Console)
const firebaseConfig = {
    apiKey: "AIzaSyA2WaLLzZliRRkBcrLE-MQ9iV0Ms6ewVdE",
    authDomain: "controldeactividades-3dc8c.firebaseapp.com",
    projectId: "controldeactividades-3dc8c",
    storageBucket: "controldeactividades-3dc8c.firebasestorage.app",
    messagingSenderId: "999503614332",
    appId: "1:999503614332:web:699406c5d27a0e7e6b54f9",
    measurementId: "G-H65NY0Q1QC"
};

// 2. Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

class DataManager {
    constructor() {
        this.currentUser = null;
        this.dataCache = null; // Cache en memoria
        this.lastFetch = 0;
        this.cacheDuration = 3000; // 3 segundos de caché
        this.syncInProgress = false;
    }

    /**
     * Establece el usuario y prepara la conexión
     */
    async setUser(username) {
        this.currentUser = username;
        this.dataCache = null; // Limpiar caché al cambiar usuario
        this.lastFetch = 0;
        // Al cambiar de usuario, intentamos asegurar que existan datos en la nube
        await this.getData();
        return true;
    }

    /**
     * Obtiene los datos de Firestore con caché inteligente
     */
    async getData() {
        if (!this.currentUser) return [];

        // Si tenemos datos en caché y no ha pasado el tiempo, devolvemos caché
        const now = Date.now();
        if (this.dataCache && (now - this.lastFetch) < this.cacheDuration) {
            return this.dataCache;
        }

        try {
            const docRef = doc(db, "usuarios", this.currentUser);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                // Si el usuario ya tiene datos en la nube, los devolvemos
                this.dataCache = docSnap.data().actividades;
                this.lastFetch = now;
                return this.dataCache;
            } else {
                // Si es un usuario nuevo, cargamos el JSON por defecto y lo subimos
                const defaultData = await this.loadDefaultData();
                await this.saveToCloud(defaultData);
                this.dataCache = defaultData;
                this.lastFetch = now;
                return defaultData;
            }
        } catch (error) {
            console.error("Error obteniendo datos de Firebase:", error);
            // Si hay error pero tenemos caché, devolvemos el caché
            return this.dataCache || [];
        }
    }

    /**
     * Guarda los datos en Firestore y actualiza el caché
     */
    async saveToCloud(data) {
        if (!this.currentUser) return false;

        // Evitar sincronizaciones concurrentes
        if (this.syncInProgress) {
            console.warn("Sincronización en progreso, esperando...");
            return false;
        }

        this.syncInProgress = true;
        try {
            const docRef = doc(db, "usuarios", this.currentUser);
            await setDoc(docRef, {
                actividades: data,
                lastUpdate: new Date().toISOString()
            });

            // Actualizar caché localmente de inmediato
            this.dataCache = data;
            this.lastFetch = Date.now();
            return true;
        } catch (error) {
            console.error("Error guardando en Firebase:", error);
            return false;
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Carga datos iniciales desde el archivo local
     */
    async loadDefaultData() {
        try {
            const response = await fetch('./data.json');
            return await response.json();
        } catch (error) {
            console.error("Error cargando data.json:", error);
            return [];
        }
    }

    /**
     * Actualiza las horas (Ahora guarda en la nube automáticamente)
     */
    async updateActivityHours(activityTitle, timeframe, current, previous) {
        const data = await this.getData();
        const activity = data.find(item => item.title === activityTitle);

        if (activity && activity.timeframes[timeframe]) {
            activity.timeframes[timeframe].current = current;
            activity.timeframes[timeframe].previous = previous;
            return await this.saveToCloud(data);
        }
        return false;
    }

    /**
     * Agrega horas a una actividad
     */
    async addHoursToActivity(activityTitle, timeframe, hoursToAdd) {
        const data = await this.getData();
        const activity = data.find(item => item.title === activityTitle);

        if (activity && activity.timeframes[timeframe]) {
            activity.timeframes[timeframe].current += hoursToAdd;
            return await this.saveToCloud(data);
        }
        return false;
    }

    /**
     * Crea una nueva categoría
     */
    async createActivity(title, color) {
        const data = await this.getData();
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
        const success = await this.saveToCloud(data);
        return { success, activity: newActivity };
    }

    /**
     * Elimina una actividad
     */
    async deleteActivity(activityTitle) {
        const data = await this.getData();
        const filteredData = data.filter(item => item.title !== activityTitle);

        if (filteredData.length < data.length) {
            return await this.saveToCloud(filteredData);
        }
        return false;
    }

    /**
     * Agrega una nueva actividad
     */
    async addActivity(activity) {
        const data = await this.getData();
        data.push(activity);
        return await this.saveToCloud(data);
    }

    /**
     * Registra una sesión de tiempo (opcional, para historial)
     */
    async logTimeSession(activityTitle, hours) {
        // Por ahora, solo guardamos los datos principales
        // Si quieres historial detallado, necesitarías una colección extra
        return true;
    }

    /**
     * Invalida el caché forzando recarga desde Firebase
     */
    async invalidateCache() {
        this.dataCache = null;
        this.lastFetch = 0;
        return await this.getData();
    }

    /**
     * Exporta datos a JSON
     */
    async exportToJSON() {
        const data = await this.getData();
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup-${this.currentUser}-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }
}

const dataManager = new DataManager();
export default dataManager;