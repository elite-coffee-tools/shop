// --- إعدادات بوت التليجرام ---
const TELEGRAM_BOT_TOKEN = "8983595568:AAH2cSey0HqccrGqMzNvmDtroX17VY7dPiY"; 
const TELEGRAM_CHAT_ID = "8484904016";
const DELIVERY_FEE = 7.00;

let cart = [];
let currentProductContext = null;

// عناصر DOM
const modal = document.getElementById('config-modal');
const closeModalBtn = document.getElementById('close-modal');
const configBtns = document.querySelectorAll('.open-configurator');
const qtyInput = document.getElementById('qty-input');
const addToCartBtn = document.getElementById('add-to-cart-confirm');
const cartToggle = document.getElementById('cart-toggle');
const slideCart = document.getElementById('slide-cart');
const cartOverlay = document.getElementById('cart-overlay');
const closeCartBtn = document.getElementById('close-cart');
const checkoutForm = document.getElementById('checkout-form');
const whatsappOrderBtn = document.getElementById('whatsapp-order');

// دالة حماية من ثغرات XSS
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// دالة تغيير الصور في المعرض
window.changeImage = function(element) {
    const gallery = element.closest('.product-gallery');
    const mainImg = gallery.querySelector('.main-img');
    const newImageUrl = element.src; 
    
    mainImg.style.opacity = '0';
    setTimeout(() => {
        mainImg.src = newImageUrl;
        mainImg.style.opacity = '1';
    }, 150);

    const thumbs = gallery.querySelectorAll('.thumb');
    thumbs.forEach(t => t.classList.remove('active'));
    element.classList.add('active');
};

// فتح نافذة التخصيص
configBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const card = e.target.closest('.product-card');
        const mainImgUrl = card.querySelector('.main-img').src; 
        
        currentProductContext = {
            id: card.dataset.id,
            name: card.dataset.name,
            price: parseFloat(card.dataset.price),
            image: mainImgUrl 
        };
        
        document.getElementById('modal-product-name').textContent = currentProductContext.name;
        document.getElementById('modal-product-img').src = mainImgUrl;
        
        document.getElementById('diameter-error').classList.add('hidden');
        document.querySelectorAll('input[name="diameter"]').forEach(radio => radio.checked = false);
        document.getElementById('machine-model').value = '';
        qtyInput.value = 1;
        
        modal.classList.remove('hidden');
    });
});

closeModalBtn.addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

document.getElementById('qty-plus').addEventListener('click', () => qtyInput.value = parseInt(qtyInput.value) + 1);
document.getElementById('qty-minus').addEventListener('click', () => {
    if(parseInt(qtyInput.value) > 1) qtyInput.value = parseInt(qtyInput.value) - 1;
});

// إضافة المنتج للسلة
addToCartBtn.addEventListener('click', () => {
    const selectedDiameter = document.querySelector('input[name="diameter"]:checked');
    if (!selectedDiameter) {
        document.getElementById('diameter-error').classList.remove('hidden');
        return;
    }

    const item = {
        ...currentProductContext,
        diameter: selectedDiameter.value,
        machine: document.getElementById('machine-model').value.trim() || 'غير محدد',
        qty: parseInt(qtyInput.value),
        cartId: Date.now().toString() 
    };

    cart.push(item);
    updateCart();
    modal.classList.add('hidden');
    showToast(`تم إضافة ${item.name} إلى السلة!`);
    openCart();
});

window.updateItemQty = function(cartId, change) {
    const itemIndex = cart.findIndex(item => item.cartId === cartId);
    if (itemIndex > -1) {
        let newQty = cart[itemIndex].qty + change;
        if (newQty > 0) {
            cart[itemIndex].qty = newQty;
            updateCart();
        } else if (newQty === 0) {
            removeFromCart(cartId);
        }
    }
};

window.removeFromCart = function(cartId) {
    cart = cart.filter(item => item.cartId !== cartId);
    updateCart();
    showToast("تم حذف المنتج من السلة");
};

function updateCart() {
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('cart-count').textContent = count;

    const cartContainer = document.getElementById('cart-items');
    const summaryContainer = document.getElementById('summary-items');
    
    cartContainer.innerHTML = '';
    summaryContainer.innerHTML = '';
    let subtotal = 0;

    if (cart.length === 0) {
        cartContainer.innerHTML = '<p style="text-align:center; margin-top:20px;">سلة المشتريات فارغة.</p>';
        summaryContainer.innerHTML = '<p class="empty-summary">سلة المشتريات فارغة.</p>';
        document.getElementById('cart-subtotal').textContent = `0.00 DT`;
        document.getElementById('cart-total-price').textContent = `0.00 DT`;
        document.getElementById('summary-subtotal').textContent = `0.00 DT`;
        document.getElementById('summary-total-price').textContent = `0.00 DT`;
    } else {
        cart.forEach(item => {
            const itemTotal = item.price * item.qty;
            subtotal += itemTotal;

            const safeName = escapeHTML(item.name);
            const safeDiameter = escapeHTML(item.diameter);
            const safeMachine = escapeHTML(item.machine);

            cartContainer.innerHTML += `
                <div class="cart-item">
                    <img src="${item.image}" class="cart-item-img" alt="${safeName}">
                    <div class="cart-item-details">
                        <div class="cart-item-info">
                            <h4>${safeName}</h4>
                            <p>${safeDiameter} ${safeMachine !== 'غير محدد' ? `| ${safeMachine}` : ''}</p>
                        </div>
                        <div class="cart-controls">
                            <button class="mini-qty-btn" onclick="updateItemQty('${item.cartId}', 1)">+</button>
                            <span style="font-weight:bold;">${item.qty}</span>
                            <button class="mini-qty-btn" onclick="updateItemQty('${item.cartId}', -1)">-</button>
                        </div>
                    </div>
                    <div class="cart-item-price-col">
                        <div class="cart-item-price">${itemTotal.toFixed(2)} DT</div>
                        <button class="remove-item" onclick="removeFromCart('${item.cartId}')"><i class="fa-solid fa-trash"></i> حذف</button>
                    </div>
                </div>
            `;

            summaryContainer.innerHTML += `
                <div class="cart-item" style="border-bottom: 1px dashed #ddd; margin-bottom:10px; padding-bottom:10px;">
                    <img src="${item.image}" style="width: 40px; height: 40px; border-radius: 4px; object-fit: cover;" alt="${safeName}">
                    <div class="cart-item-info" style="flex:1; margin-right:10px;">
                        <h4 style="font-size:0.9rem;">${item.qty}x ${safeName}</h4>
                        <p style="font-size:0.8rem; margin:0;">${safeDiameter}</p>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end;">
                        <div class="cart-item-price" style="font-size:0.9rem;">${itemTotal.toFixed(2)} DT</div>
                        <button class="remove-item" onclick="removeFromCart('${item.cartId}')" style="font-size:0.75rem;">حذف</button>
                    </div>
                </div>
            `;
        });

        const grandTotal = subtotal + DELIVERY_FEE;

        document.getElementById('cart-subtotal').textContent = `${subtotal.toFixed(2)} DT`;
        document.getElementById('cart-total-price').textContent = `${grandTotal.toFixed(2)} DT`;
        document.getElementById('summary-subtotal').textContent = `${subtotal.toFixed(2)} DT`;
        document.getElementById('summary-total-price').textContent = `${grandTotal.toFixed(2)} DT`;
    }
}

function openCart() { slideCart.classList.add('open'); cartOverlay.classList.remove('hidden'); }
function closeCart() { slideCart.classList.remove('open'); cartOverlay.classList.add('hidden'); }

cartToggle.addEventListener('click', openCart);
closeCartBtn.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);
document.getElementById('go-to-checkout').addEventListener('click', closeCart);

// إرسال الطلب بالتليجرام (تم تحويله للـ HTML لتجنب أخطاء العلامات الخاصة)
checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (cart.length === 0) {
        showToast("عذراً، سلة المشتريات فارغة!");
        return;
    }

    const phoneInput = document.getElementById('phone').value.trim();
    const phoneRegex = /^[0-9]{8}$/; 
    
    if (!phoneRegex.test(phoneInput)) {
        showToast("خطأ: الرجاء إدخال رقم هاتف صحيح متكون من 8 أرقام.");
        document.getElementById('phone').focus();
        return; 
    }

    const fullname = escapeHTML(document.getElementById('fullname').value.trim());
    const phone = escapeHTML(phoneInput);
    const state = escapeHTML(document.getElementById('state').value.trim());
    const address = escapeHTML(document.getElementById('address').value.trim());
    const notes = escapeHTML(document.getElementById('notes').value.trim());

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const grandTotal = (subtotal + DELIVERY_FEE).toFixed(2);
    const date = new Date().toLocaleString('ar-TN');

    let message = `<b>🆕 طلب جديد - Next Store 🆕</b>\n\n`;
    message += `<b>👤 الاسم واللقب:</b> ${fullname}\n`;
    message += `<b>📞 الهاتف:</b> ${phone}\n`;
    message += `<b>📍 الولاية:</b> ${state}\n`;
    message += `<b>🏠 العنوان:</b> ${address}\n`;
    if(notes) message += `<b>📝 ملاحظات:</b> ${notes}\n`;
    
    message += `\n<b>🛒 المنتجات المطلوبة:</b>\n`;
    cart.forEach((item, index) => {
        message += `\n${index + 1}. <b>${escapeHTML(item.name)}</b>\n`;
        message += `   - الكمية: ${item.qty}\n`;
        message += `   - المقاس: ${escapeHTML(item.diameter)}\n`;
        if(item.machine !== 'غير محدد') message += `   - الآلة: ${escapeHTML(item.machine)}\n`;
    });

    message += `\n<b>🚚 التوصيل:</b> 7.00 DT`;
    message += `\n<b>💰 الإجمالي المطلوب:</b> ${grandTotal} DT\n`;
    message += `<b>⏰ التاريخ:</b> ${date}`;

    const telegramURL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    try {
        const response = await fetch(telegramURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });

        if (response.ok) {
            showToast("تم تسجيل طلبك بنجاح! سنتصل بك قريباً.");
            cart = [];
            updateCart();
            checkoutForm.reset();
        } else {
            showToast("حدث خطأ في الإرسال. يرجى الطلب عبر الواتساب.");
        }
    } catch (error) {
        showToast("خطأ في الاتصال. يرجى الطلب عبر الواتساب.");
    }
});

// الطلب عبر WhatsApp
whatsappOrderBtn.addEventListener('click', () => {
    if (cart.length === 0) {
        showToast("عذراً، سلة المشتريات فارغة!");
        return;
    }

    const fullname = document.getElementById('fullname').value.trim() || "حريف جديد";
    const phone = document.getElementById('phone').value.trim() || "غير مسجل";
    
    let waMessage = `عسلامة، نحب نعدي Commande من Next Store:\n\n`;
    
    cart.forEach(item => {
        waMessage += `- ${item.qty}x ${item.name} (${item.diameter})\n`;
        if(item.machine !== 'غير محدد') waMessage += `  الآلة: ${item.machine}\n`;
    });
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const grandTotal = (subtotal + DELIVERY_FEE).toFixed(2);
    
    waMessage += `\n🚚 التوصيل: 7.00 DT`;
    waMessage += `\n💰 المجموع الإجمالي: ${grandTotal} DT\n`;
    waMessage += `\nالاسم: ${fullname}\nالهاتف: ${phone}`;

    const waURL = `https://wa.me/21655100046?text=${encodeURIComponent(waMessage)}`;
    window.open(waURL, '_blank');
});

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => { toast.classList.add('hidden'); }, 3500);
}

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});
