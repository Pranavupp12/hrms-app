import { io } from 'socket.io-client';

// Use an environment variable for the URL in production
const URL = 'http://192.168.1.67:5001';

export const socket = io(URL);