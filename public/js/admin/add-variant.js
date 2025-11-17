const variantForm = document.getElementById('addVariantForm');
const variantImagesContainer = document.getElementById('variantImagesContainer');
const cropModal = document.getElementById('cropModal');
const cropImage = document.getElementById('cropImage');

let currentCropper = null;
let currentUploadArea = null;

// Toast notifications
function toastSuccess(msg, duration = 2500) {
  Toastify({ 
    text: msg, 
    duration, 
    gravity: "top", 
    position: "right", 
    style: { background: "#27ae60" } 
  }).showToast();
}

function toastError(msg, duration = 3500) {
  Toastify({ 
    text: msg, 
    duration, 
    gravity: "top", 
    position: "right", 
    style: { background: "#e74c3c" } 
  }).showToast();
}

function toastInfo(msg, duration = 2500) {
  Toastify({ 
    text: msg, 
    duration, 
    gravity: "top", 
    position: "right", 
    style: { background: "#34495e" } 
  }).showToast();
}

// Inline error handling
function showError(input, message) {
  if (!input) return;
  input.classList.add('is-invalid');
  let feedback = input.nextElementSibling;
  if (!feedback || !feedback.classList.contains('invalid-feedback')) {
    feedback = document.createElement('div');
    feedback.classList.add('invalid-feedback');
    input.parentNode.appendChild(feedback);
  }
  feedback.textContent = message;
}

function hideError(input) {
  if (!input) return;
  input.classList.remove('is-invalid');
  const feedback = input.nextElementSibling;
  if (feedback && feedback.classList.contains('invalid-feedback')) {
    feedback.textContent = '';
  }
}

// Validation functions
function validateColor(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return 'Color is required';
  if (trimmed.length < 3) return 'Color must be at least 3 characters';
  if (trimmed.length > 20) return 'Color must not exceed 20 characters';
  if (!/^[A-Za-z\s\-]+$/.test(trimmed)) return 'Color contains invalid characters';
  return null;
}

function validateSize(value) {
  if (!value) return 'Size is required';
  return null;
}

function validatePrice(value) {
  if (value === '' || value === null) return 'Price is required';
  const n = Number(value);
  if (Number.isNaN(n) || n <= 0) return 'Price must be greater than 0';
  if (n > 999999) return 'Price seems too large';
  return null;
}

function validateDiscountPrice(priceVal, discountVal) {
  if (discountVal === '' || discountVal === null) return null; 
  const p = Number(priceVal);
  const d = Number(discountVal);
  if (Number.isNaN(d) || d < 0) return 'Discount price must be 0 or more';
  if (!Number.isNaN(p) && d >= p) return 'Discount price must be less than regular price';
  return null;
}

function validateStock(value) {
  if (value === '' || value === null) return 'Stock is required';
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return 'Stock must be 0 or more';
  if (n > 99999) return 'Stock seems too large';
  return null;
}


function fixPlaceholderImages() {
  const placeholderImages = document.querySelectorAll('img[src="/placeholder.svg"]');
  const fallbackSrc = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgc3R5bGU9ImZpbGw6I2NjYyIgLz48L3N2Zz4=';
  placeholderImages.forEach(img => {
    img.src = fallbackSrc;
    img.alt = 'No image selected';
  });
}

// File input handling with cropper
function setupFileInputs() {
  document.addEventListener('change', function (e) {
    if (e.target.matches('input[type="file"]')) {
      const input = e.target;
      if (input.files && input.files[0]) {
        const file = input.files[0];
        if (!file.type.match('image.*')) {
          toastError('Please select an image file.');
          input.value = '';
          return;
        }
        
        const reader = new FileReader();
        reader.onload = function (ev) {
          currentUploadArea = input.closest('.image-upload');
          const cropImg = document.getElementById('cropImage');
          if (cropImg) cropImg.src = ev.target.result;
          
          // Show crop modal
          if (cropModal) cropModal.style.display = 'block';
          
          setTimeout(() => {
            if (currentCropper) {
              currentCropper.destroy();
              currentCropper = null;
            }
            if (cropImg) {
              //  Free aspect ratio (recommended for varied images)
              currentCropper = new Cropper(cropImg, {
                aspectRatio: NaN, // Free aspect ratio - allows any width/height
                viewMode: 1,
                guides: true,
                background: false,
                autoCropArea: 0.9,
                minCropBoxWidth: 200,
                minCropBoxHeight: 200
              });
              
              //  If you want to maintain some control but allow wider images:
              // Uncomment this and comment out the above one
              /*
              // Calculate aspect ratio based on image dimensions
              const img = new Image();
              img.onload = function() {
                const imageAspectRatio = img.width / img.height;
                
                if (currentCropper) {
                  currentCropper.destroy();
                }
                
                currentCropper = new Cropper(cropImg, {
                  aspectRatio: imageAspectRatio, // Use original image aspect ratio
                  viewMode: 1,
                  guides: true,
                  background: false,
                  autoCropArea: 0.9
                });
              };
              img.src = ev.target.result;
              */
            }
          }, 100);
        };
        reader.readAsDataURL(file);
      }
    }
  });
}

// Delete image buttons
function setupDeleteButtons() {
  document.addEventListener('click', function (e) {
    if (e.target.closest('.delete-image-btn')) {
      const deleteBtn = e.target.closest('.delete-image-btn');
      const uploadArea = deleteBtn.closest('.image-upload');
      const fileInput = uploadArea.querySelector('input[type="file"]');
      const hiddenInput = uploadArea.querySelector('.cropped-image-data');
      const previewContainer = uploadArea.querySelector('.image-preview-container');
      const uploadIcon = uploadArea.querySelector('.upload-icon');
      const uploadText = uploadArea.querySelector('.upload-text');
      const uploadBtn = uploadArea.querySelector('.upload-btn');
      
      if (fileInput) fileInput.value = '';
      if (hiddenInput) hiddenInput.value = '';
      if (previewContainer) previewContainer.classList.add('hidden');
      if (uploadIcon) uploadIcon.classList.remove('hidden');
      if (uploadText) uploadText.classList.remove('hidden');
      if (uploadBtn) uploadBtn.classList.remove('hidden');
      
      toastInfo('Image removed');
    }
  });
}

// Drag and drop
function setupDragAndDrop() {
  document.addEventListener('dragover', function (e) {
    if (e.target.closest('.image-upload')) {
      e.preventDefault();
      e.target.closest('.image-upload').classList.add('dragover');
    }
  });
  
  document.addEventListener('dragleave', function (e) {
    if (e.target.closest('.image-upload')) {
      e.target.closest('.image-upload').classList.remove('dragover');
    }
  });
  
  document.addEventListener('drop', function (e) {
    const uploadArea = e.target.closest('.image-upload');
    if (uploadArea) {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      const files = e.dataTransfer.files;
      
      if (files.length > 0 && files[0].type.startsWith('image/')) {
        const fileInput = uploadArea.querySelector('input[type="file"]');
        if (fileInput) {
          const dt = new DataTransfer();
          dt.items.add(files[0]);
          fileInput.files = dt.files;
          const event = new Event('change');
          fileInput.dispatchEvent(event);
        }
      } else {
        toastError('Please drop an image file.');
      }
    }
  });
}

// Crop modal setup
function setupCropModal() {
  const closeBtnCrop = document.querySelector('#cropModal .close');
  const cancelBtn = document.getElementById('cancelCrop');
  const applyBtn = document.getElementById('applyCrop');
  
  if (closeBtnCrop) closeBtnCrop.onclick = () => closeCropper();
  if (cancelBtn) cancelBtn.onclick = () => closeCropper();
  
  if (applyBtn) {
    applyBtn.onclick = () => {
      if (currentCropper && currentUploadArea) {
        // Get the cropped area data
        const cropData = currentCropper.getData();
        
        
        const maxWidth = 1200;
        const maxHeight = 1600;
        
        let canvasWidth = Math.round(cropData.width);
        let canvasHeight = Math.round(cropData.height);
        
        // Scale down if needed while maintaining aspect ratio
        if (canvasWidth > maxWidth || canvasHeight > maxHeight) {
          const ratio = Math.min(maxWidth / canvasWidth, maxHeight / canvasHeight);
          canvasWidth = Math.round(canvasWidth * ratio);
          canvasHeight = Math.round(canvasHeight * ratio);
        }
        
        const canvas = currentCropper.getCroppedCanvas({
          width: canvasWidth,
          height: canvasHeight,
          fillColor: '#fff',
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high'
        });
        
        const croppedImageData = canvas.toDataURL('image/jpeg', 0.9);
        
        // Get existing elements
        const previewImg = currentUploadArea.querySelector('.image-preview');
        const hiddenInput = currentUploadArea.querySelector('.cropped-image-data');
        const previewContainer = currentUploadArea.querySelector('.image-preview-container');
        const uploadIcon = currentUploadArea.querySelector('.upload-icon');
        const uploadText = currentUploadArea.querySelector('.upload-text');
        const uploadBtn = currentUploadArea.querySelector('.upload-btn');
        
        // Set preview image
        if (previewImg) previewImg.src = croppedImageData;
        
        // Store cropped data
        if (hiddenInput) hiddenInput.value = croppedImageData;
        
        // Show/hide elements
        if (previewContainer) previewContainer.classList.remove('hidden');
        if (uploadIcon) uploadIcon.classList.add('hidden');
        if (uploadText) uploadText.classList.add('hidden');
        if (uploadBtn) uploadBtn.classList.add('hidden');
        
        closeCropper();
        toastSuccess('Image cropped successfully');
      }
    };
  }
  
  if (cropModal) {
    cropModal.onclick = function (event) {
      if (event.target === cropModal) {
        closeCropper();
      }
    };
  }
}

function closeCropper() {
  if (cropModal) cropModal.style.display = 'none';
  if (currentCropper) {
    currentCropper.destroy();
    currentCropper = null;
  }
  currentUploadArea = null;
}

// Helper: Convert dataURL to Blob
function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}


function setupFormSubmission() {
  if (!variantForm) {
    console.error('Form with id="addVariantForm" not found!');
    return;
  }
  
  variantForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    
    
    const colorInput = variantForm.querySelector('input[name="color"]');
    const sizeSelect = variantForm.querySelector('select[name="size"]');
    const priceInput = variantForm.querySelector('input[name="price"]');
    const discountPriceInput = variantForm.querySelector('input[name="discountedPrice"]');
    const stockInput = variantForm.querySelector('input[name="stock"]');
    const productIdInput = variantForm.querySelector('input[name="productId"]');
    
    const color = colorInput?.value?.trim() || '';
    const size = sizeSelect?.value || '';
    const price = priceInput?.value || '';
    const discountPrice = discountPriceInput?.value || '';
    const stock = stockInput?.value || '';
    const productId = productIdInput?.value || '';
    
    
    let isValid = true;
    
    const colorErr = validateColor(color);
    if (colorErr) { showError(colorInput, colorErr); isValid = false; } else hideError(colorInput);
    
    const sizeErr = validateSize(size);
    if (sizeErr) { showError(sizeSelect, sizeErr); isValid = false; } else hideError(sizeSelect);
    
    const priceErr = validatePrice(price);
    if (priceErr) { showError(priceInput, priceErr); isValid = false; } else hideError(priceInput);
    
    const discountErr = validateDiscountPrice(price, discountPrice);
    if (discountErr) { showError(discountPriceInput, discountErr); isValid = false; } else hideError(discountPriceInput);
    
    const stockErr = validateStock(stock);
    if (stockErr) { showError(stockInput, stockErr); isValid = false; } else hideError(stockInput);
    
    // Validate images
    const croppedInputs = variantImagesContainer.querySelectorAll('.cropped-image-data');
    const croppedImages = Array.from(croppedInputs)
      .map(input => input.value)
      .filter(dataUrl => dataUrl && dataUrl.length > 10);
    
    if (croppedImages.length !== 3) {
      toastError('Exactly 3 images are required for this variant.');
      isValid = false;
    }
    
    if (!isValid) return;
    
    // Show confirmation dialog
    const result = await Swal.fire({
      title: 'Add Variant?',
      text: `Add ${color} - ${size} variant to this product?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Add It',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#27ae60',
      cancelButtonColor: '#95a5a6'
    });
    
    if (!result.isConfirmed) return;
    
    
    const formData = new FormData();
    formData.append('productId', productId);
    formData.append('color', color);
    formData.append('size', size);
    formData.append('price', price);
    formData.append('discountedPrice', discountPrice);
    formData.append('stock', stock);
    
    // Convert base64 images to Blobs
    croppedImages.forEach((imgData, index) => {
      const blob = dataURLtoBlob(imgData);
      formData.append('images', blob, `variant-image-${index + 1}.jpg`);
    });
    
    // Debug: Log what we're sending
    console.log('Sending data:', {
      productId,
      color,
      size,
      price,
      discountPrice,
      stock,
      imageCount: croppedImages.length
    });
    
    // Disable submit button
    const submitBtn = variantForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
    }
    
    try {
      // Using Axios instead of fetch
      const response = await axios.post(
        `/admin/products/${productId}/variants/add`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          
          timeout: 30000, // 30 second timeout
          onUploadProgress: (progressEvent) => {
            // Optional: Show upload progress
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log('Upload progress:', percentCompleted + '%');
          }
        }
      );
      
      // Axios wil automatically parses JSON response No need for response.json()
      
      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: response.data.message || 'Variant added successfully',
        confirmButtonColor: '#27ae60',
        timer: 2000
      });
      
      // Redirect to variants page
      window.location.href = `/admin/products/${productId}/variants`;
      
    } catch (error) {
      console.error('Variant add error:', error);
      
      // Axios puts response data in error.response
      let errorMessage = 'Server error occurred';
      
      if (error.response) {
        // Server responded with error status
        errorMessage = error.response.data?.message || `Error: ${error.response.status}`;
        console.error('Server error:', error.response.data);
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        // Error setting up request
        errorMessage = error.message;
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Oops!',
        text: errorMessage,
        confirmButtonColor: '#e74c3c'
      });
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Variant';
      }
    }
  });
}

// Add focus listeners to hide errors on input
function setupFocusListeners() {
  const inputs = [
    variantForm?.querySelector('input[name="color"]'),
    variantForm?.querySelector('select[name="size"]'),
    variantForm?.querySelector('input[name="price"]'),
    variantForm?.querySelector('input[name="discountedPrice"]'),
    variantForm?.querySelector('input[name="stock"]')
  ];
  
  inputs.forEach(input => {
    if (input) {
      input.addEventListener('focus', () => hideError(input));
    }
  });
}

// Initialize everything
document.addEventListener('DOMContentLoaded', function () {
  fixPlaceholderImages();
  setupFileInputs();
  setupDeleteButtons();
  setupDragAndDrop();
  setupCropModal();
  setupFormSubmission();
  setupFocusListeners();
});