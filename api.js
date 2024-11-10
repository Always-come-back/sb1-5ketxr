import axios from 'axios';

const API_URL = 'http://localhost:3001';

export const api = {
    async getUsers() {
        const response = await axios.get(`${API_URL}/users`);
        return response.data;
    },

    async createUser(user) {
        const response = await axios.post(`${API_URL}/users`, user);
        return response.data;
    },

    async getMessages() {
        const response = await axios.get(`${API_URL}/messages`);
        return response.data;
    },

    async createMessage(message) {
        const response = await axios.post(`${API_URL}/messages`, message);
        return response.data;
    }
};