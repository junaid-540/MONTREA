document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('addCouponForm');
    const discountTypeOptions = document.querySelectorAll('.discount-type-option');
    const discountTypeInput = document.getElementById('discountType');
    const discountValueLabel = document.getElementById('discountValueLabel');
    const discountValueInput = document.getElementById('discountValue');
    const maxDiscountContainer = document.getElementById('maxDiscountContainer');
    const maxDiscountInput = document.getElementById('maxDiscountAmount');
    const minPurchaseInput = document.getElementById('minPurchaseAmount');

    // Configuration constants (same as backend)
    const COUPON_CONFIG = {
        MAX_PERCENTAGE_DISCOUNT: 70,
        MAX_DISCOUNT_TO_SUBTOTAL_RATIO: 0.80
    };

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').setAttribute('min', today);
    document.getElementById('endDate').setAttribute('min', today);

    // Handle discount type selection
    discountTypeOptions.forEach(option => {
        option.addEventListener('click', function() {
            const selectedType = this.getAttribute('data-type');
            
            discountTypeOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            discountTypeInput.value = selectedType;
            
            if (selectedType === 'percentage') {
                discountValueLabel.textContent = 'Discount Percentage';
                discountValueInput.setAttribute('max', COUPON_CONFIG.MAX_PERCENTAGE_DISCOUNT);
                discountValueInput.setAttribute('placeholder', `e.g., 20 (Max ${COUPON_CONFIG.MAX_PERCENTAGE_DISCOUNT}%)`);
                maxDiscountContainer.style.display = 'block';
            } else {
                discountValueLabel.textContent = 'Discount Amount (₹)';
                discountValueInput.removeAttribute('max');
                discountValueInput.setAttribute('placeholder', 'e.g., 100');
                maxDiscountContainer.style.display = 'none';
                maxDiscountInput.value = '';
            }
            
            clearError(discountValueInput);
        });
    });

    // Auto-uppercase coupon code
    document.getElementById('couponCode').addEventListener('input', function() {
        this.value = this.value.toUpperCase();
    });

    // Add event listeners to hide errors on focus
    const inputFields = [
        document.getElementById('couponCode'),
        document.getElementById('couponDescription'),
        discountValueInput,
        maxDiscountInput,
        minPurchaseInput,
        document.getElementById('usageLimit'),
        document.getElementById('perUserLimit'),
        document.getElementById('startDate'),
        document.getElementById('endDate')
    ];

    inputFields.forEach(input => {
        if (input) {
            input.addEventListener('focus', () => clearError(input));
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

    // Discount value validation with business rules
    if (discountValueInput) {
        discountValueInput.addEventListener('blur', function() {
            validateDiscountValue();
        });
    }

    // Max discount validation
    if (maxDiscountInput) {
        maxDiscountInput.addEventListener('blur', function() {
            validateMaxDiscount();
        });
    }

    // Min purchase validation
    if (minPurchaseInput) {
        minPurchaseInput.addEventListener('blur', function() {
            validateMinPurchase();
        });
    }

    // Cross-field validation when any pricing field changes
    [discountValueInput, maxDiscountInput, minPurchaseInput].forEach(input => {
        if (input) {
            input.addEventListener('input', function() {
                // Trigger validation after a short delay
                setTimeout(() => {
                    if (discountTypeInput.value === 'percentage') {
                        validateMaxDiscount();
                    } else {
                        validateDiscountValue();
                    }
                }, 300);
            });
        }
    });

    function validateDiscountValue() {
        const discountValue = parseFloat(discountValueInput.value);
        const minPurchase = parseFloat(minPurchaseInput.value) || 0;
        
        if (!discountValue || discountValue <= 0) {
            showError(discountValueInput, 'Discount value must be greater than 0');
            return false;
        }
        
        if (discountTypeInput.value === 'percentage') {
            if (discountValue > COUPON_CONFIG.MAX_PERCENTAGE_DISCOUNT) {
                showError(
                    discountValueInput, 
                    `Percentage cannot exceed ${COUPON_CONFIG.MAX_PERCENTAGE_DISCOUNT}% for business safety`
                );
                return false;
            }
        } else if (discountTypeInput.value === 'fixed') {
            // Fixed discount validation
            if (minPurchase > 0) {
                if (discountValue >= minPurchase) {
                    showError(
                        discountValueInput, 
                        `Fixed discount (₹${discountValue}) cannot equal or exceed minimum purchase (₹${minPurchase})`
                    );
                    return false;
                }
                
                const ratio = discountValue / minPurchase;
                if (ratio >= COUPON_CONFIG.MAX_DISCOUNT_TO_SUBTOTAL_RATIO) {
                    showError(
                        discountValueInput, 
                        `Discount should not exceed ${COUPON_CONFIG.MAX_DISCOUNT_TO_SUBTOTAL_RATIO * 100}% of minimum purchase`
                    );
                    return false;
                }
            }
        }
        
        clearError(discountValueInput);
        return true;
    }

    function validateMaxDiscount() {
        const maxDiscount = parseFloat(maxDiscountInput.value);
        const minPurchase = parseFloat(minPurchaseInput.value) || 0;
        
        if (!maxDiscount || maxDiscount <= 0) {
            clearError(maxDiscountInput);
            return true; // Max discount is optional
        }
        
        if (minPurchase > 0) {
            const ratio = maxDiscount / minPurchase;
            
            if (ratio >= COUPON_CONFIG.MAX_DISCOUNT_TO_SUBTOTAL_RATIO) {
                showError(
                    maxDiscountInput, 
                    `Max discount (₹${maxDiscount}) is too high. Should not exceed ${COUPON_CONFIG.MAX_DISCOUNT_TO_SUBTOTAL_RATIO * 100}% of min purchase (₹${minPurchase})`
                );
                return false;
            }
            
            // Friendly suggestion
            const recommendedMax = Math.floor(minPurchase * COUPON_CONFIG.MAX_DISCOUNT_TO_SUBTOTAL_RATIO);
            if (maxDiscount > recommendedMax) {
                showWarning(
                    maxDiscountInput,
                    `Recommended max discount: ₹${recommendedMax} (${COUPON_CONFIG.MAX_DISCOUNT_TO_SUBTOTAL_RATIO * 100}% of ₹${minPurchase})`
                );
            }
        }
        
        clearError(maxDiscountInput);
        return true;
    }

    function validateMinPurchase() {
        const minPurchase = parseFloat(minPurchaseInput.value) || 0;
        
        if (minPurchase < 0) {
            showError(minPurchaseInput, 'Minimum purchase cannot be negative');
            return false;
        }
        
        // Validate against existing discount values
        if (discountTypeInput.value === 'percentage') {
            validateMaxDiscount();
        } else {
            validateDiscountValue();
        }
        
        clearError(minPurchaseInput);
        return true;
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
            if (!this.value) {
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
        
        document.querySelectorAll('.is-invalid').forEach(el => clearError(el));
        
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
            const errorMessage = error.response?.data?.message || 'Failed to create coupon';
            
            // If validation errors from backend
            if (error.response?.data?.errors) {
                const errorList = error.response.data.errors.join('<br>');
                Swal.fire({
                    icon: 'error',
                    title: 'Validation Error',
                    html: errorList
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage
                });
            }
        }
    });
    
    function validateForm() {
        let isValid = true;
        
        // Code validation
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
        
        // Description validation
        const description = document.getElementById('couponDescription').value.trim();
        if (!description) {
            showError(document.getElementById('couponDescription'), 'Description is required');
            isValid = false;
        } else if (description.length > 200) {
            showError(document.getElementById('couponDescription'), 'Description must not exceed 200 characters');
            isValid = false;
        }
        
        // Discount value validation with business rules
        if (!validateDiscountValue()) {
            isValid = false;
        }
        
        // Max discount validation (if applicable)
        if (discountTypeInput.value === 'percentage' && !validateMaxDiscount()) {
            isValid = false;
        }
        
        // Usage limits
        const usageLimit = parseInt(document.getElementById('usageLimit').value);
        if (!usageLimit || usageLimit < 1) {
            showError(document.getElementById('usageLimit'), 'Usage limit must be at least 1');
            isValid = false;
        }
        
        const perUserLimit = parseInt(document.getElementById('perUserLimit').value);
        if (!perUserLimit || perUserLimit < 1) {
            showError(document.getElementById('perUserLimit'), 'Per user limit must be at least 1');
            isValid = false;
        } else if (usageLimit && perUserLimit > usageLimit) {
            showError(document.getElementById('perUserLimit'), 'Per user limit cannot exceed total usage limit');
            isValid = false;
        }
        
        // Date validation
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
            feedback.classList.remove('text-warning');
            feedback.classList.add('text-danger');
        }
    }
    
    function showWarning(input, message) {
        const feedbackId = input.id + 'Feedback';
        const feedback = document.getElementById(feedbackId);
        if (feedback) {
            feedback.textContent = message;
            feedback.style.display = 'block';
            feedback.classList.remove('text-danger');
            feedback.classList.add('text-warning');
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