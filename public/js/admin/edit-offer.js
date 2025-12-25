document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('editOfferForm');
    const deleteBtn = document.getElementById('deleteOfferBtn');
    const offerId = form.getAttribute('data-id');
    const offerType = form.getAttribute('data-type');

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

    // Set minimum datetime for date inputs
    const now = new Date();
    const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (startDateInput) {
        // Don't allow setting start date in the past for existing offers
        startDateInput.addEventListener('change', function() {
            if (this.value && endDateInput) {
                endDateInput.setAttribute('min', this.value);
            }
        });
    }
    
    if (endDateInput && startDateInput?.value) {
        endDateInput.setAttribute('min', startDateInput.value);
    }

    // Add event listeners to hide errors on focus
    const inputFields = [
        document.getElementById('offerName'),
        document.getElementById('offerPercentage'),
        startDateInput,
        endDateInput
    ];

    inputFields.forEach(input => {
        if (input) {
            input.addEventListener('focus', () => {
                clearError(input);
            });
        }
    });

    // Real-time validation on blur
    const offerNameInput = document.getElementById('offerName');
    if (offerNameInput) {
        offerNameInput.addEventListener('blur', function() {
            const offerName = this.value.trim();
            if (!offerName) {
                showError(this, 'Offer name is required');
            } else if (offerName.length > 100) {
                showError(this, 'Offer name must not exceed 100 characters');
            }
        });
    }

    const offerPercentageInput = document.getElementById('offerPercentage');
    if (offerPercentageInput) {
        offerPercentageInput.addEventListener('blur', function() {
            const percentage = parseInt(this.value);
            if (!percentage || percentage < 1 || percentage > 80) {
                showError(this, 'Discount must be between 1-80%');
            }
        });
    }

    if (startDateInput) {
        startDateInput.addEventListener('blur', function() {
            if (!this.value) {
                showError(this, 'Start date is required');
            }
        });
    }

    if (endDateInput) {
        endDateInput.addEventListener('blur', function() {
            const startDate = startDateInput.value;
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
        data.isActive = document.getElementById('isActive')?.checked || false;
        try {
            const response = await axios.post(`/admin/offers/edit/${offerId}`, data);
            
            if (response.data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: response.data.message,
                    timer: 2000,
                    showConfirmButton: false
                });
                window.location.href = '/admin/offers';
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: response.data.message
                });
            }
        } catch (error) {
            console.error('Error updating offer:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Failed to update offer'
            });
        }
    });

    // Delete button handler
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async function() {
            const offerName = document.getElementById('offerName')?.value || 'this offer';

            const result = await Swal.fire({
                title: 'Delete Offer',
                text: `Are you sure you want to delete "${offerName}"? This action cannot be undone.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Yes, Delete',
                cancelButtonText: 'Cancel'
            });

            if (result.isConfirmed) {
                try {
                    const response = await axios.post(`/admin/offers/delete/${offerId}`, { type: offerType });
                    
                    if (response.data.success) {
                        await Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: response.data.message,
                            timer: 2000,
                            showConfirmButton: false
                        });
                        window.location.href = '/admin/offers';
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: response.data.message
                        });
                    }
                } catch (error) {
                    console.error('Error deleting offer:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: error.response?.data?.message || 'Failed to delete offer'
                    });
                }
            }
        });
    }
    
    // Validation function
    function validateForm() {
        let isValid = true;
        
        // Validate target selection (product or category)
        let targetSelect;
        if (offerType === 'product') {
            targetSelect = document.getElementById('productId');
        } else if (offerType === 'category') {
            targetSelect = document.getElementById('categoryId');
        }
        
        if (targetSelect && !targetSelect.value) {
            showError(targetSelect, `Please select a ${offerType}`);
            isValid = false;
        }
        
        // Offer Name
        const offerName = offerNameInput.value.trim();
        if (!offerName) {
            showError(offerNameInput, 'Offer name is required');
            isValid = false;
        } else if (offerName.length > 100) {
            showError(offerNameInput, 'Offer name must not exceed 100 characters');
            isValid = false;
        }
        
        // Offer Percentage
        const percentage = parseInt(offerPercentageInput.value);
        if (!percentage || percentage < 1 || percentage > 99) {
            showError(offerPercentageInput, 'Discount must be between 1-99%');
            isValid = false;
        }
        
        // Dates
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        
        if (!startDate) {
            showError(startDateInput, 'Start date is required');
            isValid = false;
        }
        
        if (!endDate) {
            showError(endDateInput, 'End date is required');
            isValid = false;
        }
        
        if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
            showError(endDateInput, 'End date must be after start date');
            isValid = false;
        }
        
        return isValid;
    }
    
    function showError(input, message) {
        if (!input) return;
        
        input.classList.add('is-invalid');
        const feedbackId = input.id + 'Feedback';
        const feedback = document.getElementById(feedbackId);
        if (feedback) {
            feedback.textContent = message;
            feedback.style.display = 'block';
        }
    }
    
    function clearError(input) {
        if (!input) return;
        
        input.classList.remove('is-invalid');
        const feedbackId = input.id + 'Feedback';
        const feedback = document.getElementById(feedbackId);
        if (feedback) {
            feedback.textContent = '';
            feedback.style.display = 'none';
        }
    }
});