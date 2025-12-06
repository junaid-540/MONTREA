document.addEventListener('DOMContentLoaded', () => {
    const orderId = window.location.pathname.split('/').pop();

    const showToast = (message, type = 'info') => {
        const bgColors = {
            success: 'linear-gradient(to right, #00b09b, #96c93d)',
            error: 'linear-gradient(to right, #ff6b6b, #ee5a24)',
            warning: 'linear-gradient(to right, #ffa726, #ff7043)',
            info: 'linear-gradient(to right, #2196f3, #21cbf3)'
        };

        Toastify({
            text: message,
            duration: 4000,
            gravity: "top",
            position: "right",
            backgroundColor: bgColors[type],
            stopOnFocus: true,
            close: true,
        }).showToast();
    };

    const confirmStatusChange = async (newStatus, isCancellation = false) => {
        const result = await Swal.fire({
            title: 'Confirm Status Change',
            text: isCancellation
                ? `Are you sure you want to CANCEL this item? Stock will be restored.`
                : `Change status to "${newStatus}"?`,
            icon: isCancellation ? 'warning' : 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Update',
            cancelButtonText: 'No, Keep Current',
            confirmButtonColor: isCancellation ? '#dc3545' : '#a47f5f',
            cancelButtonColor: '#6c757d',
            reverseButtons: true,
            customClass: {
                popup: 'animated fadeIn faster',
                confirmButton: 'btn btn-primary',
                cancelButton: 'btn btn-secondary',
                actions: 'swal-button-spacing'
            },
            buttonsStyling: false
        });

        return result.isConfirmed;
    };

    
    function setAvailableStatuses(select, currentStatus) {
        const itemId = select.dataset.itemId;
        const managementDiv = select.closest('.status-management');
        
        // Clear existing options
        select.innerHTML = '';
        
        // Define logic (same as EJS)
        const normalStatuses = ['Placed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'];
        const statusIndex = { 'Placed': 0, 'Processing': 1, 'Shipped': 2, 'Out for Delivery': 3, 'Delivered': 4 };
        
        let availableStatuses = [];
        const isTerminal = ['Delivered', 'Cancelled'].includes(currentStatus);
        if (isTerminal) {
            availableStatuses = [currentStatus];
            // Hide controls for terminal states
            if (managementDiv) {
                managementDiv.style.display = 'none';
            }
            select.disabled = true;
            const btn = document.querySelector(`.update-status-btn[data-item-id="${itemId}"]`);
            if (btn) {
                btn.style.display = 'none'; // Extra hide for button if needed
                btn.disabled = true;
            }
        } else {
            const currentIndex = statusIndex[currentStatus] || 0;
            availableStatuses = normalStatuses.slice(currentIndex);
            if (['Placed', 'Processing'].includes(currentStatus)) {
                availableStatuses = availableStatuses.concat('Cancelled');
            }
            // Show controls
            if (managementDiv) {
                managementDiv.style.display = 'block';
            }
            select.disabled = false;
            const btn = document.querySelector(`.update-status-btn[data-item-id="${itemId}"]`);
            if (btn) {
                btn.style.display = 'inline-block';
                btn.disabled = false;
            }
        }
        
        // Repopulate options
        availableStatuses.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = s;
            if (s === currentStatus) {
                opt.selected = true;
            }
            select.appendChild(opt);
        });
        
        // Update original value
        select.dataset.originalValue = currentStatus;
        
        // Reset button visual
        const updateBtn = document.querySelector(`.update-status-btn[data-item-id="${itemId}"]`);
        if (updateBtn && !isTerminal) {
            updateBtn.classList.remove('btn-warning');
            updateBtn.classList.add('btn-primary');
            updateBtn.innerHTML = '<i class="fas fa-check me-1"></i> Update';
        }
    }

    // On load: Set initial available statuses (handles server-rendered ones too)
    document.querySelectorAll('.status-select').forEach(select => {
        const currentStatus = select.value;
        select.dataset.originalValue = currentStatus;
        setAvailableStatuses(select, currentStatus);
    });

    // Main Update Button Handler
    document.querySelectorAll('.update-status-btn').forEach(btn => {
        btn.addEventListener('click', async function () {
            const itemId = this.dataset.itemId;
            const select = document.querySelector(`.status-select[data-item-id="${itemId}"]`);
            const newStatus = select.value;
            const oldStatus = select.dataset.originalValue || select.value;

            if (newStatus === oldStatus) {
                showToast('Status is already ' + newStatus, 'info');
                return;
            }

            const isCancellation = newStatus === 'Cancelled';
            const confirmed = await confirmStatusChange(newStatus, isCancellation);

            if (!confirmed) {
                select.value = oldStatus; // revert
                this.classList.remove('btn-warning');
                this.classList.add('btn-primary');
                this.innerHTML = '<i class="fas fa-check me-1"></i> Update';
                return;
            }

            const originalText = this.innerHTML;
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Updating...';

            try {
                const response = await axios.patch(`/admin/order/${orderId}/items/${itemId}/status`, {
                    status: newStatus
                });

                if (response.data.success) {
                    showToast('Item status updated successfully!', 'success');

                    // Update badge instantly
                    const badge = document.querySelector(`[data-item-id="${itemId}"] .item-status-badge`);
                    if (badge) {
                        badge.textContent = newStatus;
                        badge.className = `item-status-badge status-${newStatus.toLowerCase().replace(/\s+/g, '-')}`;
                    }

                    // NEW: Repopulate dropdown with forward-only options
                    setAvailableStatuses(select, newStatus);

                    // Update header badge + tracking stepper
                    if (response.data.data?.orderStatus) {
                        updateOrderHeaderAndTracking(response.data.data.orderStatus);
                    }

                    // Reset button styling (handled in setAvailableStatuses for terminals)
                    if (!['Delivered', 'Cancelled'].includes(newStatus)) {
                        this.classList.remove('btn-warning');
                        this.classList.add('btn-primary');
                        this.innerHTML = '<i class="fas fa-check me-1"></i> Update';
                    }
                }
            } catch (error) {
                console.error('Update failed:', error);
                const msg = error.response?.data?.message || 'Failed to update status';
                showToast(msg, 'error');

                // Revert select on error
                select.value = oldStatus;
                setAvailableStatuses(select, oldStatus); // NEW: Reset to original options
                this.classList.remove('btn-warning');
                this.classList.add('btn-primary');
                this.innerHTML = '<i class="fas fa-check me-1"></i> Update';
            } finally {
                this.disabled = false;
                if (this.innerHTML.includes('Updating')) {
                    this.innerHTML = originalText;
                }
            }
        });
    });

    // Visual feedback when status is changed in dropdown
    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', function () {
            const updateBtn = document.querySelector(`.update-status-btn[data-item-id="${this.dataset.itemId}"]`);
            if (!updateBtn || ['Delivered', 'Cancelled'].includes(this.value)) return; // Skip for terminals

            if (this.value !== this.dataset.originalValue) {
                updateBtn.classList.remove('btn-primary');
                updateBtn.classList.add('btn-warning');
                updateBtn.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i> Update Now';
            } else {
                updateBtn.classList.remove('btn-warning');
                updateBtn.classList.add('btn-primary');
                updateBtn.innerHTML = '<i class="fas fa-check me-1"></i> Update';
            }
        });
    });

    
    function updateOrderHeaderAndTracking(newStatus) {
        
        const headerBadge = document.querySelector('.order-header-card .status-badge');
        if (headerBadge) {
            headerBadge.textContent = newStatus;
            headerBadge.className = `status-badge status-${newStatus.toLowerCase().replace(/\s+/g, '-')}`;
        }

        // Tracking stepper
        document.querySelectorAll('.tracking-steps .step').forEach(step => {
            const label = step.querySelector('.step-label').textContent;
            step.classList.remove('active', 'completed');

            if (newStatus === label) {
                step.classList.add('active');
            } else if (
                ['Processing', 'Shipped', 'Out for Delivery', 'Delivered'].includes(newStatus) &&
                ['Placed', 'Processing', 'Shipped', 'Out for Delivery'].includes(label) &&
                getStatusRank(newStatus) > getStatusRank(label)
            ) {
                step.classList.add('completed');
            }
        });

        // Cancelled state
        const cancelledTrack = document.querySelector('.cancelled-track');
        if (cancelledTrack) {
            cancelledTrack.style.display = newStatus.includes('Cancelled') ? 'flex' : 'none';
        }
    }

    function getStatusRank(status) {
        const ranks = { 'Placed': 1, 'Processing': 2, 'Shipped': 3, 'Out for Delivery': 4, 'Delivered': 5 };
        return ranks[status] || 0;
    }

    window.showOrderToast = showToast;
});