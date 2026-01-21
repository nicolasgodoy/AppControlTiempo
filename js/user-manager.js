/**
 * UserManager - Gestiona la lista de usuarios y el usuario actual
 */
class UserManager {
    constructor() {
        this.USERS_KEY = 'activity-tracker-users';
        this.users = this.loadUsers();
    }

    /**
     * Carga usuarios desde LocalStorage
     */
    loadUsers() {
        try {
            const stored = localStorage.getItem(this.USERS_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error cargando usuarios:', error);
            return [];
        }
    }

    /**
     * Guarda la lista de usuarios
     */
    saveUsers() {
        localStorage.setItem(this.USERS_KEY, JSON.stringify(this.users));
    }

    /**
     * Obtiene todos los usuarios
     */
    getUsers() {
        return this.users;
    }

    /**
     * Crea un nuevo usuario
     */
    createUser(username) {
        if (!username || username.trim() === '') {
            return { success: false, message: 'El nombre no puede estar vacío' };
        }

        const trimmedName = username.trim();

        if (this.userExists(trimmedName)) {
            return { success: false, message: 'El usuario ya existe' };
        }

        const newUser = {
            id: Date.now().toString(),
            name: trimmedName,
            createdAt: new Date().toISOString()
        };

        this.users.push(newUser);
        this.saveUsers();
        return { success: true, user: newUser };
    }

    /**
     * Verifica si un usuario existe
     */
    userExists(username) {
        return this.users.some(u => u.name.toLowerCase() === username.toLowerCase());
    }

    /**
     * Elimina un usuario
     */
    deleteUser(username) {
        this.users = this.users.filter(u => u.name !== username);
        this.saveUsers();
        // Nota: No eliminamos los datos del usuario aquí por seguridad, 
        // pero idealmente deberíamos limpiar activity-tracker-data-{username}
        // Lo dejaremos así por ahora para prevenir pérdida accidental.
        return true;
    }
}

export default new UserManager();
