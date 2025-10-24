import { io } from "socket.io-client";

// Read the variable from the .env file
const URL = import.meta.env.VITE_BACKEND_URL; // <-- HERE

// Make sure to cast URL to string as env variables can be undefined
export const socket = io(String(URL));