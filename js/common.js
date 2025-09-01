const API_BASE = window.API_BASE || 'http://localhost:3000';

function setToken(t) { 
    localStorage.setItem('token', t); 
}

function getToken() { 
    return localStorage.getItem('token'); 
}

function clearToken() { 
    localStorage.removeItem('token'); 
}

function setUser(u) { 
    localStorage.setItem('user', JSON.stringify(u||null));
}

function getUser() {
    try { 
        return JSON.parse(localStorage.getItem('user') || 'null'); 
    } catch { 
        return null; 
    }
}

async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const res = await fetch(API_BASE + path, { ...options, headers });

    let data = null;
    try { 
        data = await res.json(); 
    } catch {}

    if (!res.ok) {
        const msg = data?.error || res.statusText;
        throw new Error(msg);
    }
    return data;
}

function requireAuth(){
    if (!getToken()) {
        location.href = 'login.html';
        return false;
    }
    return true;
}

function fmtYmd(date){
    const pad = n => String(n).padStart(2,'0');
    const year = date.getFullYear();
    const month = pad(date.getMonth()+1);
    const day = pad(date.getDate());
    return `${year}-${month}-${day}`;
}
