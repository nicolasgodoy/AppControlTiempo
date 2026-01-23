import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, collection, getDocs, deleteDoc, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA2WaLLzZliRRkBcrLE-MQ9iV0Ms6ewVdE",
    authDomain: "controldeactividades-3dc8c.firebaseapp.com",
    projectId: "controldeactividades-3dc8c",
    storageBucket: "controldeactividades-3dc8c.firebasestorage.app",
    messagingSenderId: "999503614332",
    appId: "1:999503614332:web:699406c5d27a0e7e6b54f9",
    measurementId: "G-H65NY0Q1QC"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- CONFIGURACIÓN DE MODO ---
// MODO PRODUCCIÓN: ES_MODO_LOCAL = false (Usa Firebase Cloud)
// MODO DESARROLLO: ES_MODO_LOCAL = true  (Usa data.json y localStorage)
const ES_MODO_LOCAL = false;

class DataManager {
    constructor() {
        this.currentUser = null;
        this.dataCache = null;
        this.unsubscribe = null;
        this.syncCallbacks = [];
        this.isLocalMode = ES_MODO_LOCAL;
    }

    setLocalMode(value) {
        this.isLocalMode = value;
    }

    // --- GESTIÓN DE USUARIOS EN LA NUBE ---

    async getAllUsersFromCloud() {
        try {
            const querySnapshot = await getDocs(collection(db, "usuarios"));
            const users = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                users.push({
                    name: doc.id,
                    hasPin: !!data.pin
                });
            });
            return users;
        } catch (error) {
            return [];
        }
    }

    async createUserInCloud(username, ownerToken) {
        if (!username) return { success: false, message: "Nombre vacío" };
        try {
            const docRef = doc(db, "usuarios", username);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) return { success: false, message: "El usuario ya existe" };

            const defaultData = await this.loadDefaultData();
            await setDoc(docRef, {
                actividades: defaultData,
                ownerToken: ownerToken,
                createdAt: new Date().toISOString()
            });
            return { success: true, user: { name: username } };
        } catch (error) {
            return { success: false, message: "Error al crear en Firebase" };
        }
    }

    async getUserMetadata(username) {
        if (!username) return null;
        try {
            const docRef = doc(db, "usuarios", username);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    ownerToken: data.ownerToken || null
                };
            }
            return null;
        } catch (error) {
            return null;
        }
    }


    async deleteUserInCloud(username) {
        if (!username) return false;
        try {
            const docRef = doc(db, "usuarios", username);
            await deleteDoc(docRef);
            console.log(`🗑️ Usuario ${username} eliminado de Firebase`);
            return true;
        } catch (error) {
            return false;
        }
    }

    // --- SINCRONIZACIÓN Y DATOS ---

    async setUser(username) {
        this.currentUser = username;
        this.startRealtimeSync();
        return true;
    }

    async startRealtimeSync() {
        if (this.isLocalMode || !this.currentUser) return;

        if (this.unsubscribe) this.unsubscribe();

        const docRef = doc(db, "usuarios", this.currentUser);
        this.unsubscribe = onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data().actividades;
                this.dataCache = data;
                this.notifySync(data);
            }
        }, (error) => {
            // Error en tiempo real silenciado
        });
    }

    onDataSync(callback) {
        this.syncCallbacks.push(callback);
    }

    notifySync(data) {
        this.syncCallbacks.forEach(cb => cb(data));
    }

    async getData() {
        let data = [];
        let metadata = null;

        // --- MODO LOCAL ---
        if (this.isLocalMode) {
            const localData = localStorage.getItem('local_activities');
            if (localData) {
                try {
                    data = JSON.parse(localData);
                } catch (e) { console.error("Error al parsear local_activities", e); }
            } else {
                data = await this.loadDefaultData();
                if (!data || data.length === 0) data = this.getHardcodedFallback();
            }
            // Metadata local simulada
            metadata = { lastUpdate: localStorage.getItem('local_last_update') };
        } else {
            // --- MODO PRODUCCIÓN (FIREBASE) ---
            if (!this.currentUser) return [];
            try {
                const docRef = doc(db, "usuarios", this.currentUser);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const docData = docSnap.data();
                    data = docData.actividades || [];
                    metadata = { lastUpdate: docData.lastUpdate };
                }
            } catch (error) {
                console.error("Error al obtener datos de Firebase:", error);
                return [];
            }
        }

        // Aplicar lógica de reset/rollover si es necesario
        const modified = this.checkAndResetTimeframes(data, metadata);
        this.dataCache = data;
        this.migrateNotesFormat();

        if (modified) {
            await this.saveToCloud(data);
        }

        return data;
    }

    /**
     * Verifica si ha cambiado el día/semana/mes y realiza el rollover de horas.
     */
    checkAndResetTimeframes(data, metadata) {
        if (!metadata || !metadata.lastUpdate || !data || data.length === 0) return false;

        const lastDate = new Date(metadata.lastUpdate);
        const nowDate = new Date();

        // Si es el mismo día, no hacemos nada
        if (lastDate.toDateString() === nowDate.toDateString()) return false;

        let needsUpdate = false;

        // Diferencias
        const isNewDay = lastDate.toDateString() !== nowDate.toDateString();
        const isNewMonth = lastDate.getMonth() !== nowDate.getMonth() || lastDate.getFullYear() !== nowDate.getFullYear();
        const isNewYear = lastDate.getFullYear() !== nowDate.getFullYear();

        data.forEach(activity => {
            if (!activity.timeframes) return;

            // Rollover Diario (Día anterior)
            if (isNewDay) {
                activity.timeframes.daily.previous = activity.timeframes.daily.current;
                activity.timeframes.daily.current = 0;
                needsUpdate = true;
            }

            // Rollover Mensual (Mes anterior)
            // Nota: El HTML usa 'Mes' para el ID del botón que dispara 'weekly'
            if (isNewMonth) {
                activity.timeframes.weekly.previous = activity.timeframes.weekly.current;
                activity.timeframes.weekly.current = 0;
                needsUpdate = true;
            }

            // Rollover Anual (Año anterior)
            // Nota: El HTML usa 'Anio' para el botón que dispara 'monthly'
            if (isNewYear) {
                activity.timeframes.monthly.previous = activity.timeframes.monthly.current;
                activity.timeframes.monthly.current = 0;
                needsUpdate = true;
            }
        });

        return needsUpdate;
    }

    async saveToCloud(data) {
        this.dataCache = data;
        const now = new Date().toISOString();

        // --- MODO LOCAL ---
        if (this.isLocalMode) {
            localStorage.setItem('local_activities', JSON.stringify(data));
            localStorage.setItem('local_last_update', now);
            this.notifySync(data);
            return true;
        }

        // --- MODO PRODUCCIÓN (FIREBASE) ---
        if (!this.currentUser) return false;
        try {
            const docRef = doc(db, "usuarios", this.currentUser);
            await setDoc(docRef, {
                actividades: data,
                lastUpdate: now
            }, { merge: true });
            this.notifySync(data); // Notificar cambios
            return true;
        } catch (error) {
            return false;
        }
    }

    async loadDefaultData() {
        try {
            const response = await fetch('./data.json');
            if (!response.ok) throw new Error('No se pudo cargar data.json');
            return await response.json();
        } catch (e) {
            console.warn("Fallo carga de data.json, usando hardcoded fallback. (Tip: Usar un servidor local como Live Server)");
            return [];
        }
    }

    getHardcodedFallback() {
        return [
            { "title": "Trabajo", "timeframes": { "daily": { "current": 5, "previous": 7 }, "weekly": { "current": 32, "previous": 36 }, "monthly": { "current": 103, "previous": 128 } } },
            { "title": "Juego", "timeframes": { "daily": { "current": 1, "previous": 2 }, "weekly": { "current": 10, "previous": 8 }, "monthly": { "current": 23, "previous": 29 } } },
            { "title": "Estudio", "timeframes": { "daily": { "current": 3, "previous": 1 }, "weekly": { "current": 6, "previous": 7 }, "monthly": { "current": 13, "previous": 19 } } }
        ];
    }

    migrateNotesFormat() {
        if (!this.dataCache) return;
        this.dataCache.forEach(activity => {
            ['daily', 'weekly', 'monthly'].forEach(period => {
                if (activity.timeframes && activity.timeframes[period]) {
                    if (activity.timeframes[period].note !== undefined) {
                        const oldNote = activity.timeframes[period].note;
                        activity.timeframes[period].notes = oldNote ? [{ text: oldNote, timestamp: new Date().toISOString() }] : [];
                        delete activity.timeframes[period].note;
                    }
                    if (!activity.timeframes[period].notes) {
                        activity.timeframes[period].notes = [];
                    }
                }
            });
        });
    }

    async addNoteToActivity(title, noteText) {
        if (!noteText.trim()) return false;
        const data = await this.getData();
        const activity = data.find(a => a.title === title);
        if (activity) {
            const timeframe = window.uiController ? window.uiController.currentTimeframe : 'daily';
            if (!activity.timeframes[timeframe].notes) {
                activity.timeframes[timeframe].notes = [];
            }
            activity.timeframes[timeframe].notes.unshift({
                text: noteText.trim(),
                timestamp: new Date().toISOString()
            });
            return await this.saveToCloud(data);
        }
        return false;
    }

    async deleteNoteFromActivity(title, noteTimestamp) {
        const data = await this.getData();
        const activity = data.find(a => a.title === title);
        if (activity) {
            const timeframe = window.uiController ? window.uiController.currentTimeframe : 'daily';
            if (activity.timeframes[timeframe].notes) {
                activity.timeframes[timeframe].notes = activity.timeframes[timeframe].notes.filter(n => n.timestamp !== noteTimestamp);
                return await this.saveToCloud(data);
            }
        }
        return false;
    }

    async getSessions() {
        if (this.isLocalMode) {
            const localSessions = localStorage.getItem('local_sessions');
            return localSessions ? JSON.parse(localSessions) : [];
        }

        if (!this.currentUser) return [];
        try {
            const docRef = doc(db, "usuarios", this.currentUser);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data().sesiones || [];
            }
        } catch (error) {
            console.error("Error al obtener sesiones:", error);
        }
        return [];
    }

    async logTimeSession(activityTitle, hours, note = "") {
        const sessionData = {
            activity: activityTitle,
            hours: hours,
            note: note,
            timestamp: new Date().toISOString()
        };

        const data = await this.getData();
        const activity = data.find(a => a.title === activityTitle);

        if (this.isLocalMode) {
            // Log for history table
            const localSessions = await this.getSessions();
            localSessions.push(sessionData);
            localStorage.setItem('local_sessions', JSON.stringify(localSessions));

            // Append to activity internal notes if present
            if (activity && note.trim()) {
                const timeframe = window.uiController ? window.uiController.currentTimeframe : 'daily';
                if (!activity.timeframes[timeframe].notes) activity.timeframes[timeframe].notes = [];
                activity.timeframes[timeframe].notes.unshift({ text: note.trim(), timestamp: new Date().toISOString() });
                await this.saveToCloud(data);
            }
            return true;
        }

        if (!this.currentUser) return false;
        try {
            const docRef = doc(db, "usuarios", this.currentUser);
            // Add to session log
            await updateDoc(docRef, {
                sesiones: arrayUnion(sessionData)
            });

            // Append to activity internal notes if present
            if (activity && note.trim()) {
                const timeframe = window.uiController ? window.uiController.currentTimeframe : 'daily';
                if (!activity.timeframes[timeframe].notes) activity.timeframes[timeframe].notes = [];
                activity.timeframes[timeframe].notes.unshift({ text: note.trim(), timestamp: new Date().toISOString() });
                await this.saveToCloud(data);
            }
            return true;
        } catch (error) {
            return false;
        }
    }

    // --- ACCIONES DE ACTIVIDAD ---

    async addHoursToActivity(title, timeframe, hours) {
        const data = await this.getData();
        const activity = data.find(a => a.title === title);
        if (activity) {
            activity.timeframes[timeframe].current += hours;
            return await this.saveToCloud(data);
        }
        return false;
    }

    async deleteActivity(title) {
        const data = await this.getData();
        const filtered = data.filter(a => a.title !== title);
        return await this.saveToCloud(filtered);
    }

    async addActivity(activity) {
        const data = await this.getData();
        data.push(activity);
        return await this.saveToCloud(data);
    }

    // --- EXPORTACIÓN ---

    async copyToClipboard() {
        try {
            const data = await this.getData();
            if (!data || data.length === 0) return false;

            // Header
            let tsv = "Actividad\tDía (hrs)\tMes (hrs)\tAño (hrs)\n";

            // Rows
            data.forEach(activity => {
                const daily = activity.timeframes.daily.current.toFixed(2);
                const monthly = activity.timeframes.weekly.current.toFixed(2); // Usando 'weekly' como Mes por consistencia con el HTML
                const yearly = activity.timeframes.monthly.current.toFixed(2); // Usando 'monthly' como Año por consistencia con el HTML
                tsv += `${activity.title}\t${daily}\t${monthly}\t${yearly}\n`;
            });

            await navigator.clipboard.writeText(tsv);
            return true;
        } catch (error) {
            console.error("Error al copiar al portapapeles:", error);
            return false;
        }
    }

    async exportToExcel() {
        try {
            const data = await this.getData();
            if (!data || data.length === 0) return false;

            // Preparar datos para XLSX
            const rows = data.map(activity => ({
                "Actividad": activity.title,
                "Día (hrs)": activity.timeframes.daily.current,
                "Mes (hrs)": activity.timeframes.weekly.current,
                "Año (hrs)": activity.timeframes.monthly.current
            }));

            // Crear libro y hoja
            const worksheet = XLSX.utils.json_to_sheet(rows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Actividades");

            // Generar archivo y descargar
            XLSX.writeFile(workbook, `Reporte_Tiempo_${new Date().toISOString().split('T')[0]}.xlsx`);
            return true;
        } catch (error) {
            console.error("Error al exportar a Excel:", error);
            alert("Error al exportar a Excel. Asegúrate de que la librería XLSX esté cargada.");
            return false;
        }
    }
}

const dataManager = new DataManager();
export default dataManager;