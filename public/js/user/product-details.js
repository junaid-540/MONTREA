const variants = window.variants || [];

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

function initImageZoom() {
    const container = document.querySelector('.image-zoom-container');
    const img = document.getElementById("mainImage");
    const lens = document.getElementById("zoomLens");
    const result = document.getElementById("zoomResult");

    if (!container || !img || !lens || !result) {
        console.log('Zoom elements not found');
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
                imgEl.onclick = function () { changeImage(image.url, this); };
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
            addToCartBtn.dataset.stockDisabled = 'true';
        } else if (matchedVariant.stock < 10) {
            stockInfo.className = 'stock-info low-stock';
            stockInfo.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i>Only ' + matchedVariant.stock + ' left in stock';
            addToCartBtn.disabled = false;
            addToCartBtn.textContent = 'ADD TO CART';
            addToCartBtn.dataset.stockDisabled = 'false'; // NEW

            updateAddToCartButton(matchedVariant._id);
        } else {
            stockInfo.className = 'stock-info in-stock';
            stockInfo.innerHTML = '<i class="fas fa-check-circle me-2"></i>In Stock';
            addToCartBtn.disabled = false;
            addToCartBtn.textContent = 'ADD TO CART';
            addToCartBtn.dataset.stockDisabled = 'false'; // NEW

            updateAddToCartButton(matchedVariant._id);
        }
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

async function updateAddToCartButton(variantId) {
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (!addToCartBtn) return;

    
    if (addToCartBtn.dataset.stockDisabled === 'true') {
        return;
    }

    const cartStatus = await checkIfVariantInCart(variantId);

    if (cartStatus.inCart) {
        addToCartBtn.disabled = true;
        addToCartBtn.textContent = `ALREADY IN CART (${cartStatus.quantity})`;
        addToCartBtn.style.opacity = '0.6';
        addToCartBtn.style.cursor = 'not-allowed';
        addToCartBtn.dataset.inCart = 'true';
    } else {
        // Only enable if stock is available
        const stockStatus = document.querySelector('.stock-info');
        const isOutOfStock = stockStatus && stockStatus.classList.contains('out-of-stock');

        if (!isOutOfStock) {
            addToCartBtn.disabled = false;
            addToCartBtn.textContent = 'ADD TO CART';
            addToCartBtn.style.opacity = '1';
            addToCartBtn.style.cursor = 'pointer';
            addToCartBtn.dataset.inCart = 'false';
        }
    }
}

// Add to cart functionality
document.addEventListener('DOMContentLoaded', function () {
    const addToCartBtn = document.getElementById('addToCartBtn');

    if (addToCartBtn) {
        // Check initial variant on page load
        const selectedColor = document.getElementById('selectedColor').value;
        const selectedSize = document.getElementById('selectedSize').value;
        const initialVariant = variants.find(v =>
            v.color === selectedColor && v.size === selectedSize
        );

        if (initialVariant) {
            updateAddToCartButton(initialVariant._id);
        }

        addToCartBtn.addEventListener('click', async function () {
            if (this.dataset.inCart === 'true') {
                Swal.fire({
                    icon: 'info',
                    title: 'Already in Cart',
                    text: 'This product is already in your cart!',
                    showCancelButton: true,
                    confirmButtonColor: '#007bff',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Go to Cart',
                    cancelButtonText: 'Continue Shopping',
                    scrollbarPadding: false,
                    heightAuto: false
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.href = '/cart';
                    }
                });
                return;
            }

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

            // Find the selected variant
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

            // Check stock before API call
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

            // Disable button and show loading
            this.disabled = true;
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
                        quantity: 1
                    })
                });

                // Read raw response as text first (avoid JSON parse errors when server returns HTML)
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

                // Successful JSON response
                if (response.ok && data && data.success) {
                    UpdateCartBadge(data.data.cartItemscount)
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
                        confirmButtonColor: '#007bff',
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
                    // Not successful — handle unauthenticated / redirect case
                    this.disabled = false;
                    this.textContent = originalText;

                    // If server returned JSON with statusCode 401 and redirectTo
                    if (data && (data.statusCode === 401 || data.statusCode === 403) && data.redirectTo) {
                        Swal.fire({
                            icon: 'warning',
                            title: 'Login Required',
                            text: data.message || 'Please sign in to add items to your cart.',
                            showCancelButton: true,
                            confirmButtonColor: '#007bff',
                            cancelButtonColor: '#6c757d',
                            confirmButtonText: 'Go to Login',
                            cancelButtonText: 'Cancel',
                            scrollbarPadding: false,
                            heightAuto: false
                        }).then((result) => {
                            if (result.isConfirmed) {
                                window.location.href = data.redirectTo;
                            }
                        });
                        return;
                    }

                    // If server returned HTML (likely a redirect to login or error page)
                    if (raw && raw.trim().startsWith('<')) {
                        Swal.fire({
                            icon: 'warning',
                            title: 'Login Required',
                            text: 'Please sign in to add items to your cart.',
                            showCancelButton: true,
                            confirmButtonColor: '#007bff',
                            cancelButtonColor: '#6c757d',
                            confirmButtonText: 'Go to Login',
                            cancelButtonText: 'Cancel',
                            scrollbarPadding: false,
                            heightAuto: false
                        }).then((result) => {
                            if (result.isConfirmed) {
                                window.location.href = '/signin';
                            }
                        });
                        return;
                    }

                    // Generic JSON error
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
                this.disabled = false;
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

    // Add to wishlist functionality (placeholder for now)
    const addToWishlistBtn = document.getElementById('addToWishlistBtn');
    // if (addToWishlistBtn) {
    //     addToWishlistBtn.addEventListener('click', function() {
    //         Toastify({
    //             text: "Wishlist feature coming soon!",
    //             duration: 2000,
    //             gravity: "top",
    //             position: "right",
    //             style: {
    //                 background: "#17a2b8",
    //             }
    //         }).showToast();
    //     });
    // }
});

// Optional: Add custom CSS for wider SweetAlert
const style = document.createElement('style');
style.textContent = `
    .swal-wide {
        width: 500px !important;
    }
`;
document.head.appendChild(style);