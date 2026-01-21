import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

class DataManager {
    constructor() {
        this.currentUser = null;
        this.dataCache = null; // cache en memoria
        this.unsubscribe = null;
        this.syncCallbacks = [];
    }

    async setUser(username) {
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        this.currentUser = username;
        this.dataCache = null;

        await this.getData();
        this.startRealtimeSync();

        return true;
    }

    startRealtimeSync() {
        if (!this.currentUser) return;

        const docRef = doc(db, "usuarios", this.currentUser);

        this.unsubscribe = onSnapshot(
            docRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    this.dataCache = docSnap.data().actividades;
                    console.log("✓ Datos sincronizados desde Firebase");
                    this.notifySync();
                }
            },
            (error) => {
                console.error("Error en listener de Firestore:", error);
            }
        );
    }

    notifySync() {
        this.syncCallbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error("Error en callback de sincronización:", error);
            }
        });
    }

    onDataSync(callback) {
        this.syncCallbacks.push(callback);
        return () => {
            this.syncCallbacks = this.syncCallbacks.filter(cb => cb !== callback);
        };
    }

    async getData() {
        if (!this.currentUser) return [];

        if (this.dataCache) {
            return this.dataCache;
        }

        try {
            const docRef = doc(db, "usuarios", this.currentUser);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                this.dataCache = docSnap.data().actividades;
                return this.dataCache;
            } else {
                const defaultData = await this.loadDefaultData();
                await this.saveToCloud(defaultData);
                this.dataCache = defaultData;
                return defaultData;
            }
        } catch (error) {
            console.error("Error obteniendo datos de Firebase:", error);
            return this.dataCache || [];
        }
    }

    async saveToCloud(data) {
        if (!this.currentUser) return false;

        try {
            const docRef = doc(db, "usuarios", this.currentUser);
            await setDoc(docRef, {
                actividades: data,
                lastUpdate: new Date().toISOString()
            });

            this.dataCache = data;
            console.error("Error al guardar:", error); // <-- Esto te dirá si Firebase te bloqueó
            return true;
        } catch (error) {
            console.error("Error guardando en Firebase:", error);
            return false;
        }
    }

    async loadDefaultData() {
        try {
            const response = await fetch('./data.json');
            return await response.json();
        } catch (error) {
            console.error("Error cargando data.json:", error);
            return [];
        }
    }

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

    async addHoursToActivity(activityTitle, timeframe, hoursToAdd) {
        const data = await this.getData();
        const activity = data.find(item => item.title === activityTitle);

        if (activity && activity.timeframes[timeframe]) {
            activity.timeframes[timeframe].current += hoursToAdd;
            return await this.saveToCloud(data);
        }
        return false;
    }

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

    async deleteActivity(activityTitle) {
        const data = await this.getData();
        const filteredData = data.filter(item => item.title !== activityTitle);

        if (filteredData.length < data.length) {
            return await this.saveToCloud(filteredData);
        }
        return false;
    }

    async addActivity(activity) {
        const data = await this.getData();
        data.push(activity);
        return await this.saveToCloud(data);
    }

    async logTimeSession(activityTitle, hours) {
        return true;
    }

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

    disconnect() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        this.syncCallbacks = [];
    }
}

const dataManager = new DataManager();
export default dataManager;