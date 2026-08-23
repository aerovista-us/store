/* SOT: horizon/catalog.json is the Horizon catalog and commerce-readiness source.
   Square remains authoritative for checkout pricing. Production routing stays
   internal, and customer checkout remains fail-closed until explicitly ready. */
(function () {
  "use strict";

  var CATALOG_URL = "catalog.json";
  var CART_KEY = "av_horizon_cart_v1";
  var API_ORIGIN = "https://api.aerovista.us";
  var catalog = null;
  var artworks = [];
  var consumerArtworks = [];
  var lastFocused = null;
  var toastTimer = null;
  var wallIndex = 0;
  var wallTrack = null;
  var wallScrollFrame = null;

  var state = {
    selected: null,
    variantId: null,
    finish: null,
    roomView: false,
    roomTone: "gallery"
  };

  var grid = document.getElementById("artGrid");
  var wallToolbar = document.getElementById("wallToolbar");
  var wallPrev = document.getElementById("wallPrev");
  var wallNext = document.getElementById("wallNext");
  var wallPosition = document.getElementById("wallPosition");
  var modal = document.getElementById("artworkModal");
  var artworkPanel = modal.querySelector(".artwork-panel");
  var stage = document.getElementById("artworkStage");
  var roomContext = document.getElementById("roomContext");
  var roomControls = document.getElementById("roomControls");
  var roomScale = document.getElementById("roomScale");
  var roomToneButtons = Array.prototype.slice.call(roomControls.querySelectorAll("[data-room-tone]"));
  var previewCanvas = document.getElementById("previewCanvas");
  var previewImg = document.getElementById("previewImage");
  var previewImgSecondary = document.getElementById("previewImageSecondary");
  var viewToggle = document.getElementById("viewToggle");
  var panelEyebrow = document.getElementById("panelEyebrow");
  var panelTitle = document.getElementById("panelTitle");
  var panelSubtitle = document.getElementById("panelSubtitle");
  var panelLocation = document.getElementById("panelLocation");
  var panelPrice = document.getElementById("panelPrice");
  var panelStory = document.getElementById("panelStory");
  var productSpecs = document.getElementById("productSpecs");
  var panelSku = document.getElementById("panelSku");
  var inquiryLink = document.getElementById("inquiryLink");
  var sizeOptions = document.getElementById("sizeOptions");
  var finishOptions = document.getElementById("finishOptions");
  var modalClose = document.getElementById("modalClose");
  var addToBagButton = document.getElementById("addToBagButton");
  var purchaseState = document.getElementById("purchaseState");
  var productReadiness = document.getElementById("productReadiness");

  var bagButton = document.getElementById("bagButton");
  var bagCount = document.getElementById("bagCount");
  var cartDrawer = document.getElementById("cartDrawer");
  var cartScrim = document.getElementById("cartScrim");
  var cartClose = document.getElementById("cartClose");
  var cartItems = document.getElementById("cartItems");
  var cartEmpty = document.getElementById("cartEmpty");
  var cartSummary = document.getElementById("cartSummary");
  var cartSubtotal = document.getElementById("cartSubtotal");
  var checkoutButton = document.getElementById("checkoutButton");
  var checkoutStatus = document.getElementById("checkoutStatus");
  var continueShopping = document.getElementById("continueShopping");
  var squareHealth = document.getElementById("squareHealth");
  var toastEl = document.getElementById("toast");

  function money(cents) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (catalog && catalog.currency) || "USD",
      maximumFractionDigits: 0
    }).format((Number(cents) || 0) / 100);
  }

  function productById(id) {
    return artworks.find(function (product) { return product.id === id; }) || null;
  }

  function variantFor(product, variantId) {
    return product && (product.variants || []).find(function (variant) {
      return variant.id === variantId && variant.customerVisible !== false;
    }) || null;
  }

  function preferredVariant(product) {
    var variants = ((product && product.variants) || []).filter(function (variant) {
      return variant.customerVisible !== false;
    });
    return variants.find(function (variant) { return variant.squareMapped; }) || variants[0] || null;
  }

  function selectedVariant() {
    return variantFor(state.selected, state.variantId) || preferredVariant(state.selected);
  }

  function presentationImages(product) {
    return [product && product.image, product && product.secondaryImage].filter(Boolean);
  }

  function productStatus(product, variant) {
    if (product && product.placeholder) return "Artwork pending";
    if (variant && variant.checkoutReady) return "Available";
    if (product && product.status === "preview") return "Made to order";
    return "In development";
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.hidden = false;
    toastTimer = window.setTimeout(function () { toastEl.hidden = true; }, 3800);
  }

  function canvasImageValue(src) {
    return 'url("' + new URL(src, document.baseURI).href.replace(/"/g, "%22") + '")';
  }

  function canvasDimensions(variant) {
    var match = variant && String(variant.label || "").match(/(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)/);
    if (!match) return { height: 20, width: 28 };
    return { height: Number(match[1]), width: Number(match[2]) };
  }

  function syncWallControls() {
    var total = consumerArtworks.length;
    wallPosition.textContent = String(wallIndex + 1).padStart(2, "0") + " / " + String(total).padStart(2, "0");
    wallPrev.disabled = wallIndex <= 0;
    wallNext.disabled = wallIndex >= total - 1;
  }

  function moveWallTo(index, behavior) {
    var pieces = wallTrack ? Array.prototype.slice.call(wallTrack.querySelectorAll(".wall-piece")) : [];
    if (!pieces.length) return;
    wallIndex = Math.max(0, Math.min(index, pieces.length - 1));
    var piece = pieces[wallIndex];
    wallTrack.scrollTo({
      left: piece.offsetLeft - Math.max(0, (wallTrack.clientWidth - piece.offsetWidth) / 2),
      behavior: behavior || "smooth"
    });
    syncWallControls();
  }

  function renderGrid() {
    grid.textContent = "";
    var room = document.createElement("div");
    room.className = "wall-room";
    wallTrack = document.createElement("div");
    wallTrack.className = "wall-display";

    consumerArtworks.forEach(function (art, index) {
      var variant = preferredVariant(art);
      var dimensions = canvasDimensions(variant);
      var article = document.createElement("article");
      article.className = "wall-piece";
      article.style.setProperty("--canvas-w", (dimensions.width * 6.8) + "px");
      article.style.setProperty("--canvas-h", (dimensions.height * 6.8) + "px");
      article.style.setProperty("--canvas-mobile-w", (dimensions.width * 7.2) + "px");
      article.style.setProperty("--canvas-mobile-h", (dimensions.height * 7.2) + "px");

      var artZone = document.createElement("div");
      artZone.className = "wall-art-zone";
      var button = document.createElement("button");
      button.type = "button";
      button.className = "canvas wall-canvas";
      button.style.setProperty("--canvas-image", canvasImageValue(art.image));
      button.addEventListener("click", function () { openArtwork(art, button); });

      var media = document.createElement("span");
      media.className = "canvas-media" + (art.presentation === "diptych" ? " diptych" : "");
      presentationImages(art).forEach(function (src, imageIndex) {
        var img = document.createElement("img");
        img.src = imageIndex === 0 ? (art.wallImage || src) : src;
        img.alt = imageIndex === 0 ? art.alt : "";
        img.loading = "eager";
        media.appendChild(img);
      });
      button.appendChild(media);

      var edge = document.createElement("span");
      edge.className = "canvas-edge";
      edge.setAttribute("aria-hidden", "true");
      button.appendChild(edge);

      var cue = document.createElement("span");
      cue.className = "view-cue";
      cue.innerHTML = "View the Piece <b>↗</b>";
      button.appendChild(cue);
      artZone.appendChild(button);
      article.appendChild(artZone);

      var meta = document.createElement("div");
      meta.className = "wall-label";
      var labelTop = document.createElement("div");
      labelTop.className = "wall-label-top";
      var number = document.createElement("span");
      number.textContent = String(index + 1).padStart(2, "0");
      var status = document.createElement("span");
      status.textContent = productStatus(art, variant);
      labelTop.appendChild(number);
      labelTop.appendChild(status);
      var heading = document.createElement("h3");
      heading.textContent = art.title;
      var subtitle = document.createElement("p");
      subtitle.className = "wall-subtitle";
      subtitle.textContent = art.subtitle;

      var offer = document.createElement("div");
      offer.className = "wall-offer";
      var format = document.createElement("p");
      format.textContent = variant
        ? variant.label + " · " + ((art.finishes || [])[0] || "Canvas")
        : "Format pending";
      var price = document.createElement("strong");
      price.textContent = variant ? money(variant.priceCents) : "Availability pending";
      offer.appendChild(format);
      offer.appendChild(price);

      var viewButton = document.createElement("button");
      viewButton.type = "button";
      viewButton.className = "wall-view-button";
      viewButton.textContent = "View the Piece";
      viewButton.addEventListener("click", function () { openArtwork(art, viewButton); });
      meta.appendChild(labelTop);
      meta.appendChild(heading);
      meta.appendChild(subtitle);
      meta.appendChild(offer);
      meta.appendChild(viewButton);
      article.appendChild(meta);
      wallTrack.appendChild(article);
    });

    room.appendChild(wallTrack);
    grid.appendChild(room);
    wallIndex = 0;
    syncWallControls();
    wallTrack.addEventListener("scroll", function () {
      window.cancelAnimationFrame(wallScrollFrame);
      wallScrollFrame = window.requestAnimationFrame(function () {
        if (window.innerWidth > 850) return;
        var pieces = Array.prototype.slice.call(wallTrack.querySelectorAll(".wall-piece"));
        var center = wallTrack.scrollLeft + wallTrack.clientWidth / 2;
        var nearest = 0;
        var distance = Infinity;
        pieces.forEach(function (piece, index) {
          var pieceCenter = piece.offsetLeft + piece.offsetWidth / 2;
          var nextDistance = Math.abs(pieceCenter - center);
          if (nextDistance < distance) {
            distance = nextDistance;
            nearest = index;
          }
        });
        wallIndex = nearest;
        syncWallControls();
      });
    }, { passive: true });
  }

  function renderOptions(container, values, selectedValue, labelFor, onSelect) {
    container.textContent = "";
    values.forEach(function (value) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = labelFor(value);
      button.className = value === selectedValue ? "selected" : "";
      button.setAttribute("aria-pressed", value === selectedValue ? "true" : "false");
      button.addEventListener("click", function () { onSelect(value); });
      container.appendChild(button);
    });
  }

  function syncProductAction() {
    var variant = selectedVariant();
    if (!variant) {
      addToBagButton.disabled = true;
      purchaseState.textContent = "Unavailable";
      productReadiness.textContent = "No product format is configured.";
      return;
    }

    panelPrice.textContent = money(variant.priceCents);
    addToBagButton.disabled = !variant.squareMapped || !variant.squareVariationId || !variant.cartKey;
    purchaseState.textContent = variant.checkoutReady ? "Ready to order" :
      (variant.squareMapped ? "Online checkout pending" : "Online ordering pending");
    productReadiness.textContent = variant.checkoutReady
      ? "You’ll be connected to Square’s secure checkout to confirm shipping and complete payment."
      : "Online ordering is being prepared. Contact the studio for current availability.";
    if (state.roomView) syncRoomView();
  }

  function renderProductOptions() {
    var product = state.selected;
    if (!product) return;
    var variants = (product.variants || []).filter(function (variant) {
      return variant.customerVisible !== false;
    });
    renderOptions(sizeOptions, variants, selectedVariant(), function (variant) {
      return variant.label + " · " + money(variant.priceCents);
    }, function (variant) {
      state.variantId = variant.id;
      renderProductOptions();
      syncProductAction();
    });

    var finishes = product.finishes || [];
    renderOptions(finishOptions, finishes, state.finish, function (finish) {
      return finish;
    }, function (finish) {
      state.finish = finish;
      renderProductOptions();
    });
  }

  function openArtwork(art, triggerEl) {
    var variant = preferredVariant(art);
    var dimensions = canvasDimensions(variant);
    state.selected = art;
    state.variantId = variant && variant.id;
    state.finish = (art.finishes || [])[0] || null;
    state.roomView = false;
    state.roomTone = "gallery";
    lastFocused = triggerEl || document.activeElement;

    stage.classList.remove("room-shape-panorama", "room-shape-tall", "room-shape-square", "room-shape-standard");
    stage.classList.add(
      art.className === "art-panorama" ? "room-shape-panorama" :
        (art.className === "art-tall" ? "room-shape-tall" :
          (art.className === "art-square" ? "room-shape-square" : "room-shape-standard"))
    );
    previewCanvas.classList.toggle("diptych", art.presentation === "diptych");
    previewCanvas.style.setProperty("--canvas-aspect", dimensions.width + " / " + dimensions.height);
    previewCanvas.style.setProperty("--canvas-image", canvasImageValue(art.image));
    viewToggle.hidden = Boolean(art.placeholder);
    previewImg.src = art.image;
    previewImg.alt = art.alt;
    previewImgSecondary.hidden = !art.secondaryImage;
    previewImgSecondary.src = art.secondaryImage || "";
    previewImgSecondary.alt = "";
    panelEyebrow.textContent = art.collection + " · " + art.orientation;
    panelTitle.textContent = art.title;
    panelSubtitle.textContent = art.subtitle;
    panelLocation.textContent = art.location;
    panelStory.textContent = art.story;
    panelSku.textContent = art.id;
    productSpecs.textContent = "";
    (art.specs || []).forEach(function (spec) {
      var item = document.createElement("li");
      item.textContent = spec;
      productSpecs.appendChild(item);
    });
    inquiryLink.href = "mailto:studio@aerovista.us?subject=" +
      encodeURIComponent(art.title + " availability · " + art.id) +
      "&body=" + encodeURIComponent(
        "I’m interested in " + art.title + " (" + art.id + "). Please confirm the current size, availability, production timing, and checkout status."
      );
    modal.setAttribute("aria-label", art.title + " artwork details");
    artworkPanel.scrollTop = 0;
    renderProductOptions();
    syncProductAction();
    syncRoomView();
    modal.hidden = false;
    document.body.classList.add("modal-open");
    modalClose.focus();
  }

  function closeArtwork() {
    state.selected = null;
    state.roomView = false;
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    lastFocused = null;
  }

  function syncRoomView() {
    stage.classList.toggle("room-view", state.roomView);
    stage.setAttribute("data-room-tone", state.roomTone);
    roomContext.hidden = !state.roomView;
    roomControls.hidden = !state.roomView;
    roomToneButtons.forEach(function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-room-tone") === state.roomTone ? "true" : "false");
    });
    var variant = selectedVariant();
    var roomDimensions = variant && variant.label.match(/\d+(?:\.\d+)?/g);
    var roomWidth = roomDimensions && roomDimensions.length > 1
      ? Number(roomDimensions[1])
      : 32;
    stage.style.setProperty("--room-canvas-width-in", String(roomWidth));
    roomScale.textContent = variant
      ? variant.label.split(" · ")[0] + " · scaled against a 9 ft wall"
      : "Room scale preview";
    viewToggle.textContent = state.roomView ? "Close room view" : "View in room";
  }

  function loadCart() {
    try {
      var raw = JSON.parse(window.localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (error) {
      return [];
    }
  }

  function saveCart(cart) {
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    renderCart();
  }

  function currentLine(line) {
    var product = productById(line.productId);
    var variant = variantFor(product, line.variantId);
    return product && variant ? { product: product, variant: variant, qty: Math.max(1, Number(line.qty) || 1) } : null;
  }

  function addSelectedToCart() {
    var product = state.selected;
    var variant = selectedVariant();
    if (!product || !variant || !variant.squareMapped || !variant.squareVariationId || !variant.cartKey) {
      showToast("This format still needs its Square catalog variation.");
      return;
    }

    var cart = loadCart();
    var existing = cart.find(function (line) {
      return line.productId === product.id && line.variantId === variant.id;
    });
    if (existing) existing.qty = Math.min(10, (Number(existing.qty) || 1) + 1);
    else cart.push({ productId: product.id, variantId: variant.id, qty: 1 });
    saveCart(cart);
    showToast(variant.checkoutReady ? "Added to your bag." : "Saved to your bag — online checkout is still being prepared.");
    closeArtwork();
    openCart();
  }

  function setQuantity(index, quantity) {
    var cart = loadCart();
    if (!cart[index]) return;
    if (quantity <= 0) cart.splice(index, 1);
    else cart[index].qty = Math.min(10, quantity);
    saveCart(cart);
  }

  function renderCart() {
    var raw = loadCart();
    var valid = raw.map(currentLine);
    var count = valid.reduce(function (sum, line) { return sum + (line ? line.qty : 0); }, 0);
    bagCount.textContent = String(count);
    cartItems.textContent = "";
    checkoutStatus.textContent = "";

    valid.forEach(function (line, index) {
      if (!line) return;
      var row = document.createElement("article");
      row.className = "cart-line";
      var image = document.createElement("img");
      image.src = line.product.image;
      image.alt = "";
      var details = document.createElement("div");
      var title = document.createElement("h3");
      title.textContent = line.product.title;
      var variant = document.createElement("p");
      variant.textContent = line.variant.label;
      var readiness = document.createElement("small");
      readiness.textContent = line.variant.checkoutReady ? "Ready for checkout" : "Saved · online checkout pending";
      var controls = document.createElement("div");
      controls.className = "quantity-controls";
      var minus = document.createElement("button");
      minus.type = "button";
      minus.textContent = "−";
      minus.setAttribute("aria-label", "Decrease " + line.product.title + " quantity");
      minus.addEventListener("click", function () { setQuantity(index, line.qty - 1); });
      var quantity = document.createElement("span");
      quantity.textContent = String(line.qty);
      var plus = document.createElement("button");
      plus.type = "button";
      plus.textContent = "+";
      plus.setAttribute("aria-label", "Increase " + line.product.title + " quantity");
      plus.addEventListener("click", function () { setQuantity(index, line.qty + 1); });
      controls.appendChild(minus);
      controls.appendChild(quantity);
      controls.appendChild(plus);
      details.appendChild(title);
      details.appendChild(variant);
      details.appendChild(readiness);
      details.appendChild(controls);
      var price = document.createElement("strong");
      price.textContent = money(line.variant.priceCents * line.qty);
      row.appendChild(image);
      row.appendChild(details);
      row.appendChild(price);
      cartItems.appendChild(row);
    });

    var lines = valid.filter(Boolean);
    var subtotal = lines.reduce(function (sum, line) {
      return sum + line.variant.priceCents * line.qty;
    }, 0);
    cartSubtotal.textContent = money(subtotal);
    cartEmpty.hidden = lines.length > 0;
    cartSummary.hidden = lines.length === 0;

    var squareReady = lines.length > 0 && lines.every(function (line) {
      return line.variant.squareProductionReady;
    });
    setHealth(squareHealth, squareReady);
    var checkoutReady = lines.length > 0 && lines.every(function (line) {
      return line.variant.checkoutReady;
    });
    checkoutButton.disabled = !checkoutReady;
    checkoutButton.textContent = checkoutReady ? "Continue to secure checkout" : "Checkout verification pending";
    if (lines.length && !checkoutReady) {
      checkoutStatus.textContent = "Your selections are saved. Online checkout is still being prepared for one or more pieces.";
    }
  }

  function setHealth(dot, ready) {
    dot.className = "health-dot " + (ready ? "ready" : "pending");
  }

  function openCart() {
    lastFocused = document.activeElement;
    cartScrim.hidden = false;
    cartDrawer.hidden = false;
    cartDrawer.setAttribute("aria-hidden", "false");
    bagButton.setAttribute("aria-expanded", "true");
    document.body.classList.add("cart-open");
    renderCart();
    cartClose.focus();
  }

  function closeCart() {
    cartScrim.hidden = true;
    cartDrawer.hidden = true;
    cartDrawer.setAttribute("aria-hidden", "true");
    bagButton.setAttribute("aria-expanded", "false");
    document.body.classList.remove("cart-open");
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    lastFocused = null;
  }

  function apiUrl(path) {
    if (window.location.hostname === "horizon.aerovista.us") return path;
    return API_ORIGIN + path;
  }

  async function beginCheckout() {
    var lines = loadCart().map(currentLine).filter(Boolean);
    var blocked = lines.filter(function (line) { return !line.variant.checkoutReady; });
    if (blocked.length) {
      checkoutStatus.textContent = "Checkout is safely paused: " + blocked.map(function (line) {
        if (!line.variant.sizeConfirmed) return line.product.title + " needs size confirmation";
        return line.product.title + " is not yet available for online checkout";
      }).join("; ") + ".";
      return;
    }

    checkoutButton.disabled = true;
    checkoutButton.textContent = "Connecting to Square…";
    checkoutStatus.textContent = "";
    try {
      var bootstrapResponse = await fetch(apiUrl("/api/square/bootstrap"), {
        method: "GET",
        cache: "no-store",
        headers: { "Accept": "application/json" }
      });
      if (!bootstrapResponse.ok) throw new Error("Square checkout is unavailable.");
      var bootstrap = await bootstrapResponse.json();
      var sellable = new Set(Array.isArray(bootstrap.sellableCartKeys) ? bootstrap.sellableCartKeys : []);
      var missing = lines.filter(function (line) { return sellable.size && !sellable.has(line.variant.cartKey); });
      if (missing.length) throw new Error("The selected format is not enabled in the production Square map.");

      var body = {
        currency: bootstrap.currency || "USD",
        cart: lines.map(function (line) {
          return {
            sku: line.variant.cartKey,
            variationId: line.variant.squareVariationId,
            qty: line.qty,
            size: line.variant.label,
            color: "Horizon"
          };
        })
      };
      var checkoutResponse = await fetch(apiUrl("/api/square/checkout"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      var result = await checkoutResponse.json().catch(function () { return {}; });
      if (!checkoutResponse.ok || !result.ok || !result.checkoutUrl) {
        throw new Error(result.error || "Square did not return a checkout link.");
      }
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      checkoutStatus.textContent = error.message || "Checkout could not be started.";
      checkoutButton.disabled = false;
      checkoutButton.textContent = "Continue to secure checkout";
    }
  }

  async function loadCatalog() {
    var data = null;
    if (window.location.protocol !== "file:") {
      try {
        var response = await fetch(CATALOG_URL, { cache: "no-store" });
        if (response.ok) data = await response.json();
      } catch (error) {
        console.warn("Live catalog unavailable; using the generated catalog fallback.");
      }
    }
    if (!data && window.HORIZON_CATALOG) data = window.HORIZON_CATALOG;
    if (!data) throw new Error("Catalog could not be loaded.");
    if (!data || !Array.isArray(data.products)) throw new Error("Catalog format is invalid.");
    return data;
  }

  async function init() {
    try {
      catalog = await loadCatalog();
      artworks = catalog.products.filter(function (product) {
        return product.publicVisible === true && (product.imageConfirmed || product.placeholder);
      }).sort(function (left, right) {
        return (left.releasePriority || 999) - (right.releasePriority || 999);
      });
      consumerArtworks = artworks.filter(function (product) {
        return product.consumerVisible !== false;
      });
      renderGrid();
      renderCart();
      document.querySelectorAll("[data-open-product]").forEach(function (button) {
        button.addEventListener("click", function () {
          var product = productById(button.getAttribute("data-open-product"));
          if (product) openArtwork(product, button);
        });
      });
    } catch (error) {
      grid.innerHTML = "<p class=\"catalog-error\">The collection is temporarily unavailable. Please contact studio@aerovista.us.</p>";
      wallToolbar.hidden = true;
      console.error(error);
    }
  }

  viewToggle.addEventListener("click", function () {
    state.roomView = !state.roomView;
    syncRoomView();
  });
  wallPrev.addEventListener("click", function () { moveWallTo(wallIndex - 1); });
  wallNext.addEventListener("click", function () { moveWallTo(wallIndex + 1); });
  roomToneButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      state.roomTone = button.getAttribute("data-room-tone") || "gallery";
      syncRoomView();
    });
  });
  modalClose.addEventListener("click", closeArtwork);
  addToBagButton.addEventListener("click", addSelectedToCart);
  bagButton.addEventListener("click", openCart);
  cartClose.addEventListener("click", closeCart);
  cartScrim.addEventListener("click", closeCart);
  continueShopping.addEventListener("click", function () {
    closeCart();
    document.getElementById("collection").scrollIntoView();
  });
  checkoutButton.addEventListener("click", beginCheckout);
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (!cartDrawer.hidden) closeCart();
    else if (!modal.hidden) closeArtwork();
  });

  init();
})();
