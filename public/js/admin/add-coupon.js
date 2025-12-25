document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('addCouponForm');
    const discountTypeOptions = document.querySelectorAll('.discount-type-option');
    const discountTypeInput = document.getElementById('discountType');
    const discountValueLabel = document.getElementById('discountValueLabel');
    const discountValueInput = document.getElementById('discountValue');
    const maxDiscountContainer = document.getElementById('maxDiscountContainer');
    const maxDiscountInput = document.getElementById('maxDiscountAmount');

    // Set minimum date for date inputs
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').setAttribute('min', today);
    document.getElementById('endDate').setAttribute('min', today);

    // Handle discount type selection
    discountTypeOptions.forEach(option => {
        option.addEventListener('click', function() {
            const selectedType = this.getAttribute('data-type');
            
            discountTypeOptions.forEach(opt => opt.classList.remove('active'));
            
            this.classList.add('active');
            
            // Update hidden input
            discountTypeInput.value = selectedType;
            
            // Update UI based on type
            if (selectedType === 'percentage') {
                discountValueLabel.textContent = 'Discount Percentage';
                discountValueInput.setAttribute('max', '100');
                discountValueInput.setAttribute('placeholder', 'e.g., 20');
                maxDiscountContainer.style.display = 'block';
            } else {
                discountValueLabel.textContent = 'Discount Amount (₹)';
                discountValueInput.removeAttribute('max');
                discountValueInput.setAttribute('placeholder', 'e.g., 100');
                maxDiscountContainer.style.display = 'none';
                maxDiscountInput.value = '';
            }
            
            // Clear validation
            clearError(discountValueInput);
        });
    });

    // Auto-uppercase coupon code
    document.getElementById('couponCode').addEventListener('input', function() {
        this.value = this.value.toUpperCase();
    });

    // Add event listeners to hide errors on focus for all input fields
    const inputFields = [
        document.getElementById('couponCode'),
        document.getElementById('couponDescription'),
        document.getElementById('discountValue'),
        document.getElementById('usageLimit'),
        document.getElementById('perUserLimit'),
        document.getElementById('startDate'),
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
    const couponCodeInput = document.getElementById('couponCode');
    if (couponCodeInput) {
        couponCodeInput.addEventListener('blur', function() {
            const code = this.value.trim();
            if (!code) {
                showError(this, 'Coupon code is required');
            } else if (code.length < 4 || code.length > 20) {
                showError(this, 'Code must be 4-20 characters');
            } else if (!/^[A-Z0-9_-]+$/.test(code)) {
                showError(this, 'Code can only contain uppercase letters, numbers, hyphens and underscores');
            }
        });
    }

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

    if (discountValueInput) {
        discountValueInput.addEventListener('blur', function() {
            const discountValue = parseFloat(this.value);
            if (!discountValue || discountValue <= 0) {
                showError(this, 'Discount value must be greater than 0');
            } else if (discountTypeInput.value === 'percentage' && discountValue > 100) {
                showError(this, 'Percentage cannot exceed 100%');
            }
        });
    }

    const usageLimitInput = document.getElementById('usageLimit');
    if (usageLimitInput) {
        usageLimitInput.addEventListener('blur', function() {
            const usageLimit = parseInt(this.value);
            if (!usageLimit || usageLimit < 1) {
                showError(this, 'Usage limit must be at least 1');
            }
        });
    }

    const perUserLimitInput = document.getElementById('perUserLimit');
    if (perUserLimitInput) {
        perUserLimitInput.addEventListener('blur', function() {
            const usageLimit = parseInt(document.getElementById('usageLimit').value);
            const perUserLimit = parseInt(this.value);
            
            if (!perUserLimit || perUserLimit < 1) {
                showError(this, 'Per user limit must be at least 1');
            } else if (usageLimit && perUserLimit > usageLimit) {
                showError(this, 'Per user limit cannot exceed total usage limit');
            }
        });
    }

    const startDateInput = document.getElementById('startDate');
    if (startDateInput) {
        startDateInput.addEventListener('blur', function() {
            const startDate = this.value;
            if (!startDate) {
                showError(this, 'Start date is required');
            }
        });
    }

    const endDateInput = document.getElementById('endDate');
    if (endDateInput) {
        endDateInput.addEventListener('blur', function() {
            const startDate = document.getElementById('startDate').value;
            const endDate = this.value;
            
            if (!endDate) {
                showError(this, 'End date is required');
            } else if (startDate && new Date(endDate) <= new Date(startDate)) {
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
            const response = await axios.post('/admin/coupon/add', data);
            
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
            console.error('Error creating coupon:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Failed to create coupon'
            });
        }
    });
    
    // Validation function
    function validateForm() {
        let isValid = true;
        
        // Code
        const code = document.getElementById('couponCode').value.trim();
        if (!code) {
            showError(document.getElementById('couponCode'), 'Coupon code is required');
            isValid = false;
        } else if (code.length < 4 || code.length > 20) {
            showError(document.getElementById('couponCode'), 'Code must be 4-20 characters');
            isValid = false;
        } else if (!/^[A-Z0-9_-]+$/.test(code)) {
            showError(document.getElementById('couponCode'), 'Code can only contain uppercase letters, numbers, hyphens and underscores');
            isValid = false;
        }
        
        // Description
        const description = document.getElementById('couponDescription').value.trim();
        if (!description) {
            showError(document.getElementById('couponDescription'), 'Description is required');
            isValid = false;
        } else if (description.length > 200) {
            showError(document.getElementById('couponDescription'), 'Description must not exceed 200 characters');
            isValid = false;
        }
        
        // Discount Value
        const discountValue = parseFloat(document.getElementById('discountValue').value);
        if (!discountValue || discountValue <= 0) {
            showError(document.getElementById('discountValue'), 'Discount value must be greater than 0');
            isValid = false;
        } else if (discountTypeInput.value === 'percentage' && discountValue > 100) {
            showError(document.getElementById('discountValue'), 'Percentage cannot exceed 100%');
            isValid = false;
        }
        
        // Usage Limit
        const usageLimit = parseInt(document.getElementById('usageLimit').value);
        if (!usageLimit || usageLimit < 1) {
            showError(document.getElementById('usageLimit'), 'Usage limit must be at least 1');
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
        
        // Dates
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (!startDate) {
            showError(document.getElementById('startDate'), 'Start date is required');
            isValid = false;
        }
        
        if (!endDate) {
            showError(document.getElementById('endDate'), 'End date is required');
            isValid = false;
        }
        
        if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
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