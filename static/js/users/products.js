/* --------------------------------------------------
    PRODUCT DATA (from brochure)
-------------------------------------------------- */
const PRODUCTS = [
    // HOSPITAL BEDS
    { id:1,  name:"Manual Hospital Bed (2 Cranks)",    cat:"Hospital Beds",          specs:["Standard size","2-crank adjustable","Max 150kg"],                certified:true,  availFor:"both", rentPrice:1800,  buyPrice:15500, rentUnit:"month"   },
    { id:2,  name:"Manual Hospital Bed (3 Cranks)",    cat:"Hospital Beds",          specs:["Standard size","3-crank full adjust","Max 150kg"],               certified:true,  availFor:"both", rentPrice:2500,  buyPrice:27500, rentUnit:"month"   },
    { id:3,  name:"Electric Hospital Bed (2 Cranks)",  cat:"Hospital Beds",          specs:["Electric motor","2-position adjust","Max 150kg"],                certified:true,  availFor:"buy",                   buyPrice:58500                        },
    { id:4,  name:"Electric Hospital Bed (3 Cranks)",  cat:"Hospital Beds",          specs:["Electric motor","Full 3-position","Remote control"],             certified:true,  availFor:"buy",                   buyPrice:65000                        },
    { id:5,  name:"Overbed Table",                     cat:"Hospital Beds",          specs:["Height adjustable","Swivel top","Fits all beds"],               certified:false, availFor:"buy",                   buyPrice:1800                         },
    { id:6,  name:"Foot Bed Step Stool",               cat:"Hospital Beds",          specs:["Non-slip surface","Steel frame"],                               certified:false, availFor:"buy",                   buyPrice:2500                         },
    { id:7,  name:"Air Mattress",                      cat:"Hospital Beds",          specs:["Anti-bedsore","Alternating pressure","Pump included"],          certified:false, availFor:"buy",                   buyPrice:3300                         },
    // OXYGEN EQUIPMENT
    { id:8,  name:"Medical Oxygen Tank (6 lbs)",       cat:"Oxygen Equipment",       specs:["6 lbs capacity","Portable","With valve"],                       certified:true,  availFor:"both", rentPrice:700,   buyPrice:4000,  rentUnit:"refill"  },
    { id:9,  name:"Medical Oxygen Tank (10 lbs)",      cat:"Oxygen Equipment",       specs:["10 lbs capacity","Medium size"],                                certified:true,  availFor:"both", rentPrice:700,   buyPrice:4500,  rentUnit:"refill"  },
    { id:10, name:"Medical Oxygen Tank (20 lbs)",      cat:"Oxygen Equipment",       specs:["20 lbs capacity","Standard"],                                   certified:true,  availFor:"both", rentPrice:700,   buyPrice:5500,  rentUnit:"refill"  },
    { id:11, name:"Medical Oxygen Tank (50 lbs)",      cat:"Oxygen Equipment",       specs:["50 lbs","Large capacity"],                                      certified:true,  availFor:"both", rentPrice:900,   buyPrice:10500, rentUnit:"refill"  },
    { id:12, name:"Oxygen Regulator",                  cat:"Oxygen Equipment",       specs:["Flow rate control","Universal fit"],                            certified:false, availFor:"both", rentPrice:500,   buyPrice:1500,  rentUnit:"month"   },
    { id:13, name:"Oxygen Concentrator 5 LPM",         cat:"Oxygen Equipment",       specs:["5 liters per min","Continuous flow","Home use"],                certified:true,  availFor:"both", rentPrice:4000,  buyPrice:35000, rentUnit:"15 days" },
    { id:14, name:"Oxygen Concentrator 10 LPM",        cat:"Oxygen Equipment",       specs:["10 liters per min","Heavy duty","ICU-grade"],                   certified:true,  availFor:"both", rentPrice:9000,  buyPrice:60000, rentUnit:"month"   },
    // WHEELCHAIRS & MOBILITY
    { id:15, name:"Standard Wheelchair",               cat:"Wheelchairs & Mobility", specs:["Steel frame","Foldable","Adjustable footrests"],               certified:false, availFor:"both", rentPrice:1100,  buyPrice:5300,  rentUnit:"month"   },
    { id:16, name:"Reclining Wheelchair w/ Commode",   cat:"Wheelchairs & Mobility", specs:["Reclining backrest","Commode seat","Heavy duty"],               certified:false, availFor:"both", rentPrice:1300,  buyPrice:11000, rentUnit:"month"   },
    { id:17, name:"Travel Wheelchair",                  cat:"Wheelchairs & Mobility", specs:["Lightweight","Foldable","Compact"],                             certified:false, availFor:"buy",                   buyPrice:7200                         },
    { id:18, name:"Walker w/ Wheels & Foam",           cat:"Wheelchairs & Mobility", specs:["4-wheel walker","Foam handles","Height adjustable"],            certified:false, availFor:"buy",                   buyPrice:1700                         },
    { id:19, name:"Commode w/ Foam",                   cat:"Wheelchairs & Mobility", specs:["Steel frame","Removable bucket","Non-slip feet"],              certified:false, availFor:"buy",                   buyPrice:2900                         },
    { id:20, name:"Quad Cane",                         cat:"Wheelchairs & Mobility", specs:["4-point base","Height adjustable"],                             certified:false, availFor:"buy",                   buyPrice:1250                         },
    { id:21, name:"Single Cane",                       cat:"Wheelchairs & Mobility", specs:["Lightweight","Derby handle"],                                   certified:false, availFor:"buy",                   buyPrice:950                          },
    { id:22, name:"Seat Cane",                         cat:"Wheelchairs & Mobility", specs:["Built-in seat","Foldable","Tripod base"],                       certified:false, availFor:"buy",                   buyPrice:1080                         },
    { id:23, name:"Foldable Stretcher",                cat:"Wheelchairs & Mobility", specs:["Aluminum frame","Foldable","250kg capacity"],                   certified:false, availFor:"buy",                   buyPrice:3900                         },
    // MEDICAL DEVICES
    { id:24, name:"CPAP Machine",                      cat:"Medical Devices",        specs:["Sleep apnea therapy","Humidifier","Quiet motor"],               certified:true,  availFor:"both", rentPrice:8000,  buyPrice:52500, rentUnit:"month"   },
    { id:25, name:"BPAP Machine",                      cat:"Medical Devices",        specs:["Bi-level pressure","Auto titration","Data tracking"],           certified:true,  availFor:"buy",                   buyPrice:57500                        },
    { id:26, name:"Nebulizer Machine",                 cat:"Medical Devices",        specs:["Aerosol therapy","Includes mask","Quiet"],                      certified:true,  availFor:"buy",                   buyPrice:2600                         },
    { id:27, name:"Suction Machine",                   cat:"Medical Devices",        specs:["800mmHg suction","1L canister","Portable"],                     certified:true,  availFor:"both", rentPrice:800,   buyPrice:22000, rentUnit:"month"   },
    { id:28, name:"Pulse Oximeter",                    cat:"Medical Devices",        specs:["SpO2 & pulse","Finger clip","OLED display"],                    certified:false, availFor:"buy",                   buyPrice:375                          },
    { id:29, name:"Stethoscope",                       cat:"Medical Devices",        specs:["Dual head","Acoustic","Adult size"],                            certified:false, availFor:"buy",                   buyPrice:1900                         },
    { id:30, name:"Manual BP Apparatus",               cat:"Medical Devices",        specs:["Mercury-free","Aneroid type","Adult cuff"],                     certified:false, availFor:"buy",                   buyPrice:1750                         },
    { id:31, name:"Digital BP Apparatus",              cat:"Medical Devices",        specs:["Auto-inflate","Memory storage","Irregular heartbeat detection"],certified:false, availFor:"buy",                   buyPrice:1750                         },
    { id:32, name:"Scrub Suit (Cargo)",                cat:"Medical Devices",        specs:["Cargo pockets","Unisex","Breathable fabric"],                   certified:false, availFor:"buy",                   buyPrice:850                          },
];

/* --------------------------------------------------
    STATE
-------------------------------------------------- */
let cart = [];
let currentProduct = null;
let selectedMode = null;
let activeTab = "All";

/* --------------------------------------------------
    TABS
-------------------------------------------------- */
function setTab(el) {
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    activeTab = el.dataset.cat;
    renderProducts();
}

/* --------------------------------------------------
    RENDER PRODUCTS
-------------------------------------------------- */
function renderProducts() {
    const q     = document.getElementById('productSearch').value.toLowerCase();
    const sort  = document.getElementById('sortOrder').value;
    const grid  = document.getElementById('productGrid');

    let filtered = PRODUCTS.filter(p => {
        const matchCat = activeTab === 'All' || p.cat === activeTab;
        const matchQ   = p.name.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q);
        return matchCat && matchQ;
    });

    if (sort === 'price-low') {
        filtered.sort((a, b) => (a.buyPrice || a.rentPrice) - (b.buyPrice || b.rentPrice));
    } else if (sort === 'price-high') {
        filtered.sort((a, b) => (b.buyPrice || b.rentPrice) - (a.buyPrice || a.rentPrice));
    }

    if (!filtered.length) {
        grid.innerHTML = '<div class="no-results"><span class="material-symbols-outlined" style="font-size:40px;display:block;margin-bottom:10px;color:#c5d5e8">search_off</span>No equipment found.</div>';
        return;
    }

    grid.innerHTML = filtered.map(p => {
        // Availability badge
        const availClass = p.availFor === 'rent' ? 'rent-only' : p.availFor === 'buy' ? 'buy-only' : 'both';
        const availText  = p.availFor === 'rent' ? 'Rent Only' : p.availFor === 'buy' ? 'Purchase Only' : 'Rent & Buy';

        // Price block — reuses your existing .dual-price-wrapper classes exactly
        let priceBlock = '';
        if (p.availFor === 'both') {
            priceBlock = `
                <div class="dual-price-wrapper">
                    <div class="price-item">
                        <span class="price-tag">RENT</span>
                        <p class="price-value">₱${p.rentPrice.toLocaleString()}<small>/${p.rentUnit}</small></p>
                    </div>
                    <div class="price-divider"></div>
                    <div class="price-item">
                        <span class="price-tag">BUY</span>
                        <p class="price-value">₱${p.buyPrice.toLocaleString()}</p>
                    </div>
                </div>`;
        } else if (p.availFor === 'rent') {
            priceBlock = `
                <div class="dual-price-wrapper">
                    <div class="price-item">
                        <span class="price-tag">RENT</span>
                        <p class="price-value">₱${p.rentPrice.toLocaleString()}<small>/${p.rentUnit}</small></p>
                    </div>
                </div>`;
        } else {
            priceBlock = `
                <div class="dual-price-wrapper">
                    <div class="price-item">
                        <span class="price-tag">BUY</span>
                        <p class="price-value">₱${p.buyPrice.toLocaleString()}</p>
                    </div>
                </div>`;
        }

        // Button — reuses your existing .btn-rent / .btn-buy / .dual-action-buttons
        let btnBlock = '';
        if (p.availFor === 'both') {
            btnBlock = `
                <div class="dual-action-buttons">
                    <button class="btn-rent" onclick="openModal(${p.id})">Rent Now</button>
                    <button class="btn-buy"  onclick="openModal(${p.id})">Purchase</button>
                </div>`;
        } else if (p.availFor === 'rent') {
            btnBlock = `
                <div class="dual-action-buttons">
                    <button class="btn-rent" style="grid-column:1/-1;" onclick="openModal(${p.id})">Rent Now</button>
                </div>`;
        } else {
            btnBlock = `
                <div class="dual-action-buttons">
                    <button class="btn-buy" style="grid-column:1/-1;" onclick="openModal(${p.id})">Purchase</button>
                </div>`;
        }

        // Specs — reuses your existing .product-specs with material-symbols-outlined
        const specsHtml = p.specs.map(s =>
            `<li><span class="material-symbols-outlined">check_circle</span> ${s}</li>`
        ).join('');

        const certHtml = p.certified
            ? `<div class="trust-badge"><span class="material-symbols-outlined" style="font-size:16px;">verified</span> Sanitized & Certified</div>`
            : '';

        return `
        <div class="product-card" data-name="${p.name}">
            <div class="stock-badge">✓ IN STOCK</div>
            <div class="avail-badge ${availClass}">${availText}</div>

            <div class="product-image-box">
                <div class="no-image-placeholder"></div>
            </div>

            <h3 class="product-name">${p.name}</h3>
            ${certHtml}

            <ul class="product-specs">${specsHtml}</ul>

            ${priceBlock}
            ${btnBlock}
        </div>`;
    }).join('');
}

/* --------------------------------------------------
    MODAL
-------------------------------------------------- */
function openModal(id) {
    currentProduct = PRODUCTS.find(p => p.id === id);
    selectedMode   = null;

    document.getElementById('modalName').textContent = currentProduct.name;
    document.getElementById('modalCat').textContent  = currentProduct.cat;
    document.getElementById('durationWrap').classList.remove('show');
    document.getElementById('modalTotalRow').style.display = 'none';
    document.getElementById('modalAddBtn').disabled = true;
    document.getElementById('durationSelect').value = '1';

    const p = currentProduct;
    let optHTML = '';
    if (p.availFor === 'both' || p.availFor === 'rent') {
        optHTML += `
        <div class="modal-option-card" id="opt-rent" onclick="selectMode('rent')">
            <div class="modal-option-icon">📅</div>
            <div class="modal-option-label">Rent</div>
            <div class="modal-option-price">₱<strong>${p.rentPrice.toLocaleString()}</strong> / ${p.rentUnit}</div>
        </div>`;
    }
    if (p.availFor === 'both' || p.availFor === 'buy') {
        optHTML += `
        <div class="modal-option-card" id="opt-buy" onclick="selectMode('buy')">
            <div class="modal-option-icon">🛒</div>
            <div class="modal-option-label">Purchase</div>
            <div class="modal-option-price">One-time: ₱<strong>${p.buyPrice.toLocaleString()}</strong></div>
        </div>`;
    }
    document.getElementById('modalOptions').innerHTML = optHTML;

    // Auto-select if only one option
    if (p.availFor === 'rent') selectMode('rent');
    if (p.availFor === 'buy')  selectMode('buy');

    document.getElementById('modalOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function selectMode(mode) {
    selectedMode = mode;
    document.querySelectorAll('.modal-option-card').forEach(c => c.classList.remove('selected', 'sel-buy'));
    const el = document.getElementById('opt-' + mode);
    if (el) el.classList.add('selected', mode === 'buy' ? 'sel-buy' : '');

    const showDuration = mode === 'rent' && currentProduct.rentUnit === 'month';
    document.getElementById('durationWrap').classList.toggle('show', showDuration);
    document.getElementById('modalTotalRow').style.display = 'flex';
    document.getElementById('modalAddBtn').disabled = false;
    updateModalTotal();
}

function updateModalTotal() {
    const p = currentProduct;
    if (!selectedMode) return;
    let total, label;
    if (selectedMode === 'buy') {
        total = p.buyPrice;
        label = 'Purchase Price';
    } else {
        const dur = parseInt(document.getElementById('durationSelect').value) || 1;
        if (p.rentUnit === 'month') {
            total = p.rentPrice * dur;
            label = `${dur} Month${dur > 1 ? 's' : ''} Rental`;
        } else {
            total = p.rentPrice;
            label = `Rental (per ${p.rentUnit})`;
        }
    }
    document.getElementById('modalTotalLabel').textContent = label;
    document.getElementById('modalTotalVal').textContent   = '₱' + total.toLocaleString();
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
    document.body.style.overflow = '';
    currentProduct = null;
    selectedMode   = null;
}

function closeModalOnBg(e) {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
}

/* --------------------------------------------------
    CART
-------------------------------------------------- */
function addToCart() {
    if (!currentProduct || !selectedMode) return;
    const p = currentProduct;
    let detail, price;

    if (selectedMode === 'buy') {
        detail = 'Purchase';
        price  = p.buyPrice;
    } else {
        const dur = parseInt(document.getElementById('durationSelect').value) || 1;
        if (p.rentUnit === 'month') {
            detail = `${dur} Month${dur > 1 ? 's' : ''} Rental`;
            price  = p.rentPrice * dur;
        } else {
            detail = `Rental (per ${p.rentUnit})`;
            price  = p.rentPrice;
        }
    }

    cart.push({ id: Date.now(), name: p.name, detail, price });
    updateCartUI();
    closeModal();
    showToast(p.name + ' added to order!');
}

function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    updateCartUI();
}

function updateCartUI() {
    const badge  = document.getElementById('cartBadge');
    const footer = document.getElementById('cartFooter');
    const list   = document.getElementById('cartItemsList');

    badge.style.display = cart.length ? 'flex' : 'none';
    badge.textContent   = cart.length;

    if (!cart.length) {
        list.innerHTML = `
            <div class="cart-empty-state">
                <i class="fa-regular fa-clipboard"></i>
                <p>Your order is empty</p>
            </div>`;
        footer.style.display = 'none';
        return;
    }

    footer.style.display = 'block';
    list.innerHTML = cart.map(i => `
        <div class="cart-item-row">
            <div class="cart-item-info">
                <p class="cart-item-name">${i.name}</p>
                <p class="cart-item-detail">${i.detail}</p>
            </div>
            <div class="cart-item-right">
                <span class="cart-item-price">₱${i.price.toLocaleString()}</span>
                <button class="cart-remove-btn" onclick="removeFromCart(${i.id})">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        </div>`).join('');

    const total = cart.reduce((s, i) => s + i.price, 0);
    document.getElementById('cartTotal').textContent = '₱' + total.toLocaleString();
}

function openCart() {
    document.getElementById('cartPanel').classList.add('open');
    document.getElementById('cartBackdrop').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    document.getElementById('cartPanel').classList.remove('open');
    document.getElementById('cartBackdrop').classList.remove('open');
    document.body.style.overflow = '';
}

function handleCheckout() {
    if (!cart.length) return;
    // TODO: wire to your booking/inquiry endpoint
    showToast('Inquiry submitted! We will contact you shortly.');
    setTimeout(() => { cart = []; updateCartUI(); closeCart(); }, 1500);
}

/* --------------------------------------------------
    TOAST
-------------------------------------------------- */
function showToast(msg) {
    const t = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

/* --------------------------------------------------
    ORIGINAL SCRIPTS (preserved exactly)
-------------------------------------------------- */
document.addEventListener("DOMContentLoaded", function () {

    // Dropdown toggle
    const trigger = document.getElementById("profileTrigger");
    const menu = document.getElementById("dropdownMenu");

    if (trigger && menu) {
        trigger.addEventListener("click", function (e) {
            e.stopPropagation();
            menu.classList.toggle("show");
        });
    }

    // Close dropdown when clicking outside
    window.addEventListener("click", function (event) {
        if (!event.target.closest(".user-profile-widget")) {
            const dropdowns = document.getElementsByClassName("dropdown-menu");
            for (let i = 0; i < dropdowns.length; i++) {
                let openDropdown = dropdowns[i];
                if (openDropdown.classList.contains("show")) {
                    openDropdown.classList.remove("show");
                }
            }
        }
    });

    // About section IntersectionObserver
    const aboutSection = document.querySelector('#about');
    const aboutNavLink = document.querySelector('a[href="#about"]');

    const observerOptions = {
        root: null,
        threshold: 0.6
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                aboutNavLink.classList.add('active-link');
            } else {
                aboutNavLink.classList.remove('active-link');
            }
        });
    }, observerOptions);

    if (aboutSection) {
        observer.observe(aboutSection);
    }

    // Show/hide elements based on auth state
    if (document.body.classList.contains("logged-in")) {
        document.querySelectorAll(".guest-only").forEach(el => el.style.display = "none");
    } else {
        document.querySelectorAll(".auth-only").forEach(el => el.style.display = "none");
    }

    // Profile image fallback
    const profileImages = document.querySelectorAll('.user-photo-img');

    profileImages.forEach(img => {
        img.onerror = function() {
            const container = this.parentElement;
            container.innerHTML = '<span class="material-symbols-outlined icon-placeholder">account_circle</span>';
            const placeholder = container.querySelector('.icon-placeholder');
            if (container.classList.contains('profile-avatar-large')) {
                placeholder.style.fontSize = "100px";
            } else {
                placeholder.style.fontSize = "38px";
            }
        };
    });

    // Initial product render
    renderProducts();
});