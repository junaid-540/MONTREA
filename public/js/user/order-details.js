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
        
        setTimeout(()=>{
            showToast('success', 'Invoice downloaded successfully');
        },2000)
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



// Retry Payment Functionality
const retryPaymentBtn = document.getElementById('retryPaymentBtn');
if (retryPaymentBtn) {
    retryPaymentBtn.addEventListener('click', async function() {
        const orderId = getOrderIdFromUrl();
        
        if (!orderId) {
            showToast('error', 'Order ID not found');
            return;
        }

        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Initiating Payment...';

        try {
            // Get order amount from data attribute or window object
            const amount = parseFloat(this.dataset.amount);
            
            if (!amount || amount <= 0) {
                throw new Error('Invalid order amount');
            }

            
            const razorpayOrderResponse = await axios.post('/payment/create-razorpay-retry-order', {
                orderId: orderId,
                amount: amount
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!razorpayOrderResponse.data.success) {
                throw new Error(razorpayOrderResponse.data.message || 'Failed to create payment order');
            }

            const razorpayData = razorpayOrderResponse.data.data;

            // Open Razorpay checkout
            const options = {
                key: razorpayData.keyId,
                amount: Math.round(razorpayData.amount),
                currency: razorpayData.currency,
                name: 'Montrea',
                description: 'Retry Order Payment',
                order_id: razorpayData.razorpayOrderId,
                handler: async function(response) {
                    // Verify payment
                    try {
                        const verifyResponse = await axios.post('/payment/verify-payment', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            orderId: orderId
                        });

                        if (verifyResponse.data.success) {
                            showToast('success', 'Payment successful!');
                            
                            setTimeout(() => {
                                window.location.href = `/order-success/${orderId}`;
                            }, 1000);
                        }
                    } catch (error) {
                        console.error('Verification error:', error);
                        showToast('error', 'Payment verification failed');
                        
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                    }
                },
                theme: {
                    color: '#c5a47e'
                },
                modal: {
                    ondismiss: function() {
                        const btn = document.getElementById('retryPaymentBtn');
                        if (btn) {
                            btn.disabled = false;
                            btn.innerHTML = '<i class="fas fa-redo me-2"></i> Retry Payment';
                        }
                        showToast('info', 'Payment cancelled');
                    }
                }
            };

            const razorpay = new Razorpay(options);
            
            razorpay.on('payment.failed', async function(response) {
                console.error('Payment failed:', response.error);
                showToast('error', response.error.description || 'Payment failed');
                
                try {
                    await axios.post('/payment/payment-failure', {
                        orderId: orderId,
                        reason: response.error.description || 'Payment failed'
                    });
                } catch (err) {
                    console.error('Error logging payment failure:', err);
                }
                
                const btn = document.getElementById('retryPaymentBtn');
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-redo me-2"></i> Retry Payment';
                }
            });
            
            razorpay.open();

            this.disabled = false;
            this.innerHTML = '<i class="fas fa-redo me-2"></i> Retry Payment';

        } catch (error) {
            console.error('Retry payment error:', error);
            showToast('error', error.response?.data?.message || 'Failed to initiate payment');
            
            this.disabled = false;
            this.innerHTML = '<i class="fas fa-redo me-2"></i> Retry Payment';
        }
    });
}


let reviewToDelete = null;
const reviewModal = new bootstrap.Modal(document.getElementById('reviewModal'));
const deleteReviewModal = new bootstrap.Modal(document.getElementById('deleteReviewModal'));



function openReviewModal(itemId, productName){
    document.getElementById('reviewProductName').textContent = productName;
    document.getElementById('reviewItemId').value = itemId;

     // Reset form
    document.querySelectorAll('.star-rating input[type="radio"]').forEach(input => {
        input.checked = false;
    });
    document.getElementById('reviewText').value = '';
    document.getElementById('ratingText').textContent = 'Tap a star to rate';
    document.getElementById('charCount').textContent = '0';
    document.getElementById('submitReviewBtn').disabled = true;
    
    
    reviewModal.show();
}

// Star rating interaction
document.querySelectorAll('.star-rating input[type="radio"]').forEach(input => {
    input.addEventListener('change', function() {
        const rating = parseInt(this.value);
        const ratingTexts = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
        document.getElementById('ratingText').textContent = ratingTexts[rating - 1];
        document.getElementById('submitReviewBtn').disabled = false;
    });
});

// character count 

document.getElementById('reviewText').addEventListener('input', function(){
    document.getElementById('charCount').textContent = this.value.length;
})

// Submit Review
document.getElementById('submitReviewBtn').addEventListener('click', async function() {
    const itemId = document.getElementById('reviewItemId').value;
    const orderId = document.getElementById('reviewOrderId').value;
    const rating = document.querySelector('input[name="rating"]:checked')?.value;
    const reviewText = document.getElementById('reviewText').value.trim();
    
    if (!rating) {
        showToast('error', 'Please select a rating');
        return;
    }
    
    this.disabled = true;
    this.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Submitting...';
    
    try {
        const response = await axios.post('/review/submit', {
            orderId,
            itemId,
            rating,
            reviewText
        });
        
        if (response.data.success) {
            showToast('success', 'Review submitted!');
            reviewModal.hide();

          // Update the UI immediately without page reload

            const reviewSection = document.querySelector(`[data-item-id="${itemId}"] .review-section`);
            if (reviewSection) {
                const reviewData = {
                    _id: response.data.data.reviewId,
                    rating: rating,
                    reviewText: reviewText,
                    createdAt: new Date()
                };
                
                const productName = document.querySelector(`[data-item-id="${itemId}"] .item-name`).textContent.trim();
                
                reviewSection.innerHTML = `
                    <div class="status-info review-submitted">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <i class="fas fa-star me-2" style="color: #ffc107;"></i>
                                <strong>Your Review:</strong> 
                                <div class="stars small mt-1">
                                    ${'<i class="fas fa-star"></i>'.repeat(rating)}${'<i class="far fa-star"></i>'.repeat(5 - rating)}
                                </div>
                                ${reviewText ? `<p class="mb-0 mt-2">${reviewText}</p>` : ''}
                                <small class="text-muted">
                                    Reviewed on ${new Date().toLocaleDateString('en-IN', { 
                                        day: 'numeric', 
                                        month: 'short', 
                                        year: 'numeric' 
                                    })}
                                </small>
                            </div>
                            <div class="review-actions">
                                <button class="btn btn-sm btn-outline-danger" 
                                        onclick="confirmDeleteReview('${reviewData._id}', '${productName}')">
                                    <i class="fas fa-trash me-1"></i>Delete
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }
        } else {
            showToast('error', response.data.message);
            this.disabled = false;
            this.innerHTML = 'Submit Review';
        }
    } catch (error) {
        showToast('error', error.response?.data?.message || 'Error submitting review');
        this.disabled = false;
        this.innerHTML = 'Submit Review';
    }
});

// Confirm Delete Review
function confirmDeleteReview(reviewId, productName) {
    reviewToDelete = reviewId;
    document.getElementById('deleteProductName').textContent = productName;
    deleteReviewModal.show();
}

// Delete Review
document.getElementById('confirmDeleteReviewBtn').addEventListener('click', async function() {
    if (!reviewToDelete) return;
    
    this.disabled = true;
    this.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Deleting...';
    
    try {
        const response = await axios.delete(`/review/${reviewToDelete}`);
        
        if (response.data.success) {
            showToast('success', 'Review deleted!');
            deleteReviewModal.hide();
            setTimeout(() => window.location.reload(), 1000);
        } else {
            showToast('error', response.data.message);
            this.disabled = false;
            this.innerHTML = 'Yes, Delete';
        }
    } catch (error) {
        showToast('error', error.response?.data?.message || 'Error deleting review');
        this.disabled = false;
        this.innerHTML = 'Yes, Delete';
    }
});