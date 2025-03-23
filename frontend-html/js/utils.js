// Constants
const BASE = 'https://api.semanticscholar.org/v1/paper/';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Color utility functions
export function getColor() {
    const hue = Math.random();
    const saturation = 0.5 + Math.random() * 0.5;
    const lightness = 0.3 + Math.random() * 0.2;
    return [hue, saturation, lightness];
}

export function hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [
        Math.round(r * 255),
        Math.round(g * 255),
        Math.round(b * 255)
    ];
}

export function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

// Screen position utility
export function getScreenPosition(point, camera) {
    const vector = point.clone().project(camera);
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
    return { x, y };
}

// Paper data caching
const locationCache = new Map();

export function getLocationData(id, callback) {
    // Check cache first
    const cached = locationCache.get(id);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        callback(cached.data);
        return;
    }

    // Fetch from API
    fetch(`/api/location/${id}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Cache the result
            locationCache.set(id, {
                data: data,
                timestamp: Date.now()
            });
            callback(data);
        })
        .catch(error => {
            console.error('Error fetching location data:', error);
            callback(null);
        });
}

// Cache cleanup
export function cleanupCache() {
    const now = Date.now();
    
    // Clean paper cache
    for (const [id, data] of paperCache.entries()) {
        if (now - data.timestamp > CACHE_DURATION) {
            paperCache.delete(id);
        }
    }
    
    // Clean location cache
    for (const [id, data] of locationCache.entries()) {
        if (now - data.timestamp > CACHE_DURATION) {
            locationCache.delete(id);
        }
    }
}

// Run cleanup every hour
setInterval(cleanupCache, 60 * 60 * 1000);

// Location cache for spatial queries
const searchDelta = 5;

export function findPoint(point, delta) {
    for (const [location, data] of locationCache) {
        if (
            (location.x - delta < point.x && point.x < location.x + delta) &&
            (location.y - delta < point.y && point.y < location.y + delta) &&
            (location.z - delta < point.z && point.z < location.z + delta)
        ) {
            return { location, data };
        }
    }
    return null;
}

let lastResult = null;

export function searchArea(x, y, z, callback) {
    const pos = { x, y, z };
    const nearestQuery = findPoint(pos, searchDelta);
    
    if (nearestQuery) {
        if (nearestQuery.location !== lastResult) {
            callback(nearestQuery.data);
            lastResult = nearestQuery.location;
        }
        return;
    }

    lastResult = pos;

    $.ajax({
        url: `${BASE}/location`,
        method: "GET",
        crossDomain: true,
        data: { x, y, z, delt: 15 },
        success: (resp) => {
            const parsedResp = JSON.parse(resp);
            locationCache.push([pos, parsedResp]);
            callback(parsedResp);
        }
    });
} 