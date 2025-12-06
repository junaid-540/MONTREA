// Address Type Selection
function selectAddressType(element, type) {
    document.querySelectorAll('.address-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    element.classList.add('active');
    document.getElementById('addressType').value = type;
}

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

// Validation Functions
function validateFullName(name) {
    const trimmedName = name.trim();
    if (!trimmedName) {
        return { valid: false, message: 'Full name is required' };
    }
    if (trimmedName.length < 3) {
        return { valid: false, message: 'Full name must be at least 3 characters' };
    }
    if (trimmedName.length > 50) {
        return { valid: false, message: 'Full name must not exceed 50 characters' };
    }
    if (!/^[a-zA-Z\s]+$/.test(trimmedName)) {
        return { valid: false, message: 'Full name can only contain letters and spaces' };
    }
    return { valid: true };
}

function validatePhone(phone) {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
        return { valid: false, message: 'Phone number is required' };
    }
    if (!/^[6-9][0-9]{9}$/.test(trimmedPhone)) {
        return { valid: false, message: 'Phone number must be a valid 10-digit Indian mobile number starting with 6-9' };
    }
    return { valid: true };
}

function validateAlternatePhone(phone) {
    const trimmedPhone = phone.trim();
    if (trimmedPhone && !/^[6-9][0-9]{9}$/.test(trimmedPhone)) {
        return { valid: false, message: 'Alternate phone must be a valid 10-digit Indian mobile number starting with 6-9' };
    }
    return { valid: true };
}

function validateAddress(address, fieldName) {
    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
        return { valid: false, message: `${fieldName} is required` };
    }
    if (trimmedAddress.length < 5) {
        return { valid: false, message: `${fieldName} must be at least 5 characters` };
    }
    if (trimmedAddress.length > 100) {
        return { valid: false, message: `${fieldName} must not exceed 100 characters` };
    }
    return { valid: true };
}

function validateCity(city) {
    const trimmedCity = city.trim();
    if (!trimmedCity) {
        return { valid: false, message: 'City is required' };
    }
    if (trimmedCity.length < 2) {
        return { valid: false, message: 'City must be at least 2 characters' };
    }
    if (trimmedCity.length > 50) {
        return { valid: false, message: 'City must not exceed 50 characters' };
    }
    if (!/^[a-zA-Z\s]+$/.test(trimmedCity)) {
        return { valid: false, message: 'City can only contain letters and spaces' };
    }
    return { valid: true };
}

function validateState(state) {
    if (!state) {
        return { valid: false, message: 'State is required' };
    }
    return { valid: true };
}

function validatePincode(pincode) {
    const trimmedPincode = pincode.trim();
    if (!trimmedPincode) {
        return { valid: false, message: 'Pincode is required' };
    }
    if (!/^[1-9][0-9]{5}$/.test(trimmedPincode)) {
        return { valid: false, message: 'Pincode must be a valid 6-digit Indian pincode' };
    }
    return { valid: true };
}

// Show/Clear Inline Errors
function showError(input, message) {
    input.classList.add('is-invalid');
    if (!input.nextElementSibling || !input.nextElementSibling.classList.contains('invalid-feedback')) {
        const feedback = document.createElement('div');
        feedback.classList.add('invalid-feedback');
        feedback.textContent = message;
        input.parentNode.appendChild(feedback);
    } else {
        input.nextElementSibling.textContent = message;
    }
}

function clearError(input) {
    input.classList.remove('is-invalid');
    if (input.nextElementSibling && input.nextElementSibling.classList.contains('invalid-feedback')) {
        input.nextElementSibling.textContent = '';
    }
}

// Pincode Auto-fill
async function validateAndFillPincode(pincodeInput, cityInput, stateSelect) {
    const pincode = pincodeInput.value.trim();
    
    if (!pincode || pincode.length !== 6 || !/^[1-9][0-9]{5}$/.test(pincode)) {
        return;
    }

    try {
        showToast('Fetching location details...', 'info');
        const response = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`);
        const data = response.data[0];

        if (data.Status === "Success" && data.PostOffice && data.PostOffice.length > 0) {
            const office = data.PostOffice[0];
            cityInput.value = office.District || office.Block || '';
            const stateValue = office.State || '';
            
            if (stateSelect.querySelector(`option[value="${stateValue}"]`)) {
                stateSelect.value = stateValue;
            } else {
                showToast(`State "${stateValue}" not found in list. Please select manually.`, 'warning');
            }

            if (cityInput.value) {
                showToast(`Auto-filled: ${cityInput.value}, ${stateValue}`, 'success');
            } else {
                showToast('Pincode valid, but city details unavailable. Fill manually.', 'warning');
            }
        } else {
            throw new Error('Invalid pincode');
        }
    } catch (error) {
        console.error('Pincode API error:', error);
        showToast('Invalid pincode – no matching location found.', 'error');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const addressModal = new bootstrap.Modal(document.getElementById('addressModal'));
    const btnAddNewAddress = document.getElementById('btnAddNewAddress');
    const btnSaveAddress = document.getElementById('btnSaveAddress');
    const addressForm = document.getElementById('addressForm');
    const btnContinueToPayment = document.getElementById('btnContinueToPayment');

    // Form inputs
    const fullNameInput = document.getElementById('fullName');
    const phoneInput = document.getElementById('phone');
    const alternatePhoneInput = document.getElementById('alternatePhone');
    const addressLine1Input = document.getElementById('addressLine1');
    const cityInput = document.getElementById('city');
    const stateSelect = document.getElementById('state');
    const pincodeInput = document.getElementById('pincode');

    // Add focus event to clear errors
    [fullNameInput, phoneInput, alternatePhoneInput, addressLine1Input, cityInput, stateSelect, pincodeInput].forEach(input => {
        input.addEventListener('focus', () => clearError(input));
    });

    // Phone input restrictions
    phoneInput.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '');
        if (this.value.length > 10) {
            this.value = this.value.slice(0, 10);
        }
    });

    alternatePhoneInput.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '');
        if (this.value.length > 10) {
            this.value = this.value.slice(0, 10);
        }
    });

    // Pincode restrictions and auto-fill
    pincodeInput.addEventListener('input', function(e) {
        e.target.value = e.target.value.replace(/\D/g, '');
        if (e.target.value.length > 6) {
            e.target.value = e.target.value.slice(0, 6);
        }
        
        if (e.target.value.length === 6) {
            validateAndFillPincode(pincodeInput, cityInput, stateSelect);
        }
    });

    // Real-time validation on blur
    fullNameInput.addEventListener('blur', function() {
        const validation = validateFullName(this.value);
        if (!validation.valid) showError(this, validation.message);
    });

    phoneInput.addEventListener('blur', function() {
        const validation = validatePhone(this.value);
        if (!validation.valid) showError(this, validation.message);
    });

    alternatePhoneInput.addEventListener('blur', function() {
        if (this.value) {
            const validation = validateAlternatePhone(this.value);
            if (!validation.valid) showError(this, validation.message);
        }
    });

    addressLine1Input.addEventListener('blur', function() {
        const validation = validateAddress(this.value, 'Address Line 1');
        if (!validation.valid) showError(this, validation.message);
    });

    cityInput.addEventListener('blur', function() {
        const validation = validateCity(this.value);
        if (!validation.valid) showError(this, validation.message);
    });

    stateSelect.addEventListener('blur', function() {
        const validation = validateState(this.value);
        if (!validation.valid) showError(this, validation.message);
    });

    pincodeInput.addEventListener('blur', function() {
        const validation = validatePincode(this.value);
        if (!validation.valid) showError(this, validation.message);
    });

    // Open Modal for Add New Address
    btnAddNewAddress.addEventListener('click', function() {
        document.getElementById('addressModalTitle').textContent = 'Add New Address';
        addressForm.reset();
        
        // Reset address type to Home
        document.querySelectorAll('.address-type-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.address-type-btn').classList.add('active');
        document.getElementById('addressType').value = 'Home';
        
        // Clear all errors
        document.querySelectorAll('.is-invalid').forEach(el => clearError(el));
        
        addressModal.show();
    });

    // Save Address (Add Only)
    btnSaveAddress.addEventListener('click', async function() {
        // Clear previous errors
        document.querySelectorAll('.is-invalid').forEach(el => clearError(el));

        // Get form values
        const fullName = fullNameInput.value;
        const phone = phoneInput.value;
        const alternatePhone = alternatePhoneInput.value;
        const addressLine1 = addressLine1Input.value;
        const addressLine2 = document.getElementById('addressLine2').value;
        const city = cityInput.value;
        const state = stateSelect.value;
        const pincode = pincodeInput.value;
        const addressType = document.getElementById('addressType').value;
        const isDefault = document.getElementById('isDefault').checked;

        // Validate all fields
        let isValid = true;
        const validations = [
            { element: fullNameInput, validation: validateFullName(fullName) },
            { element: phoneInput, validation: validatePhone(phone) },
            { element: alternatePhoneInput, validation: validateAlternatePhone(alternatePhone) },
            { element: addressLine1Input, validation: validateAddress(addressLine1, 'Address Line 1') },
            { element: cityInput, validation: validateCity(city) },
            { element: stateSelect, validation: validateState(state) },
            { element: pincodeInput, validation: validatePincode(pincode) }
        ];

        validations.forEach(({ element, validation }) => {
            if (!validation.valid) {
                showError(element, validation.message);
                isValid = false;
            }
        });

        if (!isValid) {
            showToast('Please fix all errors before submitting', 'error');
            return;
        }

        // Prepare data
        const data = {
            addressType,
            fullName: fullName.trim(),
            phone: phone.trim(),
            alternatePhone: alternatePhone.trim(),
            addressLine1: addressLine1.trim(),
            addressLine2: addressLine2.trim(),
            city: city.trim(),
            state,
            pincode: pincode.trim(),
            country: 'India',
            isDefault
        };

        try {
            const response = await axios.post('/checkout/add-address', data, {
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.data.success) {
                showToast(response.data.message, 'success');
                addressModal.hide();
                setTimeout(() => window.location.reload(), 1000);
            } else {
                showToast(response.data.message, 'error');
            }
        } catch (error) {
            console.error('Submit error:', error);
            showToast(error.response?.data?.message || 'Failed to save address', 'error');
        }
    });

    // Continue to Payment
    btnContinueToPayment.addEventListener('click', async function() {
        const selectedAddress = document.querySelector('input[name="shipping_address"]:checked');
        
        if (!selectedAddress) {
            showToast('Please select a delivery address', 'warning');
            return;
        }

        const addressId = selectedAddress.value;
        
        try {
            showToast('Proceeding to payment...', 'info');
            
            const response = await axios.post('/checkout/continue-to-payment',{
                addressId
            },{
                headers: {'Content-Type': 'application/json'}
            });

            if(response.data.success){
                setTimeout(()=>{
                    window.location.href = '/payment';
                },2000)
                
            }else{
                showToast(response.data.message || 'Failed to proceed','error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast(error.response?.data?.message || 'An error occurred. Please try again.', 'error');
        }
    });
});