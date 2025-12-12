/* ========================================
   ShopEase - Main JavaScript
   ======================================== */

// Utility functions
const qs = (s) => document.querySelector(s);
const qsa = (s) => document.querySelectorAll(s);

// Cart storage key
const CART_KEY = 'shopease_cart';
const SHIPPING_THRESHOLD = 2000;
const SHIPPING_COST = 150;

// ========================================
// CART MANAGEMENT (using sessionStorage)
// ========================================

function getCart() {
  const cart = {};
  for (let i = 0; i < 50; i++) {
    const key = `${CART_KEY}_${i}`;
    const item = sessionStorage.getItem(key);
    if (item) {
      try {
        const parsed = JSON.parse(item);
        cart[parsed.id] = parsed;
      } catch(e) {
        console.error('Error parsing cart item:', e);
      }
    }
  }
  return cart;
}

function saveCart(cart) {
  // Clear all cart items first
  for (let i = 0; i < 50; i++) {
    sessionStorage.removeItem(`${CART_KEY}_${i}`);
  }
  
  // Save new cart items
  let index = 0;
  for (const id in cart) {
    sessionStorage.setItem(`${CART_KEY}_${index}`, JSON.stringify(cart[id]));
    index++;
  }
  
  updateCartCount();
}

function updateCartCount() {
  const cart = getCart();
  let total = 0;
  for (const id in cart) {
    total += cart[id].qty;
  }
  
  const badges = qsa('#cart-count, .cart-badge');
  badges.forEach(badge => {
    if (badge) badge.textContent = total;
  });
}

function getCartTotal() {
  const cart = getCart();
  let subtotal = 0;
  for (const id in cart) {
    subtotal += cart[id].price * cart[id].qty;
  }
  return subtotal;
}

function getShippingCost() {
  const subtotal = getCartTotal();
  return subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
}

// ========================================
// ADD TO CART FUNCTIONALITY
// ========================================

function initAddToCart() {
  qsa('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const name = btn.dataset.name;
      const price = parseInt(btn.dataset.price);
      
      // Check for quantity input (product detail page)
      const qtyInput = qs('#qty');
      const qty = qtyInput ? Math.max(1, parseInt(qtyInput.value) || 1) : 1;
      
      const cart = getCart();
      
      if (cart[id]) {
        cart[id].qty += qty;
      } else {
        cart[id] = { id, name, price, qty };
      }
      
      saveCart(cart);
      
      // Visual feedback
      const originalHTML = btn.innerHTML;
      const originalBG = btn.style.background;
      
      btn.innerHTML = '<i class="fas fa-check"></i> Added!';
      btn.style.background = '#10b981';
      btn.disabled = true;
      
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.style.background = originalBG;
        btn.disabled = false;
      }, 1500);
    });
  });
}

// ========================================
// CART PAGE
// ========================================

function renderCartPage() {
  const container = qs('#cart-contents');
  if (!container) return;
  
  const cart = getCart();
  const cartKeys = Object.keys(cart);
  
  if (cartKeys.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        <i class="fas fa-shopping-cart"></i>
        <p>Your cart is empty.</p>
        <a href="index.html" class="btn primary" style="margin-top: 1rem;">
          <i class="fas fa-arrow-left"></i> Start Shopping
        </a>
      </div>
    `;
    
    // Update summary
    if (qs('#cart-subtotal')) qs('#cart-subtotal').textContent = '₱0';
    if (qs('#cart-shipping')) qs('#cart-shipping').textContent = '₱0';
    if (qs('#cart-total')) qs('#cart-total').textContent = '₱0';
    return;
  }
  
  let html = '';
  let subtotal = 0;
  
  for (const id in cart) {
    const item = cart[id];
    subtotal += item.price * item.qty;
    
    html += `
      <div class="cart-item">
        <img src="https://via.placeholder.com/100x75?text=${encodeURIComponent(item.name)}" alt="${item.name}" />
        <div class="cart-item-info">
          <h3>${item.name}</h3>
          <p>₱${item.price.toLocaleString()}</p>
        </div>
        <div class="cart-item-qty">
          <label for="qty-${id}">Qty:</label>
          <input type="number" id="qty-${id}" value="${item.qty}" min="1" data-id="${id}" class="cart-qty" />
        </div>
        <button class="btn-small secondary cart-remove" data-id="${id}" aria-label="Remove ${item.name}">
          <i class="fas fa-trash"></i> Remove
        </button>
      </div>
    `;
  }
  
  container.innerHTML = html;
  
  // Calculate shipping and total
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total = subtotal + shipping;
  
  // Update summary
  if (qs('#cart-subtotal')) qs('#cart-subtotal').textContent = `₱${subtotal.toLocaleString()}`;
  if (qs('#cart-shipping')) {
    qs('#cart-shipping').textContent = shipping === 0 ? 'FREE' : `₱${shipping.toLocaleString()}`;
  }
  if (qs('#cart-total')) qs('#cart-total').textContent = `₱${total.toLocaleString()}`;
  
  // Attach event listeners
  qsa('.cart-qty').forEach(input => {
    input.addEventListener('change', (e) => {
      const id = input.dataset.id;
      const newQty = Math.max(1, parseInt(input.value) || 1);
      
      const cart = getCart();
      if (cart[id]) {
        cart[id].qty = newQty;
        saveCart(cart);
        renderCartPage();
      }
    });
  });
  
  qsa('.cart-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const cart = getCart();
      delete cart[id];
      saveCart(cart);
      renderCartPage();
    });
  });
}

// ========================================
// CHECKOUT PAGE
// ========================================

function renderCheckoutSummary() {
  const itemsContainer = qs('#checkout-items');
  if (!itemsContainer) return;
  
  const cart = getCart();
  const cartKeys = Object.keys(cart);
  
  if (cartKeys.length === 0) {
    itemsContainer.innerHTML = '<p class="muted">Your cart is empty.</p>';
    return;
  }
  
  let html = '';
  let subtotal = 0;
  
  for (const id in cart) {
    const item = cart[id];
    subtotal += item.price * item.qty;
    
    html += `
      <div class="checkout-item">
        <div>
          <div class="checkout-item-name">${item.name}</div>
          <div class="checkout-item-qty">Qty: ${item.qty}</div>
        </div>
        <div>₱${(item.price * item.qty).toLocaleString()}</div>
      </div>
    `;
  }
  
  itemsContainer.innerHTML = html;
  
  // Calculate shipping and total
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total = subtotal + shipping;
  
  // Update summary
  if (qs('#checkout-subtotal')) qs('#checkout-subtotal').textContent = `₱${subtotal.toLocaleString()}`;
  if (qs('#checkout-shipping')) {
    qs('#checkout-shipping').textContent = shipping === 0 ? 'FREE' : `₱${shipping.toLocaleString()}`;
  }
  if (qs('#checkout-total')) qs('#checkout-total').textContent = `₱${total.toLocaleString()}`;
}

function initCheckoutForm() {
  const form = qs('#checkout-form');
  if (!form) return;
  
  // Card number formatting
  const cardInput = qs('#card');
  if (cardInput) {
    cardInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\s/g, '');
      let formatted = value.match(/.{1,4}/g)?.join(' ') || value;
      e.target.value = formatted;
    });
  }
  
  // Expiry formatting
  const expiryInput = qs('#expiry');
  if (expiryInput) {
    expiryInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2, 4);
      }
      e.target.value = value;
    });
  }
  
  // Form submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const status = qs('#form-status');
    
    if (!form.checkValidity()) {
      status.textContent = 'Please fill in all required fields correctly.';
      status.style.background = '#fee2e2';
      status.style.color = '#991b1b';
      
      // Focus first invalid field
      const invalid = form.querySelector(':invalid');
      if (invalid) invalid.focus();
      return;
    }
    
    // Clear cart
    for (let i = 0; i < 50; i++) {
      sessionStorage.removeItem(`${CART_KEY}_${i}`);
    }
    updateCartCount();
    
    // Show success message
    status.textContent = '✓ Order placed successfully! Thank you for your purchase.';
    status.style.background = '#d1fae5';
    status.style.color = '#065f46';
    
    // Reset form
    form.reset();
    renderCheckoutSummary();
    
    // Scroll to status
    status.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

// ========================================
// PRODUCT PAGE TABS
// ========================================

function initProductTabs() {
  const tabs = qsa('.tab');
  if (!tabs.length) return;
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active state from all tabs
      tabs.forEach(t => t.setAttribute('aria-selected', 'false'));
      
      // Add active state to clicked tab
      tab.setAttribute('aria-selected', 'true');
      
      // Hide all panels
      const panels = qsa('.tab-panel');
      panels.forEach(panel => {
        panel.hidden = true;
        panel.classList.add('hidden');
      });
      
      // Show selected panel
      const panelId = tab.getAttribute('aria-controls');
      const panel = qs(`#${panelId}`);
      if (panel) {
        panel.hidden = false;
        panel.classList.remove('hidden');
      }
    });
  });
}

// ========================================
// PRODUCT PAGE QUANTITY CONTROLS
// ========================================

function initQuantityControls() {
  const qtyInput = qs('#qty');
  const minusBtn = qs('#qty-minus');
  const plusBtn = qs('#qty-plus');
  
  if (!qtyInput) return;
  
  if (minusBtn) {
    minusBtn.addEventListener('click', () => {
      const current = parseInt(qtyInput.value) || 1;
      qtyInput.value = Math.max(1, current - 1);
    });
  }
  
  if (plusBtn) {
    plusBtn.addEventListener('click', () => {
      const current = parseInt(qtyInput.value) || 1;
      qtyInput.value = current + 1;
    });
  }
}

// ========================================
// MOBILE NAVIGATION TOGGLE
// ========================================

function initMobileNav() {
  qsa('.nav-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const nav = qs('.main-nav');
      const isOpen = nav.classList.contains('open');
      
      nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', !isOpen);
    });
  });
  
  // Close nav when clicking outside
  document.addEventListener('click', (e) => {
    const nav = qs('.main-nav');
    const toggle = qs('.nav-toggle');
    
    if (nav && toggle && nav.classList.contains('open')) {
      if (!nav.contains(e.target) && !toggle.contains(e.target)) {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    }
  });
}

// ========================================
// UPDATE COPYRIGHT YEAR
// ========================================

function updateYear() {
  const year = new Date().getFullYear();
  qsa('#year, #year-2, #year-3, #year-4').forEach(el => {
    if (el) el.textContent = year;
  });
}

// ========================================
// INITIALIZE ON PAGE LOAD
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  updateYear();
  updateCartCount();
  initAddToCart();
  initMobileNav();
  initProductTabs();
  initQuantityControls();
  renderCartPage();
  renderCheckoutSummary();
  initCheckoutForm();
});

// Update cart count on storage change (for multiple tabs)
window.addEventListener('storage', () => {
  updateCartCount();
});