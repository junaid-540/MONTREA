const variants = window.variants || [];
const variantsWithPrices = window.variantsWithPrices || [];

function UpdateCartBadge(count){
    const cartLink = document.querySelector('a[href="/cart"]');
    if(!cartLink) return ;

    let badge = cartLink.querySelector('.cart-badge');
    if(count > 0){
        if(!badge){
            badge = document.createElement('span');
            badge.className = 'cart-badge';
            cartLink.appendChild(badge);
        }
        badge.textContent = count;
    }else{
        if(badge){
            badge.remove();
        }
    }
}

function UpdateWishlistBadge(count){
    const wishlistLink = document.querySelector('a[href="/wishlist"]');
    if(!wishlistLink) return ;

    let badge = wishlistLink.querySelector('.wishlist-badge');
    if(count > 0){
        if(!badge){
            badge = document.createElement('span');
            badge.className = 'wishlist-badge';
            wishlistLink.appendChild(badge);
        }
        badge.textContent = count;
    }else{
        if(badge){
            badge.remove();
        }
    }
}

function getCurrentPageUrl() {
    return window.location.pathname + window.location.search;
}

function initImageZoom() {
    const container = document.querySelector('.image-zoom-container');
    const img = document.getElementById("mainImage");
    const lens = document.getElementById("zoomLens");
    const result = document.getElementById("zoomResult");

    if (!container || !img || !lens || !result) {
        return;
    }

    const zoomRatio = 2.5;

    container.addEventListener('mouseenter', function () {
        lens.style.display = 'block';
        result.style.display = 'block';
        result.style.backgroundImage = `url('${img.src}')`;
    });

    container.addEventListener('mouseleave', function () {
        lens.style.display = 'none';
        result.style.display = 'none';
    });

    container.addEventListener('mousemove', function (e) {
        const rect = img.getBoundingClientRect();

        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        let lensX = x - (lens.offsetWidth / 2);
        let lensY = y - (lens.offsetHeight / 2);

        lensX = Math.max(0, Math.min(lensX, rect.width - lens.offsetWidth));
        lensY = Math.max(0, Math.min(lensY, rect.height - lens.offsetHeight));

        lens.style.left = lensX + 'px';
        lens.style.top = lensY + 'px';

        const bgX = -(lensX * zoomRatio);
        const bgY = -(lensY * zoomRatio);

        result.style.backgroundPosition = `${bgX}px ${bgY}px`;
        result.style.backgroundSize = `${rect.width * zoomRatio}px ${rect.height * zoomRatio}px`;
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initImageZoom);
} else {
    initImageZoom();
}

function changeImage(src, element) {
    const img = document.getElementById('mainImage');
    const result = document.getElementById("zoomResult");

    img.src = src;

    if (result) {
        result.style.backgroundImage = `url('${src}')`;
    }

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

let currentStock = 0;
const MAX_CART_QUANTITY = 5;

function updateQuantityLimits(stock) {
    currentStock = stock;
    const qtyInput = document.getElementById('quantity');
    const maxQty = Math.min(stock, MAX_CART_QUANTITY);
    
    qtyInput.value = 1;
    qtyInput.max = maxQty;

    updateQuantityButtons();
}

function updateQuantityButtons() {
    const qtyInput = document.getElementById('quantity');
    const decreaseBtn = document.querySelector('.decrease-btn');
    const increaseBtn = document.querySelector('.increase-btn');
    const currentQty = parseInt(qtyInput.value);
    const maxQty = Math.min(currentStock, MAX_CART_QUANTITY);

    decreaseBtn.disabled = currentQty <= 1;
    increaseBtn.disabled = currentQty >= maxQty || currentStock === 0;
}

function increaseQty() {
    const qtyInput = document.getElementById('quantity');
    let qty = parseInt(qtyInput.value);
    const maxQty = Math.min(currentStock, MAX_CART_QUANTITY);
    
    if (qty < maxQty && qty < 999) {
        qtyInput.value = qty + 1;
        updateQuantityButtons();
    } else if (qty >= maxQty) {
        const limitReason = maxQty === MAX_CART_QUANTITY ? "cart limit" : "available stock";
        Toastify({
            text: `Maximum quantity is ${maxQty} (${limitReason})`,
            duration: 3000,
            gravity: "top",
            position: "right",
            style: {
                background: "#f59e0b",
            }
        }).showToast();
    }
}

function decreaseQty() {
    const qtyInput = document.getElementById('quantity');
    let qty = parseInt(qtyInput.value);
    if (qty > 1) {
        qtyInput.value = qty - 1;
        updateQuantityButtons();
    }
}

function updateVariant() {
    const selectedColor = document.getElementById('selectedColor').value;
    const selectedSize = document.getElementById('selectedSize').value;

    const matchedVariant = variants.find(v =>
        v.color === selectedColor && v.size === selectedSize
    );

    if (matchedVariant) {
        // Find variant with calculated prices
        const variantWithPrice = variantsWithPrices.find(v => 
            v._id.toString() === matchedVariant._id.toString()
        );

        // Update images
        if (matchedVariant.images && matchedVariant.images.length > 0) {
            const img = document.getElementById('mainImage');
            const result = document.getElementById("zoomResult");

            img.src = matchedVariant.images[0].url;

            if (result) {
                result.style.backgroundImage = `url('${matchedVariant.images[0].url}')`;
            }

            const thumbnailContainer = document.querySelector('.thumbnail-images');
            thumbnailContainer.innerHTML = '';
            matchedVariant.images.forEach((image, index) => {
                const imgEl = document.createElement('img');
                imgEl.src = image.url;
                imgEl.alt = 'Product Image ' + (index + 1);
                imgEl.className = 'thumbnail' + (index === 0 ? ' active' : '');
                imgEl.onclick = function () { changeImage(image.url, this); };
                thumbnailContainer.appendChild(imgEl);
            });
        }

        // Update price with offer calculation
        const priceElement = document.getElementById('currentPrice');
        const priceSection = document.querySelector('.price-section');

        if (variantWithPrice && variantWithPrice.calculatedPrice) {
            const priceData = variantWithPrice.calculatedPrice;
            
            if (priceData.hasOffer || priceData.hasManualDiscount) {
                priceSection.innerHTML = `
                    <span class="text-muted">MRP</span>
                    <span class="original-price">₹${Math.round(priceData.originalPrice)}</span>
                    <span class="current-price" id="currentPrice">₹${Math.round(priceData.finalPrice)}</span>
                    <span class="discount-badge">
                        ${Math.round(priceData.discountPercentage)}% OFF
                    </span>
                    ${priceData.hasOffer ? `
                        <span class="offer-applied-text">
                            <i class="fas fa-check-circle"></i>
                            ${priceData.discountType === 'product' ? 'Product' : 'Category'} Offer Applied
                        </span>
                    ` : ''}
                `;
            } else {
                priceSection.innerHTML = `
                    <span class="current-price" id="currentPrice">₹${Math.round(priceData.finalPrice)}</span>
                `;
            }
        } else {
            // Fallback to manual discount
            if (matchedVariant.discountedPrice > 0 && matchedVariant.discountedPrice < matchedVariant.price) {
                priceSection.innerHTML = `
                    <span class="text-muted">MRP</span>
                    <span class="original-price">₹${Math.round(matchedVariant.price)}</span>
                    <span class="current-price" id="currentPrice">₹${Math.round(matchedVariant.discountedPrice)}</span>
                    <span class="discount-badge">
                        ${Math.round(((matchedVariant.price - matchedVariant.discountedPrice) / matchedVariant.price) * 100)}% OFF
                    </span>
                `;
            } else {
                priceSection.innerHTML = `
                    <span class="current-price" id="currentPrice">₹${Math.round(matchedVariant.price)}</span>
                `;
            }
        }

        // Update stock and quantity limits
        updateQuantityLimits(matchedVariant.stock);

        // Update stock info
        const stockInfo = document.querySelector('.stock-info');
        const addToCartBtn = document.getElementById('addToCartBtn');

        if (matchedVariant.stock === 0) {
            stockInfo.className = 'stock-info out-of-stock';
            stockInfo.innerHTML = '<i class="fas fa-times-circle me-2"></i>Out of Stock';
            addToCartBtn.disabled = true;
            addToCartBtn.textContent = 'OUT OF STOCK';
            addToCartBtn.style.opacity = '0.8';
            addToCartBtn.style.cursor = 'not-allowed';
            addToCartBtn.dataset.stockDisabled = 'true';
        } else if (matchedVariant.stock < 10) {
            stockInfo.className = 'stock-info low-stock';
            stockInfo.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i>Only ' + matchedVariant.stock + ' left in stock';
            addToCartBtn.disabled = false;
            addToCartBtn.dataset.stockDisabled = 'false';
            updateAddToCartButton(matchedVariant._id);
        } else {
            stockInfo.className = 'stock-info in-stock';
            stockInfo.innerHTML = '<i class="fas fa-check-circle me-2"></i>In Stock';
            addToCartBtn.disabled = false;
            addToCartBtn.dataset.stockDisabled = 'false';
            updateAddToCartButton(matchedVariant._id);
        }

        updateWishlistButton(matchedVariant._id);
    }
}

async function checkIfVariantInCart(variantId) {
    try {
        const response = await fetch(`/cart/check/${variantId}`);
        const data = await response.json();

        if (data.success && data.data) {
            return data.data;
        }
        return { inCart: false };
    } catch (error) {
        console.error('Error checking cart:', error);
        return { inCart: false };
    }
}

async function checkIfVariantInWishlist(variantId) {
    try {
        const response = await fetch(`/wishlist/check/${variantId}`);
        const data = await response.json();

        if (data.success && data.data) {
            return data.data;
        }
        return { inWishlist: false };
    } catch (error) {
        console.error('Error checking wishlist:', error);
        return { inWishlist: false };
    }
}

async function updateAddToCartButton(variantId) {
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (!addToCartBtn) return;

    if (addToCartBtn.dataset.stockDisabled === 'true') {
        return;
    }

    const cartStatus = await checkIfVariantInCart(variantId);

    if (cartStatus.inCart) {
        addToCartBtn.textContent = `UPDATE CART`;
        addToCartBtn.dataset.inCart = 'true';
        addToCartBtn.dataset.currentCartQty = cartStatus.quantity;
    } else {
        const stockStatus = document.querySelector('.stock-info');
        const isOutOfStock = stockStatus && stockStatus.classList.contains('out-of-stock');

        if (!isOutOfStock) {
            addToCartBtn.disabled = false;
            addToCartBtn.textContent = 'ADD TO CART';
            addToCartBtn.style.opacity = '1';
            addToCartBtn.style.cursor = 'pointer';
            addToCartBtn.dataset.inCart = 'false';
            addToCartBtn.dataset.currentCartQty = '0';
        }
    }
}

async function updateWishlistButton(variantId) {
    const addToWishlistBtn = document.getElementById('addToWishlistBtn');
    if (!addToWishlistBtn) return;

    const wishlistStatus = await checkIfVariantInWishlist(variantId);

    if (wishlistStatus.inWishlist) {
        addToWishlistBtn.innerHTML = '<i class="fas fa-heart me-2"></i>IN WISHLIST';
        addToWishlistBtn.dataset.inWishlist = 'true';
    } else {
        addToWishlistBtn.innerHTML = '<i class="far fa-heart me-2"></i>WISHLIST';
        addToWishlistBtn.disabled = false;
        addToWishlistBtn.style.opacity = '1';
        addToWishlistBtn.style.cursor = 'pointer';
        addToWishlistBtn.dataset.inWishlist = 'false';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    if(successMessage){
        Toastify({
            text:successMessage,
            duration:2500,
            gravity:"top",
            position:"right",
            close:true,
            style:{
                background: "linear-gradient(to right, #00b09b, #96c93d)",
                color: "#fff",
                borderRadius: "8px"
            }
        }).showToast();
    }

    const addToCartBtn = document.getElementById('addToCartBtn');

    if (addToCartBtn) {
        const selectedColor = document.getElementById('selectedColor').value;
        const selectedSize = document.getElementById('selectedSize').value;
        const initialVariant = variants.find(v =>
            v.color === selectedColor && v.size === selectedSize
        );

        if (initialVariant) {
            updateQuantityLimits(initialVariant.stock);
            updateAddToCartButton(initialVariant._id);
        }

        addToCartBtn.addEventListener('click', async function () {
            if (this.disabled && this.dataset.stockDisabled === 'true') {
                Toastify({
                    text: "This product is out of stock",
                    duration: 3000,
                    gravity: "top",
                    position: "right",
                    style: {
                        background: "#dc3545",
                    }
                }).showToast();
                return;
            }

            const selectedColor = document.getElementById('selectedColor').value;
            const selectedSize = document.getElementById('selectedSize').value;
            const quantity = parseInt(document.getElementById('quantity').value);

            const variant = variants.find(v =>
                v.color === selectedColor && v.size === selectedSize
            );

            if (!variant) {
                Toastify({
                    text: "Please select a valid variant",
                    duration: 3000,
                    gravity: "top",
                    position: "right",
                    style: {
                        background: "#ffc107",
                    }
                }).showToast();
                return;
            }

            if (variant.stock === 0) {
                Toastify({
                    text: "This product is out of stock",
                    duration: 3000,
                    gravity: "top",
                    position: "right",
                    style: {
                        background: "#dc3545",
                    }
                }).showToast();
                return;
            }

            if (quantity < 1) {
                Toastify({
                    text: "Minimum quantity is 1",
                    duration: 3000,
                    gravity: "top",
                    position: "right",
                    style: {
                        background: "#ffc107",
                    }
                }).showToast();
                return;
            }

            const maxQty = Math.min(variant.stock, MAX_CART_QUANTITY);
            if (quantity > maxQty) {
                const limitReason = maxQty === MAX_CART_QUANTITY ? "cart limit" : "available stock";
                Toastify({
                    text: `Maximum quantity is ${maxQty} (${limitReason})`,
                    duration: 3000,
                    gravity: "top",
                    position: "right",
                    style: {
                        background: "#ffc107",
                    }
                }).showToast();
                return;
            }

            const originalText = this.textContent;
            this.textContent = 'ADDING...';

            try {
                const response = await fetch('/cart/add', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        productId: window.productId,
                        productVariantId: variant._id,
                        quantity: quantity
                    })
                });

                const raw = await response.text();
                const contentType = response.headers.get('content-type') || '';
                let data = null;

                if (contentType.includes('application/json')) {
                    try {
                        data = JSON.parse(raw);
                    } catch (err) {
                        console.error('Invalid JSON from /cart/add:', raw);
                    }
                }

                if (response.ok && data && data.success) {
                    UpdateCartBadge(data.data.cartItemscount);
                    const productName = document.querySelector('.product-title') ?
                        document.querySelector('.product-title').textContent :
                        document.querySelector('h1').textContent;

                    Swal.fire({
                        icon: 'success',
                        title: 'Added to Cart!',
                        html: `
                            <div style="text-align: left; padding: 15px; background: #f8f9fa; border-radius: 8px; margin-top: 15px;">
                                <p style="margin: 10px 0; font-size: 15px;">
                                    <strong>Product:</strong> ${productName}
                                </p>
                                <p style="margin: 10px 0; font-size: 15px;">
                                    <strong>Color:</strong> ${data.data.variantDetails.color}
                                </p>
                                <p style="margin: 10px 0; font-size: 15px;">
                                    <strong>Size:</strong> ${data.data.variantDetails.size}
                                </p>
                                <p style="margin: 10px 0; font-size: 15px;">
                                    <strong>Quantity:</strong> ${data.data.quantity}
                                </p>
                            </div>
                        `,
                        showCancelButton: true,
                        confirmButtonColor: '#f59e0b',
                        cancelButtonColor: '#6c757d',
                        confirmButtonText: '🛒 Go to Cart',
                        cancelButtonText: '🛍️ Continue Shopping',
                        customClass: { popup: 'swal-wide' },
                        scrollbarPadding: false,
                        heightAuto: false
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.href = '/cart';
                        } else {
                            updateAddToCartButton(variant._id);
                        }
                    });

                } else {
                    this.textContent = originalText;

                    if (data && (data.statusCode === 401 || data.statusCode === 403) && data.redirectTo) {
                        const currentUrl = getCurrentPageUrl();
                        Swal.fire({
                            icon: 'warning',
                            title: 'Login Required',
                            text: data.message || 'Please sign in to add items to your cart.',
                            showCancelButton: true,
                            confirmButtonColor: '#f59e0b',
                            cancelButtonColor: '#6c757d',
                            confirmButtonText: 'Go to Login',
                            cancelButtonText: 'Cancel',
                            scrollbarPadding: false,
                            heightAuto: false
                        }).then((result) => {
                            if (result.isConfirmed) {
                                window.location.href = `${data.redirectTo}?returnUrl=${encodeURIComponent(currentUrl)}`;
                            }
                        });
                        return;
                    }

                    if (raw && raw.trim().startsWith('<')) {
                        const currentUrl = getCurrentPageUrl();
                        Swal.fire({
                            icon: 'warning',
                            title: 'Login Required',
                            text: 'Please sign in to add items to your cart.',
                            showCancelButton: true,
                            confirmButtonColor: '#f59e0b',
                            cancelButtonColor: '#6c757d',
                            confirmButtonText: 'Go to Login',
                            cancelButtonText: 'Cancel',
                            scrollbarPadding: false,
                            heightAuto: false
                        }).then((result) => {
                            if (result.isConfirmed) {
                                window.location.href = `/signin?returnUrl=${encodeURIComponent(currentUrl)}`;
                            }
                        });
                        return;
                    }

                    const errMsg = (data && data.message) ? data.message : 'Failed to add to cart';
                    Toastify({
                        text: errMsg,
                        duration: 3000,
                        gravity: "top",
                        position: "right",
                        style: { background: "#dc3545" }
                    }).showToast();
                }

            } catch (error) {
                this.textContent = originalText;
                console.error('Error adding to cart:', error);
                Toastify({
                    text: 'Something went wrong. Please try again.',
                    duration: 3000,
                    gravity: "top",
                    position: "right",
                    style: { background: "#dc3545" }
                }).showToast();
            }
        });
    }

    // Add to wishlist functionality
    const addToWishlistBtn = document.getElementById('addToWishlistBtn');
    if (addToWishlistBtn) {
        const selectedColor = document.getElementById('selectedColor').value;
        const selectedSize = document.getElementById('selectedSize').value;
        const initialVariant = variants.find(v =>
            v.color === selectedColor && v.size === selectedSize
        );

        if (initialVariant) {
            updateWishlistButton(initialVariant._id);
        }

        addToWishlistBtn.addEventListener('click', async function() {
            if (this.dataset.inWishlist === 'true') {
                Swal.fire({
                    icon: 'info',
                    title: 'Already in Wishlist',
                    text: 'This product is already in your wishlist!',
                    showCancelButton: true,
                    confirmButtonColor: '#f59e0b',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Go to Wishlist',
                    cancelButtonText: 'Continue Shopping',
                    scrollbarPadding: false,
                    heightAuto: false
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.href = '/wishlist';
                    }
                });
                return;
            }

            const selectedColor = document.getElementById('selectedColor').value;
            const selectedSize = document.getElementById('selectedSize').value;

            const variant = variants.find(v =>
                v.color === selectedColor && v.size === selectedSize
            );

            if (!variant) {
                Toastify({
                    text: "Please select a valid variant",
                    duration: 3000,
                    gravity: "top",
                    position: "right",
                    style: {
                        background: "#ffc107",
                    }
                }).showToast();
                return;
            }

            const originalHTML = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>ADDING...';

            try {
                const response = await fetch('/wishlist/add', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        productId: window.productId,
                        productVariantId: variant._id
                    })
                });

                const raw = await response.text();
                const contentType = response.headers.get('content-type') || '';
                let data = null;

                if (contentType.includes('application/json')) {
                    try {
                        data = JSON.parse(raw);
                    } catch (err) {
                        console.error('Invalid JSON from /wishlist/add:', raw);
                    }
                }

                if (response.ok && data && data.success) {
                    UpdateWishlistBadge(data.data.wishlistItemsCount);

                    Toastify({
                        text: "Added to wishlist successfully! ❤️",
                        duration: 3000,
                        gravity: "top",
                        position: "right",
                        style: {
                            background: "linear-gradient(to right, #f59e0b, #d97706)",
                        }
                    }).showToast();

                    updateWishlistButton(variant._id);

                } else {
                    this.innerHTML = originalHTML;

                    if (data && (data.statusCode === 401 || data.statusCode === 403) && data.redirectTo) {
                        const currentUrl = getCurrentPageUrl();
                        Swal.fire({
                            icon: 'warning',
                            title: 'Login Required',
                            text: data.message || 'Please sign in to add items to your wishlist.',
                            showCancelButton: true,
                            confirmButtonColor: '#f59e0b',
                            cancelButtonColor: '#6c757d',
                            confirmButtonText: 'Go to Login',
                            cancelButtonText: 'Cancel',
                            scrollbarPadding: false,
                            heightAuto: false
                        }).then((result) => {
                            if (result.isConfirmed) {
                                window.location.href = `${data.redirectTo}?returnUrl=${encodeURIComponent(currentUrl)}`;
                            }
                        });
                        return;
                    }

                    if (raw && raw.trim().startsWith('<')) {
                        const currentUrl = getCurrentPageUrl();
                        Swal.fire({
                            icon: 'warning',
                            title: 'Login Required',
                            text: 'Please sign in to add items to your wishlist.',
                            showCancelButton: true,
                            confirmButtonColor: '#f59e0b',
                            cancelButtonColor: '#6c757d',
                            confirmButtonText: 'Go to Login',
                            cancelButtonText: 'Cancel',
                            scrollbarPadding: false,
                            heightAuto: false
                        }).then((result) => {
                            if (result.isConfirmed) {
                                window.location.href = `/signin?returnUrl=${encodeURIComponent(currentUrl)}`;
                            }
                        });
                        return;
                    }

                    const errMsg = (data && data.message) ? data.message : 'Failed to add to wishlist';
                    Toastify({
                        text: errMsg,
                        duration: 3000,
                        gravity: "top",
                        position: "right",
                        style: { background: "#dc3545" }
                    }).showToast();
                }

            } catch (error) {
                this.innerHTML = originalHTML;
                console.error('Error adding to wishlist:', error);
                Toastify({
                    text: 'Something went wrong. Please try again.',
                    duration: 3000,
                    gravity: "top",
                    position: "right",
                    style: { background: "#dc3545" }
                }).showToast();
            }
        });
    }
});

const style = document.createElement('style');
style.textContent = `
    .swal-wide {
        width: 500px !important;
    }
`;
document.head.appendChild(style);


// Load reviews
async function loadProductReviews() {
    try {
        const response = await axios.get(`/review/product/${window.productId}`);
        
        if (response.data.success) {
            const data = response.data.data;
            displayReviews(data);
        } else {
            showNoReviews();
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
        showNoReviews();
    }
}

function displayReviews(data) {
    const container = document.getElementById('reviewsContainer');
    
    if (!data.ratingSummary || data.ratingSummary.totalReviews === 0) {
        showNoReviews();
        return;
    }
    
    let html = `
        <div class="review-summary mb-4">
            <div class="d-flex align-items-center gap-3 mb-3">
                <div class="review-rating-large">${data.ratingSummary.averageRating.toFixed(1)}</div>
                <div>
                    <div class="stars">
                        ${getStarsHTML(data.ratingSummary.averageRating)}
                    </div>
                    <p class="text-muted mb-0 small">Based on ${data.ratingSummary.totalReviews} review${data.ratingSummary.totalReviews !== 1 ? 's' : ''}</p>
                </div>
            </div>
        </div>
        <div class="review-list">
    `;
    
    data.reviews.forEach(review => {
        const date = new Date(review.createdAt).toLocaleDateString('en-IN');
        html += `
            <div class="review-card-compact mb-3">
                <div class="review-header">
                    <div class="reviewer-icon-small">
                        <i class="fas fa-user"></i>
                    </div>
                    <div>
                        <h6 class="mb-0 small fw-bold">${review.user.name}</h6>
                        <div class="stars small">
                            ${getStarsHTML(review.rating)}
                        </div>
                    </div>
                    <small class="text-muted ms-auto">${date}</small>
                </div>
                ${review.reviewText ? `<p class="mb-0 small mt-2">${review.reviewText}</p>` : ''}
                ${review.isVerifiedPurchase ? 
                    '<small class="text-success mt-2 d-block"><i class="fas fa-check-circle"></i> Verified Purchase</small>' : 
                    ''}
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function getStarsHTML(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(rating)) {
            stars += '<i class="fas fa-star"></i>';
        } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    return stars;
}

function showNoReviews() {
    const container = document.getElementById('reviewsContainer');
    container.innerHTML = `
        <div class="text-center py-5">
            <i class="fas fa-comment-slash fa-3x text-muted mb-3"></i>
            <h5>No Reviews Yet</h5>
            <p class="text-muted">Be the first to review this product!</p>
        </div>
    `;
}

// Load reviews when page loads
document.addEventListener('DOMContentLoaded', loadProductReviews);

// Also reload when the review tab is clicked (in case user just submitted a review from order page)
document.getElementById('review-tab')?.addEventListener('click', function() {
    loadProductReviews();
});