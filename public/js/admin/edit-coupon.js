document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('editCouponForm');
    const couponId = form.getAttribute('data-id');
    const maxDiscountInput = document.getElementById('maxDiscountAmount');
    const minPurchaseInput = document.getElementById('minPurchaseAmount');
    const discountValueInput = document.getElementById('discountValue');

    // Configuration constants (same as backend)
    const COUPON_CONFIG = {
        MAX_PERCENTAGE_DISCOUNT: 70,
        MAX_DISCOUNT_TO_SUBTOTAL_RATIO: 0.80
    };

    // Get discount type from the form (it's read-only but we need to know it)
    const isPercentageDiscount = discountValueInput.value && 
        document.querySelector('.discount-type-badge i.fa-percent') !== null;

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
        maxDiscountInput,
        minPurchaseInput,
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

    // Max discount validation (for percentage coupons)
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

    // Cross-field validation when pricing fields change
    [maxDiscountInput, minPurchaseInput].forEach(input => {
        if (input) {
            input.addEventListener('input', function() {
                setTimeout(() => {
                    if (isPercentageDiscount) {
                        validateMaxDiscount();
                    } else {
                        validateMinPurchase();
                    }
                }, 300);
            });
        }
    });

    function validateMaxDiscount() {
        if (!maxDiscountInput) return true;
        
        const maxDiscount = parseFloat(maxDiscountInput.value);
        const minPurchase = parseFloat(minPurchaseInput.value) || 0;
        
        // Max discount is optional, so if empty it's valid
        if (!maxDiscount || maxDiscount <= 0) {
            clearError(maxDiscountInput);
            return true;
        }
        
        if (minPurchase > 0) {
            const ratio = maxDiscount / minPurchase;
            
            // Critical validation: max discount shouldn't be too high
            if (ratio >= COUPON_CONFIG.MAX_DISCOUNT_TO_SUBTOTAL_RATIO) {
                showError(
                    maxDiscountInput, 
                    `Max discount (₹${maxDiscount}) is too high. Should not exceed ${COUPON_CONFIG.MAX_DISCOUNT_TO_SUBTOTAL_RATIO * 100}% of min purchase (₹${minPurchase})`
                );
                return false;
            }
            
            // Warning if approaching the limit
            const warningThreshold = 0.70; // 70%
            if (ratio >= warningThreshold && ratio < COUPON_CONFIG.MAX_DISCOUNT_TO_SUBTOTAL_RATIO) {
                const recommendedMax = Math.floor(minPurchase * COUPON_CONFIG.MAX_DISCOUNT_TO_SUBTOTAL_RATIO);
                showWarning(
                    maxDiscountInput,
                    `High discount ratio. Recommended max: ₹${recommendedMax}`
                );
            }
        }
        
        clearError(maxDiscountInput);
        return true;
    }

    function validateMinPurchase() {
        if (!minPurchaseInput) return true;
        
        const minPurchase = parseFloat(minPurchaseInput.value) || 0;
        const discountValue = parseFloat(discountValueInput.value) || 0;
        
        if (minPurchase < 0) {
            showError(minPurchaseInput, 'Minimum purchase cannot be negative');
            return false;
        }
        
        // For fixed discount type, validate against discount value
        if (!isPercentageDiscount && discountValue > 0) {
            if (minPurchase > 0 && discountValue >= minPurchase) {
                showError(
                    minPurchaseInput, 
                    `Minimum purchase (₹${minPurchase}) must be greater than fixed discount (₹${discountValue})`
                );
                return false;
            }
            
            // Check ratio
            if (minPurchase > 0) {
                const ratio = discountValue / minPurchase;
                if (ratio >= COUPON_CONFIG.MAX_DISCOUNT_TO_SUBTOTAL_RATIO) {
                    showError(
                        minPurchaseInput, 
                        `Minimum purchase is too low. With fixed discount of ₹${discountValue}, min purchase should be at least ₹${Math.ceil(discountValue / COUPON_CONFIG.MAX_DISCOUNT_TO_SUBTOTAL_RATIO)}`
                    );
                    return false;
                }
            }
        }
        
        // For percentage discount, validate against max discount if it exists
        if (isPercentageDiscount) {
            validateMaxDiscount();
        }
        
        clearError(minPurchaseInput);
        return true;
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
            const errorMessage = error.response?.data?.message || 'Failed to update coupon';
            
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
        
        // Validate discount-related fields with business rules
        if (isPercentageDiscount) {
            if (!validateMaxDiscount()) {
                isValid = false;
            }
        }
        
        if (!validateMinPurchase()) {
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