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
    const razorpayKeyId = document.body.dataset.razorpayKey || '';
    const addMoneyBtn = document.getElementById('addMoneyBtn');
    const topupAmountInput = document.getElementById('topupAmount');
    const proceedTopupBtn = document.getElementById('proceedTopupBtn');
    const addMoneyModal = new bootstrap.Modal(document.getElementById('addMoneyModal'));

    const filterButtons = document.querySelectorAll('.filter-btn');
    const transactionItems = document.querySelectorAll('.transaction-item');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;
            
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            transactionItems.forEach(item => {
                if (filter === 'all') {
                    item.classList.remove('hidden');
                } else {
                    if (item.dataset.type === filter) {
                        item.classList.remove('hidden');
                    } else {
                        item.classList.add('hidden');
                    }
                }
            });
        });
    });

    // Quick amount buttons
    const quickAmountBtns = document.querySelectorAll('.quick-amount-btn');
    quickAmountBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const amount = this.dataset.amount;
            topupAmountInput.value = amount;
            
            // Update active state
            quickAmountBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Clear quick amount selection when typing
    topupAmountInput.addEventListener('input', function() {
        quickAmountBtns.forEach(b => b.classList.remove('active'));
    });

    // Open add money modal
    addMoneyBtn.addEventListener('click', function() {
        topupAmountInput.value = '';
        quickAmountBtns.forEach(b => b.classList.remove('active'));
        addMoneyModal.show();
    });

    // Proceed with top-up
    proceedTopupBtn.addEventListener('click', async function() {
        const amount = parseFloat(topupAmountInput.value);
        
        // Validation
        if (!amount || isNaN(amount)) {
            showToast('Please enter a valid amount', 'error');
            return;
        }
        
        if (amount < 100) {
            showToast('Minimum top-up amount is ₹100', 'error');
            return;
        }
        
        if (amount > 10000) {
            showToast('Maximum top-up amount is ₹10,000', 'error');
            return;
        }
        
        // Disable button
        proceedTopupBtn.disabled = true;
        proceedTopupBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Creating Order...';
        
        try {
            // Create Razorpay order
            const response = await axios.post('/wallet/create-topup-order', {
                amount: amount
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to create order');
            }
            
            const razorpayData = response.data.data;
            
            // Open Razorpay checkout
            const options = {
                key: razorpayData.keyId,
                amount: razorpayData.amount,
                currency: razorpayData.currency,
                name: 'Montrea',
                description: 'Wallet Top-up',
                order_id: razorpayData.razorpayOrderId,
                handler: async function(razorpayResponse) {
                    // Payment success - verify and credit wallet
                    await verifyTopup(razorpayResponse, amount);
                },
                prefill: {
                    name: '',
                    email: '',
                    contact: ''
                },
                theme: {
                    color: '#c5a47e'
                },
                modal: {
                    ondismiss: function() {
                        showToast('Payment cancelled', 'info');
                        proceedTopupBtn.disabled = false;
                        proceedTopupBtn.innerHTML = 'Proceed to Payment';
                    }
                }
            };
            
            const rzp = new Razorpay(options);
            
            rzp.on('payment.failed', function(response) {
                showToast('Payment failed: ' + response.error.description, 'error');
                proceedTopupBtn.disabled = false;
                proceedTopupBtn.innerHTML = 'Proceed to Payment';
            });
            
            // Close modal and open Razorpay
            addMoneyModal.hide();
            rzp.open();
            
            // Re-enable button
            proceedTopupBtn.disabled = false;
            proceedTopupBtn.innerHTML = 'Proceed to Payment';
            
        } catch (error) {
            console.error('Error creating top-up order:', error);
            showToast(error.message || 'Failed to create payment order', 'error');
            proceedTopupBtn.disabled = false;
            proceedTopupBtn.innerHTML = 'Proceed to Payment';
        }
    });
    
    // Verify top-up payment
    async function verifyTopup(razorpayResponse, amount) {
        try {
            
            const response = await axios.post('/wallet/verify-topup', {
                razorpay_order_id: razorpayResponse.razorpay_order_id,
                razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                razorpay_signature: razorpayResponse.razorpay_signature,
                amount: amount * 100 // Convert to paise
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data.success) {
                showToast(response.data.message, 'success');
                
                // Reload page after 1.5 seconds to show updated balance
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                showToast(response.data.message || 'Payment verification failed', 'error');
            }
        } catch (error) {
            console.error('Error verifying top-up:', error);
            showToast('Failed to verify payment. Please contact support.', 'error');
        }
    }
});