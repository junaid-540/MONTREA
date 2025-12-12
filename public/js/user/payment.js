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
    
    const razorpayKeyId = document.body.dataset.razorpayKey || '';

    document.querySelectorAll('.payment-method:not(.disabled)').forEach(method => {
        method.addEventListener('click', function() {
            document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
            this.classList.add('active');
            this.querySelector('input[type="radio"]').checked = true;
        });
    });

    document.querySelectorAll('.payment-method.disabled').forEach(method => {
        method.addEventListener('click', function(e) {
            e.preventDefault();
            showToast('This payment method is coming soon!', 'info');
        });
    });

    placeOrderBtn.addEventListener('click', async function() {
        
        const selectedMethodInput = document.querySelector('input[name="payment_method"]:checked');
        
        if (!selectedMethodInput) {
            showToast('Please select a payment method', 'warning');
            return;
        }

        const paymentMethod = selectedMethodInput.value;
        
        if (paymentMethod === 'cod') {
            await handleCODPayment();
        } else if (paymentMethod === 'razorpay') {
            await handleRazorpayPayment();
        } else {
            showToast('This payment method is not available yet', 'warning');
        }
    });

    async function handleCODPayment() {
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
                
                const orderId = response.data.orderId || response.data.data?.orderId;

                
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
    }

  
    async function handleRazorpayPayment() {
        
        placeOrderBtn.disabled = true;
        placeOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Validating Order...';

        try {
            
            const orderResponse = await axios.post('/payment/place-order', {
                paymentMethod: 'Razorpay'
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!orderResponse.data.success) {
                showToast(orderResponse.data.message || 'Failed to validate order', 'error');
                placeOrderBtn.disabled = false;
                placeOrderBtn.innerHTML = 'Place Order';
                return;
            }

            const { tempOrderId, amount } = orderResponse.data.data;

            placeOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Creating Payment...';
            
            const razorpayOrderResponse = await axios.post('/payment/create-razorpay-order', {
                tempOrderId: tempOrderId,  
                amount: amount
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000 // 10 second timeout for network issues
            });

            if (!razorpayOrderResponse.data.success) {
                // Check if it's a network error
                if (razorpayOrderResponse.data.statusCode === 503) {
                    showToast('Payment service temporarily unavailable. Please check your internet and try again.', 'error');
                } else {
                    showToast(razorpayOrderResponse.data.message || 'Failed to initiate payment', 'error');
                }
                placeOrderBtn.disabled = false;
                placeOrderBtn.innerHTML = 'Place Order';
                return;
            }

            const razorpayData = razorpayOrderResponse.data.data;
            
            const dbOrderId = razorpayData.orderId;
            
            placeOrderBtn.innerHTML = '<i class="fas fa-lock me-2"></i> Opening Payment Gateway...';
            
            
            const options = {
                key: razorpayData.keyId,
                amount: razorpayData.amount,
                currency: razorpayData.currency,
                name: 'Montrea',
                description: 'Order Payment',
                order_id: razorpayData.razorpayOrderId,
                handler: async function(response) {
                    // Payment success handler - use the actual DB orderId
                    await verifyPayment(response, dbOrderId);
                },
                prefill: {
                    name: '', // You can get from user data
                    email: '',
                    contact: ''
                },
                theme: {
                    color: '#111'
                },
                modal: {
                    ondismiss: function() {
                        handlePaymentCancellation(dbOrderId);
                    }
                }
            };

            const rzp = new Razorpay(options);
            
            rzp.on('payment.failed', function(response) {
                handlePaymentFailed(dbOrderId, response.error.description);
            });

            rzp.open();

            
            placeOrderBtn.disabled = false;
            placeOrderBtn.innerHTML = 'Place Order';

        } catch (error) {
            console.error('Error in Razorpay payment:', error);
            
            
            if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
                // Network error - no DB order was created, so nothing to cleanup
                showToast('Network error. Please check your internet connection and try again.', 'error');
            } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                // Timeout error - no DB order was created
                showToast('Request timed out. Please try again.', 'error');
            } else if (error.response?.data?.message) {
                // Server error message
                showToast(error.response.data.message, 'error');
            } else {
                // Generic error
                showToast('Failed to initiate payment. Please try again.', 'error');
            }
            
            placeOrderBtn.disabled = false;
            placeOrderBtn.innerHTML = 'Place Order';
        }
    }

    // Verify Payment
    async function verifyPayment(razorpayResponse, orderId) {
        try {
            placeOrderBtn.disabled = true;
            placeOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Verifying Payment...';

            const response = await axios.post('/payment/verify-payment', {
                razorpay_order_id: razorpayResponse.razorpay_order_id,
                razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                razorpay_signature: razorpayResponse.razorpay_signature,
                orderId: orderId
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.success) {
                showToast('Payment successful!', 'success');
                
                setTimeout(() => {
                    window.location.href = `/order-success/${orderId}`;
                }, 1000);
            } else {
                showToast('Payment verification failed', 'error');
                window.location.href = `/order-failure/${orderId}?reason=Verification Failed`;
            }

        } catch (error) {
            console.error('Payment verification error:', error);
            showToast('Payment verification failed', 'error');
            window.location.href = `/order-failure/${orderId}?reason=Verification Error`;
        }
    }

    // Handle Payment Cancellation
    async function handlePaymentCancellation(orderId) {
        try {
            // Only call if orderId exists (it will exist because DB order was created)
            if (orderId && !orderId.startsWith('TEMP-')) {
                await axios.post('/payment/payment-failure', {
                    orderId: orderId,
                    reason: 'Payment cancelled by user'
                });
            }

            showToast('Payment cancelled', 'info');
            
            // If we have a valid orderId, redirect to order failure page
            if (orderId && !orderId.startsWith('TEMP-')) {
                setTimeout(() => {
                    window.location.href = `/order-failure/${orderId}?reason=Payment Cancelled`;
                }, 1000);
            } else {
                // If no order was created 
                placeOrderBtn.disabled = false;
                placeOrderBtn.innerHTML = 'Place Order';
            }

        } catch (error) {
            console.error('Error handling cancellation:', error);
            placeOrderBtn.disabled = false;
            placeOrderBtn.innerHTML = 'Place Order';
        }
    }

    // Handle Payment Failed
    async function handlePaymentFailed(orderId, reason) {
        try {
            // Only update if order exists in DB
            if (orderId && !orderId.startsWith('TEMP-')) {
                await axios.post('/payment/payment-failure', {
                    orderId: orderId,
                    reason: reason || 'Payment failed'
                });

                showToast('Payment failed', 'error');
                
                setTimeout(() => {
                    window.location.href = `/order-failure/${orderId}?reason=${encodeURIComponent(reason || 'Payment Failed')}`;
                }, 1000);
            } else {
                showToast('Payment failed before order creation. Please try again.', 'error');
                placeOrderBtn.disabled = false;
                placeOrderBtn.innerHTML = 'Place Order';
            }

        } catch (error) {
            console.error('Error handling failure:', error);
            placeOrderBtn.disabled = false;
            placeOrderBtn.innerHTML = 'Place Order';
        }
    }
});