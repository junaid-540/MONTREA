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
    const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
    let currentOrderId = null;
    let currentItemId = null;
    let currentAction = null;
    let currentRefundAmount = 0;

    // Approve Return Button
    document.querySelectorAll('.btn-approve').forEach(btn => {
        btn.addEventListener('click', function() {
            currentOrderId = this.dataset.orderId;
            currentItemId = this.dataset.itemId;
            currentAction = 'approve';
            
            document.getElementById('modalTitle').textContent = 'Approve Return Request';
            document.getElementById('modalBody').innerHTML = `
                <p>Are you sure you want to approve this return request?</p>
                <p class="text-success"><i class="fas fa-info-circle me-2"></i>The customer will be able to return the item once approved.</p>
            `;
            document.getElementById('confirmActionBtn').className = 'btn btn-success';
            document.getElementById('confirmActionBtn').innerHTML = '<i class="fas fa-check me-2"></i>Approve';
            
            confirmationModal.show();
        });
    });

    // Reject Return Button
    document.querySelectorAll('.btn-reject').forEach(btn => {
        btn.addEventListener('click', function() {
            currentOrderId = this.dataset.orderId;
            currentItemId = this.dataset.itemId;
            currentAction = 'reject';
            
            document.getElementById('modalTitle').textContent = 'Reject Return Request';
            document.getElementById('modalBody').innerHTML = `
                <p>Are you sure you want to reject this return request?</p>
                <div class="mb-3">
                    <label class="form-label">Reason for rejection (Optional)</label>
                    <textarea class="form-control" id="rejectReason" rows="3" placeholder="Provide reason for rejection..."></textarea>
                </div>
                <p class="text-danger"><i class="fas fa-exclamation-triangle me-2"></i>This action cannot be undone.</p>
            `;
            document.getElementById('confirmActionBtn').className = 'btn btn-danger';
            document.getElementById('confirmActionBtn').innerHTML = '<i class="fas fa-times me-2"></i>Reject';
            
            confirmationModal.show();
        });
    });

    // Process Refund Button
    document.querySelectorAll('.btn-complete').forEach(btn => {
        btn.addEventListener('click', function() {
            currentOrderId = this.dataset.orderId;
            currentItemId = this.dataset.itemId;
            currentRefundAmount = this.dataset.refundAmount;
            currentAction = 'complete';
            
            document.getElementById('modalTitle').textContent = 'Process Refund';
            document.getElementById('modalBody').innerHTML = `
                <p>Are you sure you want to process the refund for this return?</p>
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    Refund Amount: <strong>₹${Math.round(currentRefundAmount)}</strong><br>
                    <small>The amount will be credited to the customer's wallet.</small>
                </div>
            `;
            document.getElementById('confirmActionBtn').className = 'btn btn-primary';
            document.getElementById('confirmActionBtn').innerHTML = '<i class="fas fa-money-bill-wave me-2"></i>Process Refund';
            
            confirmationModal.show();
        });
    });

    // Confirm Action Button
    document.getElementById('confirmActionBtn').addEventListener('click', async function() {
        let apiUrl = '';
        let data = {
            orderId: currentOrderId,
            itemId: currentItemId
        };
        
        if (currentAction === 'approve') {
            apiUrl = '/admin/refund-return/update-status';
            data.status = 'approved';
        } else if (currentAction === 'reject') {
            apiUrl = '/admin/refund-return/update-status';
            data.status = 'rejected';
            const rejectReason = document.getElementById('rejectReason')?.value;
            if (rejectReason) {
                data.adminNotes = rejectReason;
            }
        } else if (currentAction === 'complete') {
            apiUrl = '/admin/refund-return/process-refund';
        }
        
        try {
            const response = await axios.post(apiUrl, data, {
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.data.success) {
                showToast(response.data.message, 'success');
                confirmationModal.hide();
                
                // Reload page after 1.5 seconds
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                showToast(response.data.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast(error.response?.data?.message || 'An error occurred', 'error');
        }
    });

    // Clear reject reason when modal is hidden
    confirmationModal._element.addEventListener('hidden.bs.modal', function() {
        const rejectReason = document.getElementById('rejectReason');
        if (rejectReason) {
            rejectReason.value = '';
        }
        currentOrderId = null;
        currentItemId = null;
        currentAction = null;
        currentRefundAmount = 0;
    });
});