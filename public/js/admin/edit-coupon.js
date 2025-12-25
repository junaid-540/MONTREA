document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('editCouponForm');
    const couponId = form.getAttribute('data-id');

    // Show success message if exists
    if (typeof successMessage !== 'undefined' && successMessage && successMessage.trim() !== '') {
        Swal.fire({
            icon: 'success',
            title: 'Success',
            text: successMessage,
            timer: 3000,
            showConfirmButton: false
        });
    }

    // Set minimum date for end date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('endDate').setAttribute('min', today);

    // Add event listeners to hide errors on focus for all input fields
    const inputFields = [
        document.getElementById('couponDescription'),
        document.getElementById('usageLimit'),
        document.getElementById('perUserLimit'),
        document.getElementById('endDate')
    ];

    inputFields.forEach(input => {
        if (input) {
            input.addEventListener('focus', () => {
                clearError(input);
            });
        }
    });

    // Real-time validation on blur
    const descriptionInput = document.getElementById('couponDescription');
    if (descriptionInput) {
        descriptionInput.addEventListener('blur', function() {
            const description = this.value.trim();
            if (!description) {
                showError(this, 'Description is required');
            } else if (description.length > 200) {
                showError(this, 'Description must not exceed 200 characters');
            }
        });
    }

    const usageLimitInput = document.getElementById('usageLimit');
    if (usageLimitInput) {
        usageLimitInput.addEventListener('blur', function() {
            const usageLimit = parseInt(this.value);
            const currentUsage = parseInt(this.getAttribute('min') || 0);
            
            if (!usageLimit || usageLimit < 1) {
                showError(this, 'Usage limit must be at least 1');
            } else if (usageLimit < currentUsage) {
                showError(this, `Usage limit cannot be less than current usage (${currentUsage})`);
            }
        });
    }

    const perUserLimitInput = document.getElementById('perUserLimit');
    if (perUserLimitInput) {
        perUserLimitInput.addEventListener('blur', function() {
            const perUserLimit = parseInt(this.value);
            const usageLimit = parseInt(document.getElementById('usageLimit').value);
            
            if (!perUserLimit || perUserLimit < 1) {
                showError(this, 'Per user limit must be at least 1');
            } else if (usageLimit && perUserLimit > usageLimit) {
                showError(this, 'Per user limit cannot exceed total usage limit');
            }
        });
    }

    const endDateInput = document.getElementById('endDate');
    if (endDateInput) {
        endDateInput.addEventListener('blur', function() {
            const endDate = this.value;
            const startDate = document.getElementById('startDate').value;
            
            if (!endDate) {
                showError(this, 'End date is required');
            } else if (new Date(endDate) <= new Date(startDate)) {
                showError(this, 'End date must be after start date');
            }
        });
    }

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Clear all previous errors
        document.querySelectorAll('.is-invalid').forEach(el => clearError(el));
        
        // Validate form
        if (!validateForm()) {
            return;
        }
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const response = await axios.post(`/admin/coupon/edit/${couponId}`, data);
            
            if (response.data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: response.data.message,
                    timer: 2000,
                    showConfirmButton: false
                });
                window.location.href = '/admin/coupon';
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: response.data.message
                });
            }
        } catch (error) {
            console.error('Error updating coupon:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Failed to update coupon'
            });
        }
    });
    
    // Validation function
    function validateForm() {
        let isValid = true;
        
        // Description
        const description = document.getElementById('couponDescription').value.trim();
        if (!description) {
            showError(document.getElementById('couponDescription'), 'Description is required');
            isValid = false;
        } else if (description.length > 200) {
            showError(document.getElementById('couponDescription'), 'Description must not exceed 200 characters');
            isValid = false;
        }
        
        // Usage Limit
        const usageLimit = parseInt(document.getElementById('usageLimit').value);
        const currentUsage = parseInt(document.getElementById('usageLimit').getAttribute('min') || 0);
        
        if (!usageLimit || usageLimit < 1) {
            showError(document.getElementById('usageLimit'), 'Usage limit must be at least 1');
            isValid = false;
        } else if (usageLimit < currentUsage) {
            showError(document.getElementById('usageLimit'), `Usage limit cannot be less than current usage (${currentUsage})`);
            isValid = false;
        }
        
        // Per User Limit
        const perUserLimit = parseInt(document.getElementById('perUserLimit').value);
        if (!perUserLimit || perUserLimit < 1) {
            showError(document.getElementById('perUserLimit'), 'Per user limit must be at least 1');
            isValid = false;
        } else if (usageLimit && perUserLimit > usageLimit) {
            showError(document.getElementById('perUserLimit'), 'Per user limit cannot exceed total usage limit');
            isValid = false;
        }
        
        // End Date
        const endDate = document.getElementById('endDate').value;
        const startDate = document.getElementById('startDate').value;
        
        if (!endDate) {
            showError(document.getElementById('endDate'), 'End date is required');
            isValid = false;
        } else if (new Date(endDate) <= new Date(startDate)) {
            showError(document.getElementById('endDate'), 'End date must be after start date');
            isValid = false;
        }
        
        return isValid;
    }
    
    function showError(input, message) {
        input.classList.add('is-invalid');
        const feedbackId = input.id + 'Feedback';
        const feedback = document.getElementById(feedbackId);
        if (feedback) {
            feedback.textContent = message;
            feedback.style.display = 'block';
        }
    }
    
    function clearError(input) {
        input.classList.remove('is-invalid');
        const feedbackId = input.id + 'Feedback';
        const feedback = document.getElementById(feedbackId);
        if (feedback) {
            feedback.textContent = '';
            feedback.style.display = 'none';
        }
    }
});