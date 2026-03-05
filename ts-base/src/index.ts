// src/index.ts
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

// Example: call a dummy API using a key from .env
const API_URL = process.env.API_URL || "https://jsonplaceholder.typicode.com/todos/1";
const API_KEY = process.env.API_KEY || ""; // optional

async function callApi() {
    try {
        const response = await fetch(API_URL, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                ...(API_KEY && { "Authorization": `Bearer ${API_KEY}` })
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        console.log("✅ API response:", data);
    } catch (err) {
        console.error("❌ API call failed:", err);
    }
}

callApi();
