
document.querySelectorAll('.qty-decrease').forEach(btn => {
    btn.addEventListener('click', async function() {
        const form = this.closest('.qty-form');
        const input = form.querySelector('input[name="quantity"]');
        const currentQty = parseInt(input.value);
        
        if (currentQty > 1) {
            const newQty = currentQty - 1;
            await updateCartQuantity(form, newQty);
        } else {
            Toastify({
                text: "Minimum quantity is 1",
                duration: 2000,
                gravity: "top",
                position: "right",
                backgroundColor: "linear-gradient(to right, #ff6b6b, #ee5a24)",
            }).showToast();
        }
    });
});


document.querySelectorAll('.qty-increase').forEach(btn => {
    btn.addEventListener('click', async function() {
        const form = this.closest('.qty-form');
        const input = form.querySelector('input[name="quantity"]');
        const currentQty = parseInt(input.value);
        const maxQty = parseInt(this.dataset.max);
        
        if (currentQty < maxQty) {
            const newQty = currentQty + 1;
            await updateCartQuantity(form, newQty);
        } else {
            const limitReason = maxQty === 5 ? "cart limit" : "available stock";
            Toastify({
                text: `Maximum quantity is ${maxQty} (${limitReason})`,
                duration: 3000,
                gravity: "top",
                position: "right",
                style: {
                    background: "#f59e0b",
                }
            }).showToast();
        }
    });
});


async function updateCartQuantity(form, newQuantity) {
    const variantId = form.querySelector('input[name="productVariantId"]').value;
    
    // Disable buttons during request
    const decreaseBtn = form.querySelector('.qty-decrease');
    const increaseBtn = form.querySelector('.qty-increase');
    decreaseBtn.disabled = true;
    increaseBtn.disabled = true;
    
    try {
        const response = await axios.post('/cart/update', {
            productVariantId: variantId,
            quantity: newQuantity
        });

        if (response.data.success) {
            // Show success message
            Toastify({
                text: response.data.message || "Cart updated successfully",
                duration: 2000,
                gravity: "top",
                position: "right",
                backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
            }).showToast();
            
            // Reload page to show updated cart
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } else {
            // Show error message
            Toastify({
                text: response.data.message || "Failed to update cart",
                duration: 3000,
                gravity: "top",
                position: "right",
                backgroundColor: "linear-gradient(to right, #ff6b6b, #ee5a24)",
            }).showToast();
            
            // Re-enable buttons
            decreaseBtn.disabled = false;
            increaseBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error updating cart:', error);
        
        // Show error message from response or generic
        const errorMessage = error.response?.data?.message || "Failed to update cart";
        Toastify({
            text: errorMessage,
            duration: 3000,
            gravity: "top",
            position: "right",
            backgroundColor: "linear-gradient(to right, #ff6b6b, #ee5a24)",
        }).showToast();
        
        // Re-enable buttons
        decreaseBtn.disabled = false;
        increaseBtn.disabled = false;
    }
}


document.querySelectorAll('.remove-form').forEach(form => {
    form.addEventListener('submit', function(e) {
        e.preventDefault(); 
        
        const itemElement = this.closest('.item');
        const productName = itemElement.querySelector('h3').textContent;
        const variantId = this.querySelector('input[name="productVariantId"]').value;
        
        Swal.fire({
            title: 'Remove Item?',
            text: `Remove "${productName}" from your cart?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, remove it',
            cancelButtonText: 'Cancel',
            scrollbarPadding: false,
            heightAuto: false
        }).then(async (result) => {
            if (result.isConfirmed) {
                await removeFromCart(variantId);
            }
        });
    });
});


async function removeFromCart(variantId) {
    try {
        const response = await axios.post('/cart/remove', {
            productVariantId: variantId
        });

        if (response.data.success) {
            // Show success message
            Toastify({
                text: response.data.message || "Item removed from cart",
                duration: 3000,
                gravity: "top",
                position: "right",
                backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
            }).showToast();
            
            // Reload page to show updated cart
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } else {
            // Show error message
            Toastify({
                text: response.data.message || "Failed to remove item",
                duration: 3000,
                gravity: "top",
                position: "right",
                            backgroundColor: "linear-gradient(to right, #ff6b6b, #ee5a24)",

            }).showToast();
        }
    } catch (error) {
        console.error('Error removing from cart:', error);
        
        const errorMessage = error.response?.data?.message || "Failed to remove item";
        Toastify({
            text: errorMessage,
            duration: 3000,
            gravity: "top",
            position: "right",
            backgroundColor: "linear-gradient(to right, #ff6b6b, #ee5a24)",
        }).showToast();
    }
}


function clearInvalidItems() {
    const invalidItems = document.querySelectorAll('.item[data-invalid="true"]');
    
    if (invalidItems.length === 0) {
        Toastify({
            text: "No invalid items to remove",
            duration: 2000,
            gravity: "top",
            position: "right",
            style: {
                background: "#17a2b8",
            }
        }).showToast();
        return;
    }
    
    Swal.fire({
        title: 'Clear Invalid Items?',
        text: `This will remove ${invalidItems.length} unavailable item(s) from your cart.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, clear them',
        cancelButtonText: 'Cancel',
        scrollbarPadding: false,
        heightAuto: false
    }).then(async (result) => {
        if (result.isConfirmed) {
            await clearInvalidItemsRequest();
        }
    });
}


async function clearInvalidItemsRequest() {
    try {
        const response = await axios.post('/cart/clear-invalid');

        if (response.data.success) {
            Toastify({
                text: response.data.message || "Invalid items removed",
                duration: 3000,
                gravity: "top",
                position: "right",
                backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
            }).showToast();
            
            // Reload page
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } else {
            Toastify({
                text: response.data.message || "Failed to clear invalid items",
                duration: 3000,
                gravity: "top",
                position: "right",
                backgroundColor: "linear-gradient(to right, #ff6b6b, #ee5a24)",
            }).showToast();
        }
    } catch (error) {
        console.error('Error clearing invalid items:', error);
        
        const errorMessage = error.response?.data?.message || "Failed to clear invalid items";
        Toastify({
            text: errorMessage,
            duration: 3000,
            gravity: "top",
            position: "right",
            backgroundColor: "linear-gradient(to right, #ff6b6b, #ee5a24)",
        }).showToast();
    }
}


document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    
    if (success) {
        Toastify({
            text: success,
            duration: 3000,
            gravity: "top",
            position: "right",
            style: {
                background: "#28a745",
            }
        }).showToast();
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (error) {
        Toastify({
            text: error,
            duration: 3000,
            gravity: "top",
            position: "right",
            style: {
                background: "#dc3545",
            }
        }).showToast();
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});