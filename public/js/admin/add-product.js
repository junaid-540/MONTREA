const modal = document.getElementById('variantModal');
const openBtn = document.getElementById('openModalBtn');
const closeBtn = document.getElementById('closeModal');
const saveBtn = document.getElementById('saveVariant');
const variantTable = document.querySelector('#variantTable tbody');
const variantImagesContainer = document.getElementById('variantImagesContainer');
const allVariantsImagesContainer = document.getElementById('allVariantsImagesContainer');
const variantImagesPreviewSection = document.getElementById('variantImagesPreviewSection');
const cropModal = document.getElementById('cropModal');
const cropImage = document.getElementById('cropImage');
const productForm = document.getElementById('productForm');

if (!productForm) {
  console.error('Form with id="productForm" not found!');
}

let currentCropper = null;
let currentUploadArea = null;
let variants = [];
let variantCount = 0;
let currentVariantIndex = 0;

// Helper to safely get form elements (with debug)
function getFormElements() {
  const form = document.getElementById('productForm');
  if (!form) {
    console.error('Form with id="productForm" not found!');
    return { nameInput: null, descInput: null, catSelect: null, highInput: null };
  }
  const nameInput = form.querySelector('input[name="name"]');
  const descInput = form.querySelector('textarea[name="description"]');
  // Fixed: Selector now matches EJS name="categoryId"
  const catSelect = form.querySelector('select[name="categoryId"]');
  const highInput = form.querySelector('input[name="highlights"]');

  // Debug: Log only if missing
  if (!nameInput) console.warn('Missing input[name="name"]');
  if (!descInput) console.warn('Missing textarea[name="description"]');
  if (!catSelect) console.warn('Missing select[name="categoryId"]');
  if (!highInput) console.warn('Missing input[name="highlights"]');

  return { nameInput, descInput, catSelect, highInput };
}

// Placeholder fallback (prevents 404)
function fixPlaceholderImages() {
  const placeholderImages = document.querySelectorAll('img[src="/placeholder.svg"]');
  const fallbackSrc = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgc3R5bGU9ImZpbGw6I2NjYyIgLz48L3N2Zz4=';  // Tiny gray circle
  placeholderImages.forEach(img => {
    img.src = fallbackSrc;
    img.alt = 'No image selected';
  });
}

function toastSuccess(msg, duration = 2500) {
  Toastify({ text: msg, duration, gravity: "top", position: "right", style: { background: "#27ae60" } }).showToast();
}
function toastError(msg, duration = 3500) {
  Toastify({ text: msg, duration, gravity: "top", position: "right", style: { background: "#e74c3c" } }).showToast();
}
function toastInfo(msg, duration = 2500) {
  Toastify({ text: msg, duration, gravity: "top", position: "right", style: { background: "#34495e" } }).showToast();
}

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

/* Add focus listeners (use dynamic query) */
document.addEventListener('DOMContentLoaded', function () {
  fixPlaceholderImages();  // Fix 404 on load
  const elements = getFormElements();
  [elements.nameInput, elements.descInput, elements.catSelect, elements.highInput].forEach(el => {
    if (el) {
      el.addEventListener('focus', () => hideError(el));
    }
  });

  // ADD FOCUS LISTENERS FOR VARIANT MODAL FIELDS (FIX FOR THE ISSUE)
  const variantColor = document.getElementById('variantColor');
  const variantSize = document.getElementById('variantSize');
  const variantPrice = document.getElementById('variantPrice');
  const variantDiscountPrice = document.getElementById('variantDiscountPrice');
  const variantStock = document.getElementById('variantStock');
  [variantColor, variantSize, variantPrice, variantDiscountPrice, variantStock].forEach(el => {
    if (el) {
      el.addEventListener('focus', () => hideError(el));
    }
  });

  getFormElements();  // Initial check
});

/* Validation functions - safe for empty strings */
function validateProductName(value) {
  const trimmed = (value || '').trim();
  const pattern = /^[A-Za-z0-9\s\-\&']+$/;
  if (!trimmed) return 'Product name is required';
  if (trimmed.length < 3) return 'Product name must be at least 3 characters';
  if (trimmed.length > 100) return 'Product name must not exceed 100 characters';
  if (!pattern.test(trimmed)) return 'Product name contains invalid characters';
  return null;
}
function validateDescription(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return 'Description is required';
  if (trimmed.length < 10) return 'Description must be at least 10 characters';
  if (trimmed.length > 2000) return 'Description must not exceed 2000 characters';
  return null;
}
function validateCategory(value) {
  if (!value) return 'Please select a category';
  return null;
}
function validateHighlights(value) {
  if (!value) return null; // optional
  const parts = value.split(',').map(p => p.trim()).filter(Boolean);
  for (let p of parts) {
    if (p.length < 2) return 'Each highlight must be at least 2 characters';
    if (p.length > 50) return 'Each highlight must not exceed 50 characters';
  }
  return null;
}

/* Variant-field validators (modal) */
function validateVariantColor(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return 'Color is required';
  if (trimmed.length < 3) return 'Color must be at least 3 characters';
  if (trimmed.length > 20) return 'Color must not exceed 20 characters';
  return null;
}
function validateVariantSize(value) {
  if (!value) return 'Size is required';
  return null;
}
function validateVariantPrice(value) {
  if (value === '' || value === null) return 'Price is required';
  const n = Number(value);
  if (Number.isNaN(n) || n <= 0) return 'Price must be a number greater than 0';
  if (n > 999999) return 'Price seems too large';
  return null;
}
function validateVariantDiscount(priceVal, discountVal) {
  if (discountVal === '' || discountVal === null) return null; // optional
  const p = Number(priceVal);
  const d = Number(discountVal);
  if (Number.isNaN(d) || d < 0) return 'Discount must be 0 or more';
  if (!Number.isNaN(p) && d >= p) return 'Discount price must be less than regular price';
  return null;
}
function validateVariantStock(value) {
  if (value === '' || value === null) return 'Stock is required';
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) return 'Stock must be an integer 0 or more';
  if (n > 99999) return 'Stock seems too large';
  return null;
}

/* File input handling with FLEXIBLE CROPPER */
function setupFileInputs() {
  document.addEventListener('change', function (e) {
    if (e.target.matches('input[type="file"]')) {
      const input = e.target;
      if (input.files && input.files[0]) {
        const file = input.files[0];
        if (!file.type.match('image.*')) {
          toastError('Please select an image file.');
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
              // FLEXIBLE ASPECT RATIO - allows any width/height
              currentCropper = new Cropper(cropImg, {
                aspectRatio: NaN, // Free aspect ratio
                viewMode: 1,
                guides: true,
                background: false,
                autoCropArea: 0.9,
                minCropBoxWidth: 200,
                minCropBoxHeight: 200
              });
            }
          }, 80);
        };
        reader.readAsDataURL(file);
      }
    }
  });
}

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
      if (fileInput) fileInput.value = '';
      if (hiddenInput) hiddenInput.value = '';
      if (previewContainer) previewContainer.classList.add('hidden');
      if (uploadIcon) uploadIcon.classList.remove('hidden');
      if (uploadText) {
        uploadText.classList.remove('hidden');
        uploadText.textContent = `Image ${parseInt(uploadArea.dataset.image) + 1}`;
      }
      toastInfo('Image removed');
    }
  });
}

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

/* UPDATED Crop modal with flexible canvas sizing */
function setupCropModal() {
  const closeBtnCrop = document.querySelector('#cropModal .close');
  const cancelBtn = document.getElementById('cancelCrop');
  const applyBtn = document.getElementById('applyCrop');
  
  if (closeBtnCrop) closeBtnCrop.onclick = () => closeCropper();
  if (cancelBtn) cancelBtn.onclick = () => closeCropper();
  
  if (applyBtn) {
    applyBtn.onclick = () => {
      if (currentCropper && currentUploadArea) {
        // Get the cropped area dimensions
        const cropData = currentCropper.getData();
        
        
        const maxWidth = 1200;
        const maxHeight = 1600;
        
        let canvasWidth = Math.round(cropData.width);
        let canvasHeight = Math.round(cropData.height);
        
        // Scale down proportionally if needed
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
        
        const previewImg = currentUploadArea.querySelector('.image-preview');
        if (previewImg) previewImg.src = croppedImageData;
        
        const hiddenInput = currentUploadArea.querySelector('.cropped-image-data');
        if (hiddenInput) hiddenInput.value = croppedImageData;
        
        currentUploadArea.querySelector('.image-preview-container')?.classList.remove('hidden');
        currentUploadArea.querySelector('.upload-icon')?.classList.add('hidden');
        currentUploadArea.querySelector('.upload-text')?.classList.add('hidden');
        
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
  if (modal) modal.style.display = 'flex';
}

// Variant modal handlers for open , close , save 
function setupModalHandlers() {
  if (openBtn) {
    openBtn.onclick = (e) => {
      e.preventDefault(); e.stopPropagation();
      variantCount++;
      currentVariantIndex = variantCount - 1;
      updateVariantNames(currentVariantIndex);
      if (modal) modal.style.display = 'flex';
    };
  }
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.preventDefault(); e.stopPropagation();
      closeVariantModal();
    };
  }
  if (saveBtn) {
    saveBtn.onclick = (e) => {
      e.preventDefault(); e.stopPropagation();
      saveVariant();
    };
  }
  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) closeVariantModal();
    };
  }
}
function closeVariantModal() {
  if (modal) modal.style.display = 'none';
  clearVariantModal();
}
function clearVariantModal() {
  const colorEl = document.getElementById('variantColor');
  const sizeEl = document.getElementById('variantSize');
  const priceEl = document.getElementById('variantPrice');
  const discountEl = document.getElementById('variantDiscountPrice');
  const stockEl = document.getElementById('variantStock');
  [colorEl, sizeEl, priceEl, discountEl, stockEl].forEach(el => {
    if (el) {
      el.value = '';
      hideError(el);
      const feedback = el.nextElementSibling;
      if (feedback && feedback.classList.contains('invalid-feedback')) {
        feedback.textContent = '';
      }
    }
  });
  if (variantImagesContainer) {
    const uploadAreas = variantImagesContainer.querySelectorAll('.image-upload');
    uploadAreas.forEach((area) => {
      const fileInput = area.querySelector('input[type="file"]');
      const hiddenInput = area.querySelector('.cropped-image-data');
      const previewContainer = area.querySelector('.image-preview-container');
      const uploadIcon = area.querySelector('.upload-icon');
      const uploadText = area.querySelector('.upload-text');
      if (fileInput) fileInput.value = '';
      if (hiddenInput) hiddenInput.value = '';
      if (previewContainer) previewContainer.classList.add('hidden');
      if (uploadIcon) uploadIcon.classList.remove('hidden');
      if (uploadText) {
        uploadText.classList.remove('hidden');
        uploadText.textContent = `Image ${parseInt(area.dataset.image) + 1}`;
      }
    });
  }
  if (currentCropper) {
    currentCropper.destroy();
    currentCropper = null;
  }
}

/* updateVariantNames keeps file input names/ids consistent */
function updateVariantNames(index) {
  if (!variantImagesContainer) return;
  const uploadAreas = variantImagesContainer.querySelectorAll('.image-upload');
  uploadAreas.forEach((area, i) => {
    area.dataset.variant = index;
    const fileInput = area.querySelector('input[type="file"]');
    const hiddenInput = area.querySelector('.cropped-image-data');
    if (fileInput) {
      fileInput.name = `variants[${index}][images][${i}]`;
      fileInput.id = `variantImage-${index}-${i}`;
    }
    if (hiddenInput) hiddenInput.name = `variants[${index}][croppedImages][${i}]`;
    const btn = area.querySelector('.upload-btn');
    if (btn) btn.onclick = () => {
      const idEl = document.getElementById(`variantImage-${index}-${i}`);
      if (idEl) idEl.click();
    };
  });
}

/* Save variant (with inline validation) */
function saveVariant() {
  const colorEl = document.getElementById('variantColor');
  const sizeEl = document.getElementById('variantSize');
  const priceEl = document.getElementById('variantPrice');
  const discountEl = document.getElementById('variantDiscountPrice');
  const stockEl = document.getElementById('variantStock');
  const color = colorEl?.value?.trim() || '';
  const size = sizeEl?.value || '';
  const price = priceEl?.value || '';
  const discountedPrice = discountEl?.value || '';
  const stock = stockEl?.value || '';
  // validate modal fields
  let isValid = true;
  const colorErr = validateVariantColor(color);
  if (colorErr) { showError(colorEl, colorErr); isValid = false; } else hideError(colorEl);
  const sizeErr = validateVariantSize(size);
  if (sizeErr) { showError(sizeEl, sizeErr); isValid = false; } else hideError(sizeEl);
  const priceErr = validateVariantPrice(price);
  if (priceErr) { showError(priceEl, priceErr); isValid = false; } else hideError(priceEl);
  const discountErr = validateVariantDiscount(price, discountedPrice);
  if (discountErr) { showError(discountEl, discountErr); isValid = false; } else hideError(discountEl);
  const stockErr = validateVariantStock(stock);
  if (stockErr) { showError(stockEl, stockErr); isValid = false; } else hideError(stockEl);
  // validate images: must have exactly 3 cropped images
  if (variantImagesContainer) {
    const croppedInputs = variantImagesContainer.querySelectorAll('.cropped-image-data');
    const filledCount = Array.from(croppedInputs).filter(input => input.value && input.value.length > 10).length;
    if (filledCount !== 3) {
      toastError('Exactly 3 images are required for this variant.');
      isValid = false;
    }
  }
  if (!isValid) return;
  // collect cropped images (filter valid base64 only)
  const croppedImages = Array.from(variantImagesContainer.querySelectorAll('.cropped-image-data'))
    .map(input => input.value)
    .filter(dataUrl => dataUrl && dataUrl.length > 10);
  const variant = {
    color,
    size,
    price,
    discountedPrice,
    stock,
    croppedImages
  };
  variants.push(variant);
  renderVariants();
  closeVariantModal();
  if (isValid) toastSuccess('Variant added');
}

/* Render variants table + preview */
function renderVariants() {
  if (!variantTable) return;
  variantTable.innerHTML = variants.map((v, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${v.color}</td>
      <td>${v.size}</td>
      <td>₹${v.price}</td>
      <td>${v.discountedPrice || '-'}</td>
      <td>${v.stock}</td>
      <td><button type="button" data-index="${i}" class="btn-danger delete-variant" style="padding:5px 10px;">🗑️</button></td>
    </tr>
  `).join('');
  // Add event listeners for delete buttons via delegation
  document.querySelectorAll('.delete-variant').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = Number(btn.dataset.index);
      Swal.fire({
        title: 'Are you sure?',
        text: 'This will delete the variant.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete',
        confirmButtonColor: '#e31414'
      }).then(result => {
        if (result.isConfirmed) {
          variants.splice(idx, 1);
          renderVariants();
          toastInfo('Variant deleted');
        }
      });
    });
  });
  // PREVIEW
  if (allVariantsImagesContainer && variantImagesPreviewSection) {
    allVariantsImagesContainer.innerHTML = variants.map((v, i) => `
      <div class="variant-preview-card">
        <div class="variant-preview-header">
          <h4>Variant ${i + 1}: ${v.color} - ${v.size}</h4>
        </div>
        <div class="variant-preview-images">
          ${v.croppedImages.map((imgSrc, j) => `
            <div class="preview-image-wrapper">
              <img src="${imgSrc}" alt="Image ${j+1}" class="preview-image">
              <span class="image-number">Image ${j+1}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
    variantImagesPreviewSection.style.display = variants.length > 0 ? 'block' : 'none';
  }
}

function setupFormSubmission() {
  if (!productForm) {
    console.error('Cannot set up submission: productForm is null');
    return;
  }
  productForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    // Re-query elements fresh on submit
    const elements = getFormElements();
    const { nameInput, descInput, catSelect, highInput } = elements;
    // Safe value access
    const nameValue = nameInput?.value || '';
    const descValue = descInput?.value || '';
    const catValue = catSelect?.value || '';
    const highValue = highInput?.value || '';
    // --- Inline product validation ---
    const nameErr = validateProductName(nameValue);
    const descErr = validateDescription(descValue);
    const catErr = validateCategory(catValue);
    const highErr = validateHighlights(highValue);
    let isValid = true;
    if (nameErr) { showError(nameInput, nameErr); isValid = false; } else hideError(nameInput);
    if (descErr) { showError(descInput, descErr); isValid = false; } else hideError(descInput);
    if (catErr) { showError(catSelect, catErr); isValid = false; } else hideError(catSelect);
    if (highErr) { showError(highInput, highErr); isValid = false; } else hideError(highInput);
    if (variants.length === 0) {
      toastError('Please add at least one variant.');
      isValid = false;
    }
    if (!isValid) return;
    // --- Build FormData ---
    const formData = new FormData();
    formData.append('name', nameValue.trim());
    formData.append('description', descValue.trim());
    formData.append('categoryId', catValue);
    formData.append('highlights', highValue.trim());
    // Prepare variants for sending
    const variantsData = variants.map((variant, i) => {
      const images = variant.croppedImages.map((imgData, j) => {
        if (!imgData || imgData.length < 10) return null;  // Skip invalid
        const blob = dataURLtoBlob(imgData);
        formData.append(`variantImages[${i}][]`, blob, `variant-${i}-image-${j}.jpg`);
        return `variant-${i}-image-${j}.jpg`; // optional, for reference
      }).filter(Boolean);
      return {
        color: variant.color,
        size: variant.size,
        price: variant.price,
        discountedPrice: variant.discountedPrice,
        stock: variant.stock,
        images // optional, backend can ignore
      };
    });
    formData.append('variants', JSON.stringify(variantsData));
    // Disable submit button
    const submitBtn = productForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('loading');
    }
    
    try {
      const response = await fetch('/admin/products/add', {
        method: 'POST',
        body: formData,  
      });
      const data = await response.json();
      if (response.ok) {
        toastSuccess('Product added successfully!');
        setTimeout(() => window.location.href = '/admin/products', 900);
      } else {
        const msg = data?.message || 'Error adding product.';
        toastError(msg);
      }
    } catch (err) {
      console.error('Product add error:', err);
      const errMsg = err.message || 'Server error';
      Swal.fire({ icon: 'error', title: 'Oops!', text: errMsg, confirmButtonColor: '#e31414' });
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
      }
    }
  });
}

/* Helper: Convert dataURL to Blob */
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


document.addEventListener('DOMContentLoaded', function () {
  setupFileInputs();
  setupDeleteButtons();
  setupDragAndDrop();
  setupCropModal();
  setupModalHandlers();
  setupFormSubmission();
});