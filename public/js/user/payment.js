// Toast Helper
function showToast(text, type = 'info') {
    const bgColor = {
        success: "linear-gradient(to right, #00b09b, #96c93d)",
        error: "linear-gradient(to right, #ff6b6b, #ee5a24)",
        warning: "linear-gradient(to right, #ffa726, #ff7043)",
        info: "linear-gradient(to right, #2196f3, #21cbf3)"
    }[type] || "linear-gradient(to right, #2196f3, #21cbf3)";
    
    Toastify({
        text,
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: bgColor,
        stopOnFocus: true,
    }).showToast();
}

document.addEventListener('DOMContentLoaded', function() {
    const placeOrderBtn = document.getElementById('placeOrderBtn');

    // Payment method selection
    document.querySelectorAll('.payment-method:not(.disabled)').forEach(method => {
        method.addEventListener('click', function() {
            document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
            this.classList.add('active');
            this.querySelector('input[type="radio"]').checked = true;
        });
    });

    // Prevent clicking on disabled methods
    document.querySelectorAll('.payment-method.disabled').forEach(method => {
        method.addEventListener('click', function(e) {
            e.preventDefault();
            showToast('This payment method is coming soon!', 'info');
        });
    });

    // Place order handler
    placeOrderBtn.addEventListener('click', async function() {
        // Get selected payment method
        const selectedMethodInput = document.querySelector('input[name="payment_method"]:checked');
        
        if (!selectedMethodInput) {
            showToast('Please select a payment method', 'warning');
            return;
        }

        const paymentMethod = selectedMethodInput.value;
        
        if (paymentMethod !== 'cod') {
            showToast('This payment method is not available yet', 'warning');
            return;
        }

        // Confirm order placement
        const result = await Swal.fire({
            title: 'Confirm Order',
            text: 'Are you sure you want to place this order with Cash on Delivery?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#111',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, Place Order',
            cancelButtonText: 'Cancel',
            scrollbarPadding: false,
            heightAuto: false
        });

        if (!result.isConfirmed) {
            return;
        }

        // Disable button and show loading state
        placeOrderBtn.disabled = true;
        placeOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Processing...';

        try {
            const response = await axios.post('/payment/place-order', {
                paymentMethod: 'COD'
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.success) {
                showToast('Order placed successfully!', 'success');
                
                const orderId = response.data.orderId || response.data.data?.orderId

                // Redirect to order success page
                setTimeout(() => {
                    window.location.href = `/order-success/${orderId}`;
                }, 1000);
            } else {
                showToast(response.data.message || 'Failed to place order', 'error');
                placeOrderBtn.disabled = false;
                placeOrderBtn.innerHTML = 'Place Order';
            }
        } catch (error) {
            console.error('Error placing order:', error);
            showToast(error.response?.data?.message || 'An error occurred while placing the order', 'error');
            placeOrderBtn.disabled = false;
            placeOrderBtn.innerHTML = 'Place Order';
        }
    });
});