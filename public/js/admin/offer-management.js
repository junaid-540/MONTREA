if (successMessage && successMessage.trim() !== '') {
    Swal.fire({
        icon: 'success',
        title: 'Success',
        text: successMessage,
        timer: 3000,
        showConfirmButton: false
    });
}


const addOfferBtn = document.getElementById('addOfferBtn');
let addOfferModal = null; 
const offerTypeCards = document.querySelectorAll('.offer-type-card');
const offerFormContainer = document.getElementById('offerFormContainer');
const dynamicFormFields = document.getElementById('dynamicFormFields');
const offerTypeInput = document.getElementById('offerType');
const addOfferForm = document.getElementById('addOfferForm');

document.addEventListener('DOMContentLoaded', function() {
    const modalElement = document.getElementById('addOfferModal');
    if (modalElement) {
        addOfferModal = new bootstrap.Modal(modalElement);
        
        // Clear errors when modal is hidden
        modalElement.addEventListener('hidden.bs.modal', function() {
            resetModalForm();
        });
    }
});

function resetModalForm() {
    if (addOfferForm) {
        addOfferForm.reset();
    }
    
    if (offerFormContainer) {
        offerFormContainer.style.display = 'none';
    }
    
    offerTypeCards.forEach(card => card.classList.remove('active'));
    
    if (dynamicFormFields) {
        dynamicFormFields.innerHTML = '';
    }
    
    // Clear all validation errors
    document.querySelectorAll('.is-invalid').forEach(el => clearError(el));
}

if (addOfferBtn) {
    addOfferBtn.addEventListener('click', () => {
        resetModalForm();
        
        if (addOfferModal) {
            addOfferModal.show();
        }
    });
}

// Handle Offer Type Selection
offerTypeCards.forEach(card => {
    card.addEventListener('click', () => {
        offerTypeCards.forEach(c => c.classList.remove('active'));
        
        card.classList.add('active');
        
        // Get selected type
        const selectedType = card.getAttribute('data-type');
        if (offerTypeInput) {
            offerTypeInput.value = selectedType;
        }
        
        loadOfferFormFields(selectedType);
        
        // Show form container
        if (offerFormContainer) {
            offerFormContainer.style.display = 'block';
        }
    });
});

async function loadOfferFormFields(type) {
    try {
        const response = await axios.get(`/admin/offers/form-data?type=${type}`);
        
        if (response.data.success) {
            let html = '';
            const data = response.data.data;
            
            if (type === 'product') {
                html = `
                    <div class="mb-3">
                        <label for="productId" class="form-label">Select Product <span class="text-danger">*</span></label>
                        <select class="form-control" id="productId" name="productId">
                            <option value="">-- Select a Product --</option>
                            ${data.products.map(product => `
                                <option value="${product._id}">
                                    ${product.name} ${product.category ? `(${product.category.name})` : ''}
                                </option>
                            `).join('')}
                        </select>
                        <div class="invalid-feedback" id="productIdFeedback"></div>
                    </div>
                `;
            } else if (type === 'category') {
                html = `
                    <div class="mb-3">
                        <label for="categoryId" class="form-label">Select Category <span class="text-danger">*</span></label>
                        <select class="form-control" id="categoryId" name="categoryId">
                            <option value="">-- Select a Category --</option>
                            ${data.categories.map(category => `
                                <option value="${category._id}">${category.name}</option>
                            `).join('')}
                        </select>
                        <div class="invalid-feedback" id="categoryIdFeedback"></div>
                    </div>
                `;
            }
            
            if (dynamicFormFields) {
                dynamicFormFields.innerHTML = html;
                
                // Set up event listeners for the new elements
                setupFormEventListeners(type);
            }
            
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: response.data.message || 'Failed to load form data'
            });
        }
    } catch (error) {
        console.error('Error loading form data:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load form data'
        });
    }
}

// Setup event listeners for dynamic form
function setupFormEventListeners(type) {
    const targetSelect = document.getElementById(type === 'product' ? 'productId' : 'categoryId');
    
    if (targetSelect) {
        targetSelect.addEventListener('focus', () => clearError(targetSelect));
    }
    
    // Set minimum date for date inputs (today)
    const today = new Date().toISOString().split('T')[0];
    
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (startDateInput) {
        startDateInput.setAttribute('min', today);
        startDateInput.addEventListener('focus', () => clearError(startDateInput));
        
        startDateInput.addEventListener('change', function() {
            if (this.value && endDateInput) {
                endDateInput.setAttribute('min', this.value);
            }
        });
    }
    
    if (endDateInput) {
        endDateInput.addEventListener('focus', () => clearError(endDateInput));
        if (startDateInput?.value) {
            endDateInput.setAttribute('min', startDateInput.value);
        }
    }
    
    // Add focus listeners to other inputs
    const offerNameInput = document.getElementById('offerName');
    const offerPercentageInput = document.getElementById('offerPercentage');
    
    if (offerNameInput) {
        offerNameInput.addEventListener('focus', () => clearError(offerNameInput));
    }
    
    if (offerPercentageInput) {
        offerPercentageInput.addEventListener('focus', () => clearError(offerPercentageInput));
    }
}


document.querySelectorAll('.btn-edit').forEach(button => {
    button.addEventListener('click', function() {
        const offerId = this.getAttribute('data-id');
        const offerType = this.getAttribute('data-type');
        window.location.href = `/admin/offers/edit/${offerId}?type=${offerType}`;
    });
});


document.querySelectorAll('.btn-activate').forEach(button => {
    button.addEventListener('click', async function() {
        const offerId = this.getAttribute('data-id');
        const offerName = this.getAttribute('data-name');
        const offerType = this.getAttribute('data-type');

        const result = await Swal.fire({
            title: 'Activate Offer',
            text: `Are you sure you want to activate "${offerName}"?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#000',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, Activate',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                const response = await axios.post(`/admin/offers/toggle-status/${offerId}`, { type: offerType });
                
                if (response.data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Activated!',
                        text: response.data.message,
                        timer: 2000,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: response.data.message
                    });
                }
            } catch (error) {
                console.error('Error activating offer:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.response?.data?.message || 'Failed to activate offer'
                });
            }
        }
    });
});

// Handle Deactivate Button
document.querySelectorAll('.btn-deactivate').forEach(button => {
    button.addEventListener('click', async function() {
        const offerId = this.getAttribute('data-id');
        const offerName = this.getAttribute('data-name');
        const offerType = this.getAttribute('data-type');

        const result = await Swal.fire({
            title: 'Deactivate Offer',
            text: `Are you sure you want to deactivate "${offerName}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, Deactivate',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                const response = await axios.post(`/admin/offers/toggle-status/${offerId}`, { type: offerType });
                
                if (response.data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Deactivated!',
                        text: response.data.message,
                        timer: 2000,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: response.data.message
                    });
                }
            } catch (error) {
                console.error('Error deactivating offer:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.response?.data?.message || 'Failed to deactivate offer'
                });
            }
        }
    });
});

// Handle Delete Button
document.querySelectorAll('.btn-delete').forEach(button => {
    button.addEventListener('click', async function() {
        const offerId = this.getAttribute('data-id');
        const offerName = this.getAttribute('data-name');
        const offerType = this.getAttribute('data-type');

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
                    Swal.fire({
                        icon: 'success',
                        title: 'Deleted!',
                        text: response.data.message,
                        timer: 2000,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.reload();
                    });
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
});

// Form submission
if (addOfferForm) {
    addOfferForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Clear all previous errors
        document.querySelectorAll('.is-invalid').forEach(el => clearError(el));
        
        // Validate form
        if (!validateForm()) {
            return;
        }
        
        const formData = new FormData(addOfferForm);
        const data = Object.fromEntries(formData.entries());

        data.isActive = document.getElementById('isActive')?.checked || false;
        
        try {
            const response = await axios.post('/admin/offers/add', data);
            
            if (response.data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: response.data.message,
                    timer: 2000,
                    showConfirmButton: false
                });
                
                if (addOfferModal) {
                    addOfferModal.hide();
                }
                window.location.reload();
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: response.data.message
                });
            }
        } catch (error) {
            console.error('Error creating offer:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Failed to create offer'
            });
        }
    });
}

// Validation function
function validateForm() {
    let isValid = true;
    
    // Check if offer type is selected
    const offerType = offerTypeInput ? offerTypeInput.value : '';
    if (!offerType) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Please select an offer type'
        });
        return false;
    }
    
    // Validate target selection (product or category)
    const targetSelect = document.getElementById(offerType === 'product' ? 'productId' : 'categoryId');
    if (targetSelect && !targetSelect.value) {
        showError(targetSelect, `Please select a ${offerType}`);
        isValid = false;
    }
    
    // Offer Name
    const offerNameInput = document.getElementById('offerName');
    if (offerNameInput) {
        const offerName = offerNameInput.value.trim();
        if (!offerName) {
            showError(offerNameInput, 'Offer name is required');
            isValid = false;
        } else if (offerName.length > 100) {
            showError(offerNameInput, 'Offer name must not exceed 100 characters');
            isValid = false;
        }
    }
    
    // Offer Percentage
    const offerPercentageInput = document.getElementById('offerPercentage');
    if (offerPercentageInput) {
        const percentage = parseInt(offerPercentageInput.value);
        if (!percentage || percentage < 1 || percentage > 80) {
            showError(offerPercentageInput, 'Discount must be between 1-80%');
            isValid = false;
        }
    }
    
    // Dates
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (startDateInput && !startDateInput.value) {
        showError(startDateInput, 'Start date is required');
        isValid = false;
    }
    
    if (endDateInput && !endDateInput.value) {
        showError(endDateInput, 'End date is required');
        isValid = false;
    }
    
    if (startDateInput?.value && endDateInput?.value && new Date(endDateInput.value) <= new Date(startDateInput.value)) {
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