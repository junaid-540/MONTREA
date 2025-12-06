let currentItemId = null;
let currentAction = null;


const cancelModal = new bootstrap.Modal(document.getElementById('cancelModal'));
const returnModal = new bootstrap.Modal(document.getElementById('returnModal'));


function openCancelModal(itemId, itemName) {
    currentItemId = itemId;
    currentAction = 'cancel';
    
    const targetType = itemId ? 'item' : 'order';
    document.getElementById('cancelTargetName').textContent = itemName;
    document.getElementById('cancelTargetType').textContent = targetType;
    document.getElementById('cancelReason').value = '';
    
    cancelModal.show();
}


function openReturnModal(itemId, itemName) {
    currentItemId = itemId;
    currentAction = 'return';
    
    document.getElementById('returnItemName').textContent = itemName;
    document.getElementById('returnReason').value = '';
    document.querySelector('#returnReason').classList.remove('is-invalid');
    
    returnModal.show();
}

// Confirm Cancel
document.getElementById('confirmCancelBtn').addEventListener('click', async () => {
    const reason = document.getElementById('cancelReason').value.trim();
    const orderId = getOrderIdFromUrl();
    
    try {
        const response = await axios.post(`/orders/${orderId}/cancel`, {
            itemId: currentItemId,
            reason: reason
        });
        
        if (response.data.success) {
            cancelModal.hide();
            showToast('success', response.data.message);
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showToast('error', response.data.message || 'Failed to cancel order');
        }
    } catch (error) {
        console.error('Cancel error:', error);
        
       
        if (error.response && error.response.data) {
            showToast('error', error.response.data.message || 'Failed to cancel order');
        } else {
            showToast('error', 'Something went wrong. Please try again.');
        }
    }
});

// Confirm Return
document.getElementById('confirmReturnBtn').addEventListener('click', async () => {
    const reason = document.getElementById('returnReason').value.trim();
    const reasonInput = document.querySelector('#returnReason');
    
    // Validate reason is required
    if (!reason) {
        reasonInput.classList.add('is-invalid');
        return;
    }
    
    reasonInput.classList.remove('is-invalid');
    const orderId = getOrderIdFromUrl();
    
    try {
        const response = await axios.post(`/orders/${orderId}/return`, {
            itemId: currentItemId,
            reason: reason
        });
        
        
        if (response.data.success) {
            returnModal.hide();
            showToast('success', response.data.message);
            
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showToast('error', response.data.message || 'Failed to submit return request');
        }
    } catch (error) {
        console.error('Return error:', error);
        
        if (error.response && error.response.data) {
            showToast('error', error.response.data.message || 'Failed to submit return request');
        } else {
            showToast('error', 'Something went wrong. Please try again.');
        }
    }
});

// Download Invoice
async function downloadInvoice(orderId) {
    
    if (window.orderStatus !== 'Delivered' && !window.hasReturn) {
        showToast('warning', 'Invoice can only be downloaded for delivered or returned orders.');
        return;
    }

    try {
        showToast('info', 'Generating invoice...');
        
        const response = await axios.get(`/order/${orderId}/invoice`, {
            responseType: 'blob' 
        });
        
        // Create blob URL and trigger download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${orderId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast('success', 'Invoice downloaded successfully');
    } catch (error) {
        console.error('Invoice download error:', error);
        
        
        if (error.response && error.response.data) {
            // For blob responses, we need to parse the error message
            if (error.response.data instanceof Blob) {
                const text = await error.response.data.text();
                try {
                    const data = JSON.parse(text);
                    showToast('error', data.message || 'Failed to download invoice');
                } catch {
                    showToast('error', 'Failed to download invoice');
                }
            } else {
                showToast('error', error.response.data.message || 'Failed to download invoice');
            }
        } else {
            showToast('error', 'Something went wrong. Please try again.');
        }
    }
}

// Helper: Get Order ID from URL
function getOrderIdFromUrl() {
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 1];
}

// Helper: Show Toast
function showToast(type, message) {
    let bgColor;
    switch (type) {
        case 'error':
            bgColor = "linear-gradient(to right, #ff6b6b, #ee5a24)";
            break;
        case 'success':
            bgColor = "linear-gradient(to right, #00b09b, #96c93d)";
            break;
        case 'warning':
            bgColor = "linear-gradient(to right, #ffa726, #ff7043)";
            break;
        case 'info':
            bgColor = "linear-gradient(to right, #2196f3, #21cbf3)";
            break;
        default:
            bgColor = "linear-gradient(to right, #2196f3, #21cbf3)";
    }
    
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: bgColor,
        stopOnFocus: true,
    }).showToast();
}

// Clear validation on input
document.getElementById('returnReason').addEventListener('input', function() {
    if (this.value.trim()) {
        this.classList.remove('is-invalid');
    }
});