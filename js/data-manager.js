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

class DataManager {
    constructor() {
        this.currentUser = null;
        this.dataCache = null;
        this.unsubscribe = null;
        this.syncCallbacks = [];
    }

    // --- GESTIÓN DE USUARIOS EN LA NUBE ---

    async getAllUsersFromCloud() {
        try {
            const querySnapshot = await getDocs(collection(db, "usuarios"));
            const users = [];
            querySnapshot.forEach((doc) => {
                users.push({ name: doc.id });
            });
            return users;
        } catch (error) {
            return [];
        }
    }

    async createUserInCloud(username) {
        if (!username) return { success: false, message: "Nombre vacío" };
        try {
            const docRef = doc(db, "usuarios", username);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) return { success: false, message: "El usuario ya existe" };

            const defaultData = await this.loadDefaultData();
            await setDoc(docRef, {
                actividades: defaultData,
                createdAt: new Date().toISOString()
            });
            return { success: true, user: { name: username } };
        } catch (error) {
            return { success: false, message: "Error al crear en Firebase" };
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

    startRealtimeSync() {
        if (!this.currentUser) return;
        if (this.unsubscribe) this.unsubscribe();

        const docRef = doc(db, "usuarios", this.currentUser);
        this.unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                this.dataCache = docSnap.data().actividades;
                this.notifySync(this.dataCache);
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
        if (!this.currentUser) return [];
        if (this.dataCache) return this.dataCache;

        const docRef = doc(db, "usuarios", this.currentUser);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            this.dataCache = docSnap.data().actividades;
            return this.dataCache;
        }
        return [];
    }

    async saveToCloud(data) {
        if (!this.currentUser) return false;
        try {
            const docRef = doc(db, "usuarios", this.currentUser);
            await setDoc(docRef, {
                actividades: data,
                lastUpdate: new Date().toISOString()
            }, { merge: true });
            this.dataCache = data;
            return true;
        } catch (error) {
            return false;
        }
    }

    async loadDefaultData() {
        try {
            const response = await fetch('./data.json');
            return await response.json();
        } catch (e) { return []; }
    }

    async logTimeSession(activityTitle, hours) {
        if (!this.currentUser) return false;
        try {
            const docRef = doc(db, "usuarios", this.currentUser);
            const sessionData = {
                activity: activityTitle,
                hours: hours,
                timestamp: new Date().toISOString()
            };

            await updateDoc(docRef, {
                sesiones: arrayUnion(sessionData)
            });
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
}

const dataManager = new DataManager();
export default dataManager;