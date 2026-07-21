let ws;
let activeLayer = 1;
let currentUrl = "";
let lastValidUrl = ""; // Keep last valid image
const img1 = document.getElementById("ppt-viewer-1");
const img2 = document.getElementById("ppt-viewer-2");

function transitionToLayer(layerNum) {
    const activeImg = layerNum === 1 ? img1 : img2;
    const inactiveImg = layerNum === 1 ? img2 : img1;

    activeImg.dataset.broken = "false";
    activeImg.classList.add("active");
    inactiveImg.classList.remove("active");
    activeLayer = layerNum;
}

function handleImageLoad(imgEl, layerNum) {
    // Successfully loaded - mark as valid and transition
    imgEl.dataset.broken = "false";
    lastValidUrl = imgEl.src;
    
    // Transition if this image is supposed to become active
    if (activeLayer !== layerNum) {
        transitionToLayer(layerNum);
    }
}

function handleImageError(imgEl, layerNum) {
    const src = imgEl.getAttribute("src");
    if (!src || src === "null" || src === "") {
        return; // Ignore empty/cleared sources
    }
    console.warn(`[PPT] Image layer ${layerNum} failed to load: ${src}`);
    imgEl.dataset.broken = "true";
    
    // If the active layer failed, hide it
    if (activeLayer === layerNum) {
        imgEl.classList.remove("active");
    }
}

img1.onload = () => handleImageLoad(img1, 1);
img1.onerror = () => handleImageError(img1, 1);

img2.onload = () => handleImageLoad(img2, 2);
img2.onerror = () => handleImageError(img2, 2);

function connectWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    ws = new WebSocket(protocol + "//" + window.location.host + "/ws");

    ws.onmessage = function (e) {
        const data = JSON.parse(e.data);
        if (data.action === "update_presentation" || data.type === "update_presentation") {
            const newUrl = data.payload.url || "";

            if (newUrl === currentUrl) {
                return; // Prevent duplicate reload/flicker
            }
            currentUrl = newUrl;

            if (newUrl) {
                const nextLayer = activeLayer === 1 ? img2 : img1;
                
                // Clear any leftover state before load
                nextLayer.dataset.broken = "false";
                
                // Load the new image - cache busting with timestamp
                const separator = newUrl.includes("?") ? "&" : "?";
                nextLayer.src = newUrl + separator + "t=" + new Date().getTime();
            } else {
                img1.classList.remove("active");
                img2.classList.remove("active");
                setTimeout(() => {
                    img1.removeAttribute("src");
                    img2.removeAttribute("src");
                    img1.dataset.broken = "false";
                    img2.dataset.broken = "false";
                }, 400);
            }
        }
    };
    ws.onclose = () => {
        console.warn("[PPT] WebSocket closed, keeping last valid image");
        setTimeout(connectWebSocket, 2000);
    };
}
connectWebSocket();
