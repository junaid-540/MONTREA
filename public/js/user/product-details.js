const variants = window.variants || [];

// Image Zoom Functionality
function initImageZoom() {
    const container = document.querySelector('.image-zoom-container');
    const img = document.getElementById("mainImage");
    const lens = document.getElementById("zoomLens");
    const result = document.getElementById("zoomResult");
    
    if (!container || !img || !lens || !result) {
        console.log('Zoom elements not found');
        return;
    }

    // Calculate zoom ratio
    const zoomRatio = 2.5;

    // Mouse enter - show zoom elements
    container.addEventListener('mouseenter', function() {
        lens.style.display = 'block';
        result.style.display = 'block';
        result.style.backgroundImage = `url('${img.src}')`;
    });

    // Mouse leave - hide zoom elements
    container.addEventListener('mouseleave', function() {
        lens.style.display = 'none';
        result.style.display = 'none';
    });

    // Mouse move - update zoom position
    container.addEventListener('mousemove', function(e) {
        const rect = img.getBoundingClientRect();
        
        // Calculate cursor position relative to image
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        
        // Calculate lens position (centered on cursor)
        let lensX = x - (lens.offsetWidth / 2);
        let lensY = y - (lens.offsetHeight / 2);
        
        // Keep lens within image boundaries
        lensX = Math.max(0, Math.min(lensX, rect.width - lens.offsetWidth));
        lensY = Math.max(0, Math.min(lensY, rect.height - lens.offsetHeight));
        
        // Position the lens
        lens.style.left = lensX + 'px';
        lens.style.top = lensY + 'px';
        
        // Calculate background position for zoomed image
        const bgX = -(lensX * zoomRatio);
        const bgY = -(lensY * zoomRatio);
        
        // Update zoom result
        result.style.backgroundPosition = `${bgX}px ${bgY}px`;
        result.style.backgroundSize = `${rect.width * zoomRatio}px ${rect.height * zoomRatio}px`;
    });
}

// Initialize zoom when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initImageZoom);
} else {
    initImageZoom();
}

function changeImage(src, element) {
    const img = document.getElementById('mainImage');
    const result = document.getElementById("zoomResult");
    
    img.src = src;
    
    // Update zoom background image
    if (result) {
        result.style.backgroundImage = `url('${src}')`;
    }
    
    // Update active thumbnail
    document.querySelectorAll('.thumbnail').forEach(thumb => {
        thumb.classList.remove('active');
    });
    element.classList.add('active');
}

function selectColor(color, element) {
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    element.classList.add('active');
    document.getElementById('selectedColor').value = color;
    
    updateVariant();
}

function selectSize(size, element) {
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    element.classList.add('active');
    document.getElementById('selectedSize').value = size;
    
    updateVariant();
}

function updateVariant() {
    const selectedColor = document.getElementById('selectedColor').value;
    const selectedSize = document.getElementById('selectedSize').value;
    
    // Find matching variant
    const matchedVariant = variants.find(v => 
        v.color === selectedColor && v.size === selectedSize
    );
    
    if (matchedVariant) {
        // Update images
        if (matchedVariant.images && matchedVariant.images.length > 0) {
            const img = document.getElementById('mainImage');
            const result = document.getElementById("zoomResult");
            
            img.src = matchedVariant.images[0].url;
            
            // Update zoom background
            if (result) {
                result.style.backgroundImage = `url('${matchedVariant.images[0].url}')`;
            }
            
            // Update thumbnails
            const thumbnailContainer = document.querySelector('.thumbnail-images');
            thumbnailContainer.innerHTML = '';
            matchedVariant.images.forEach((image, index) => {
                const imgEl = document.createElement('img');
                imgEl.src = image.url;
                imgEl.alt = 'Product Image ' + (index + 1);
                imgEl.className = 'thumbnail' + (index === 0 ? ' active' : '');
                imgEl.onclick = function() { changeImage(image.url, this); };
                thumbnailContainer.appendChild(imgEl);
            });
        }
        
        // Update price
        const priceElement = document.getElementById('currentPrice');
        if (matchedVariant.discountedPrice > 0 && matchedVariant.discountedPrice < matchedVariant.price) {
            priceElement.textContent = '₹' + matchedVariant.discountedPrice.toFixed(2);
        } else {
            priceElement.textContent = '₹' + matchedVariant.price.toFixed(2);
        }
        
        // Update stock info
        const stockInfo = document.querySelector('.stock-info');
        const addToCartBtn = document.getElementById('addToCartBtn');
        
        if (matchedVariant.stock === 0) {
            stockInfo.className = 'stock-info out-of-stock';
            stockInfo.innerHTML = '<i class="fas fa-times-circle me-2"></i>Out of Stock';
            addToCartBtn.disabled = true;
            addToCartBtn.textContent = 'OUT OF STOCK';
        } else if (matchedVariant.stock < 10) {
            stockInfo.className = 'stock-info low-stock';
            stockInfo.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i>Only ' + matchedVariant.stock + ' left in stock';
            addToCartBtn.disabled = false;
            addToCartBtn.textContent = 'ADD TO CART';
        } else {
            stockInfo.className = 'stock-info in-stock';
            stockInfo.innerHTML = '<i class="fas fa-check-circle me-2"></i>In Stock';
            addToCartBtn.disabled = false;
            addToCartBtn.textContent = 'ADD TO CART';
        }
    }
}

// // Add to cart functionality
// document.addEventListener('DOMContentLoaded', function() {
//     const addToCartBtn = document.getElementById('addToCartBtn');
//     if (addToCartBtn) {
//         addToCartBtn.addEventListener('click', function() {
//             const selectedColor = document.getElementById('selectedColor').value;
//             const selectedSize = document.getElementById('selectedSize').value;
            
//             // Find the variant ID
//             const variant = variants.find(v => 
//                 v.color === selectedColor && v.size === selectedSize
//             );
            
//             if (variant) {
//                 // TODO: Implement add to cart API call
//                 console.log('Adding to cart:', {
//                     productId: window.productId,
//                     variantId: variant._id,
//                     color: selectedColor,
//                     size: selectedSize
//                 });
                
//                 alert('Product added to cart!');
//             }
//         });
//     }

//     // Add to wishlist functionality
//     const addToWishlistBtn = document.getElementById('addToWishlistBtn');
//     if (addToWishlistBtn) {
//         addToWishlistBtn.addEventListener('click', function() {
//             // TODO: Implement add to wishlist API call
//             console.log('Adding to wishlist:', {
//                 productId: window.productId
//             });
            
//             alert('Product added to wishlist!');
//         });
//     }
// });