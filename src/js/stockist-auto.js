// Background watcher for Stockist ID Auto-Fill
let lastCheckedName = '';
let lastCheckedMobile = '';

setInterval(async () => {
    const nameInput = document.getElementById('cust-name');
    const mobileInput = document.getElementById('cust-mobile');
    const stockistInput = document.getElementById('stockist-id');

    if (!nameInput || !mobileInput || !stockistInput) return;

    const currentName = nameInput.value.trim();
    const currentMobile = mobileInput.value.trim();

    // If the name or mobile changed, and we have a name
    if ((currentName !== lastCheckedName || currentMobile !== lastCheckedMobile) && currentName !== '') {
        lastCheckedName = currentName;
        lastCheckedMobile = currentMobile;

        // Check if the stockist field is enabled (meaning it's a stockist customer)
        if (!stockistInput.disabled && typeof autoFetchStockistId === 'function') {
            const id = await autoFetchStockistId(currentName, currentMobile);
            if (id) {
                stockistInput.value = id;
                console.log('✅ Zero-Touch Auto-fill: Stockist ID set to', id);
            }
        }
    }
}, 500); // Checks every 500ms
