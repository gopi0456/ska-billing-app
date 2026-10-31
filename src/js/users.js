var ADMIN_PASS_B64 = "YWRtaW5AMTIz";
function gv(id){ var e=document.getElementById(id); return e?e.value:''; }
function curUser(){ try{ return JSON.parse(sessionStorage.getItem('currentUser')||'null'); }catch(e){ return null; } }

/* ================= UNIT COLUMN (S = full price, P = half price) ================= */
window.skaSetUnit = function(idx, unit){
  try {
    var item = cart[idx];
    if (!item) return;
    if (item.baseMrp === undefined){ item.baseMrp = item.mrp; item.baseSp = item.sp; item.baseBp = item.bp; }
    var mult = (unit === 'p') ? 0.5 : 1;
    item.mrp = +(item.baseMrp * mult).toFixed(4);
    item.sp  = +(item.baseSp  * mult).toFixed(4);
    item.bp  = +(item.baseBp  * mult).toFixed(4);
    item.unit = unit;
    renderCart();
  } catch(e){}
};
window.skaQtyChange = function(idx, raw){
  try {
    var item = cart[idx];
    if (!item) return;
    var s = String(raw).trim().toLowerCase();
    var m = s.match(/^(\d+(?:\.\d+)?)\s*(s|p)?$/);
    var n = m ? parseFloat(m[1]) : (parseInt(s,10) || 1);
    var unit = (m && m[2]) ? m[2] : (item.unit || 's');
    if (!isFinite(n) || n < 1) n = 1;
    if (item.baseMrp === undefined){ item.baseMrp = item.mrp; item.baseSp = item.sp; item.baseBp = item.bp; }
    var mult = (unit === 'p') ? 0.5 : 1;
    item.mrp = +(item.baseMrp * mult).toFixed(4);
    item.sp  = +(item.baseSp  * mult).toFixed(4);
    item.bp  = +(item.baseBp  * mult).toFixed(4);
    item.qty = n;
    item.unit = unit;
    renderCart();
  } catch(e){}
};
(function(){
  function patch(){
    if (window.renderCart && !window.renderCart.__skaPatched){
      var _orig = window.renderCart;
      window.renderCart = function(){
        var r = _orig.apply(this, arguments);
        try {
          /* add UNIT header once */
          var head = document.querySelector('#billing table thead tr');
          if (head && !head.__skaUnit){
            head.__skaUnit = true;
            var ths = head.querySelectorAll('th');
            for (var h=0; h<ths.length; h++){
              if ((ths[h].textContent||'').trim().toUpperCase() === 'QTY'){
                var nth = document.createElement('th');
                nth.textContent = 'U';
                ths[h].parentNode.insertBefore(nth, ths[h].nextSibling);
                break;
              }
            }
          }
          /* add UNIT cell to each row */
          var body = document.getElementById('cart-body');
          if (body){
            var rows = body.querySelectorAll('tr');
            for (var x=0; x<rows.length; x++){
              (function(tr, idx){
                var item = cart[idx];
                if (!item) return;
                var inp = tr.querySelector('input');
                if (inp){ inp.type = 'number'; inp.style.width = '50px'; }
                var qtyTd = inp ? inp.closest('td') : null;
                var unitTd = tr.querySelector('td[data-ska-unit]');
                if (!unitTd && qtyTd){
                  unitTd = document.createElement('td');
                  unitTd.setAttribute('data-ska-unit','1');
                  qtyTd.parentNode.insertBefore(unitTd, qtyTd.nextSibling);
                }
                if (unitTd){
                  var sel = unitTd.querySelector('select');
                  if (!sel){
                    sel = document.createElement('select');
                    sel.style.cssText = 'width:46px;padding:4px 2px;margin:0;font-size:.8rem;font-weight:700;';
                    sel.innerHTML = '<option value="s">S</option><option value="p">P</option>';
                    unitTd.appendChild(sel);
                  }
                  sel.value = (item.unit === 'p') ? 'p' : 's';
                  sel.onchange = function(){ window.skaSetUnit(idx, sel.value); };
                }
                var badge = tr.querySelector('.qty-badge');
                if (badge) badge.textContent = 'x' + (item.qty||1) + (item.unit === 'p' ? 'p' : '');
              })(rows[x], x);
            }
          }
        } catch(e){}
        return r;
      };
      window.renderCart.__skaPatched = true;
    }
  }
  patch(); setInterval(patch, 800);
})();

/* ================= LOGIN / LOGOUT ================= */
window.attemptLogin = async function(){
  var u = gv('login-username').trim(), p = gv('login-password'), err = document.getElementById('login-error');
  if (!u || !p){ if(err) err.textContent = "Please enter username and password"; return; }
  if (u === 'admin' && p === atob(ADMIN_PASS_B64)){
    var a = { id:0, username:'admin', name:'Administrator', shop_name:'SK AAYURVEDA', subtitle:'KEVA SUPER STOCK POINT', user_type:'admin', bill_prefix:'', bill_from:'', bill_to:'' };
    sessionStorage.setItem('currentUser', JSON.stringify(a));
    document.getElementById('login-overlay').style.display = 'none';
    applyUserSettings(a); return;
  }
  var users = JSON.parse(localStorage.getItem('ska_users')||'[]');
  var found = users.find(function(x){ return x.username===u && x.password===p; });
  if (found){
    sessionStorage.setItem('currentUser', JSON.stringify(found));
    document.getElementById('login-overlay').style.display = 'none';
    applyUserSettings(found);
  } else { if(err) err.textContent = "Invalid username or password"; document.getElementById('login-password').value=''; }
};
window.doLogout = function(){ sessionStorage.removeItem('currentUser'); location.reload(); };

/* ================= BILL NUMBER ================= */
(function(){
  function patch(){
    if (window.generateBillNumber && !window.generateBillNumber.__skaPatched){
      var _orig = window.generateBillNumber;
      window.generateBillNumber = async function(){
        var u = curUser();
        if (u && u.user_type !== 'admin'){
          var prefix = u.bill_prefix || '';
          var from = parseInt(u.bill_from, 10), to = parseInt(u.bill_to, 10);
          if (!isNaN(from) && !isNaN(to)){
            var seqKey = 'ska_seq_' + u.username;
            var seq = parseInt(localStorage.getItem(seqKey) || '0', 10);
            var next = (seq < from) ? from : (seq + 1);
            if (next > to){
              alert('⚠️ Bill number limit reached (' + from + '–' + to + ').\nPlease contact admin to increase the range.');
              return null;
            }
            localStorage.setItem(seqKey, String(next));
            return prefix + String(next).padStart(3, '0');
          } else if (prefix){
            var bn = await _orig.apply(this, arguments);
            return prefix + bn;
          }
        }
        return _orig.apply(this, arguments);
      };
      window.generateBillNumber.__skaPatched = true;
    }
  }
  patch(); setInterval(patch, 800);
})();

/* ================= saveBill ================= */
window.saveBill = async function(){
  var n  = document.getElementById('cust-name').value.trim();
  var mo = document.getElementById('cust-mobile').value.trim();
  var uc = document.getElementById('bill-update-mobile').checked;
  var sm = document.getElementById('show-mrp').checked;
  var ss = document.getElementById('show-sp').checked;
  var sb = document.getElementById('show-bp').checked;
  var si = document.getElementById('stockist-id');
  var u  = curUser();
  var isDistUser = !!(u && u.user_type === 'distributor');
  var sid = '';
  if (isDistUser){ if (sb && si && !si.disabled) sid = si.value.trim(); }
  else if (sm && ss && sb && si && !si.disabled){ sid = si.value.trim(); }
  if (!n || cart.length === 0) return alert('Enter customer and items');
  if (isDistUser){ if (sb && !sid){ if (!confirm('⚠️ Distributor ID is empty.\n\nContinue without Distributor ID?')) return; } }
  else if (sm && ss && sb && !sid){ if (!confirm('⚠️ Stockist ID is empty.\n\nContinue without Stockist ID?')) return; }
  var ct = getCustomerType(sm, ss, sb);
  var pc = [];
  if (sm) pc.push('mrp'); if (ss) pc.push('sp'); if (sb) pc.push('bp');
  var bn = await generateBillNumber();
  if (!bn) return;
  var cs = await DB.query('customers');
  var c = findCustomer(cs, n, mo);
  if (!c){ var cid = await DB.run('customers', {name:n, mobile:mo, customer_type:ct}); c = {id:cid, name:n, mobile:mo, customer_type:ct}; }
  else { if (uc && mo && c.mobile !== mo){ await DB.update('customers', c.id, {mobile:mo}); c.mobile = mo; } await DB.update('customers', c.id, {customer_type:ct}); c.customer_type = ct; }
  var tM = cart.reduce(function(s,i){ return s + i.mrp*i.qty; }, 0);
  var tS = cart.reduce(function(s,i){ return s + i.sp*i.qty; }, 0);
  var tB = cart.reduce(function(s,i){ return s + i.bp*i.qty; }, 0);
  var bid = await DB.run('bills', {bill_number:bn, customer_id:c.id, cust_name:n, cust_mobile:mo, customer_type:ct, date:new Date().toISOString(), total_mrp:tM, total_sp:tS, total_bp:tB, price_columns:pc.join(','), bp_status:'pending', stockist_id:sid, bp_done_date:null, bp_done_remarks:null});
  for (var i=0; i<cart.length; i++){
    var it = cart[i];
    await DB.run('bill_items', {bill_id:bid, item_name:it.item_name, mrp:it.mrp, sp:it.sp, bp:it.bp, qty:it.qty, tot_mrp:it.mrp*it.qty, tot_sp:it.sp*it.qty, tot_bp:it.bp*it.qty});
  }
  var msg = '✅ Bill Saved!\n\n🎫 Bill No: ' + bn + '\n👤 Type: ' + ct.toUpperCase() + '\n💰 BP: ' + tB.toFixed(2);
  if (sid) msg += '\n🏪 ' + (isDistUser ? 'Distributor' : 'Stockist') + ' ID: ' + sid;
  alert(msg);
  cart = []; renderCart();
  document.getElementById('cust-name').value = '';
  document.getElementById('cust-mobile').value = '';
  document.getElementById('stockist-id').value = '';
  document.getElementById('customer-type-display').style.display = 'none';
  resetUpdateMobile('bill');
  await refreshDropdownCache();
};

/* ============ updatePriceDisplay: preserve + auto-fill Distributor ID ============ */
(function(){
  function patch(){
    if (window.updatePriceDisplay && !window.updatePriceDisplay.__skaPatched){
      var _orig = window.updatePriceDisplay;
      window.updatePriceDisplay = function(){
        var siPre = document.getElementById('stockist-id');
        var savedVal = siPre ? siPre.value : '';
        _orig.apply(this, arguments);
        var u = curUser();
        if (u && u.user_type === 'distributor'){
          var sp = document.getElementById('show-sp');
          if (sp){ sp.checked = false; sp.disabled = true; }
          var bpEl = document.getElementById('show-bp');
          var bpChecked = bpEl ? bpEl.checked : false;
          var si = document.getElementById('stockist-id');
          if (si){
            if (bpChecked){
              si.disabled = false; si.readOnly = false; si.removeAttribute('disabled');
              si.placeholder = '🏪 Distributor ID';
              if (!si.value && savedVal) si.value = savedVal;
              if (!si.value){
                var nm = document.getElementById('cust-name');
                var mb = document.getElementById('cust-mobile');
                var key = (nm ? nm.value.trim() : '') + '|' + (mb ? mb.value.trim() : '');
                if (key !== '|' && window.__skaFillKey !== key && typeof autoFetchStockistId === 'function'){
                  window.__skaFillKey = key;
                  autoFetchStockistId(nm.value.trim(), mb ? mb.value.trim() : '').then(function(id){
                    if (id && si && !si.value) si.value = id;
                  }).catch(function(){});
                }
              }
            } else {
              si.disabled = true; si.value = '';
              si.placeholder = '🏪 Distributor ID (Disabled)';
            }
            var label = document.querySelector('label[for="stockist-id"]');
            if (!label && si.parentElement) label = si.parentElement.querySelector('label');
            if (label && label.textContent.indexOf('Stockist ID') > -1){
              label.textContent = label.textContent.replace(/Stockist ID/gi, 'Distributor ID');
            }
          }
        }
      };
      window.updatePriceDisplay.__skaPatched = true;
    }
  }
  patch(); setInterval(patch, 800);
})();

/* ============ selectCustomer: enable + auto-fill ============ */
(function(){
  function patch(){
    if (window.selectCustomer && !window.selectCustomer.__skaPatched2){
      var _orig = window.selectCustomer;
      window.selectCustomer = async function(name, mobile, type){
        var r = await _orig.apply(this, arguments);
        var u = curUser();
        if (u && u.user_type === 'distributor'){
          var bp = document.getElementById('show-bp');
          var si = document.getElementById('stockist-id');
          if (si && (!bp || bp.checked)){
            si.disabled = false; si.removeAttribute('disabled');
            si.placeholder = '🏪 Distributor ID';
            window.__skaFillKey = (name||'') + '|' + (mobile||'');
            if (!si.value && typeof autoFetchStockistId === 'function'){
              try { var id = await autoFetchStockistId(name, mobile||''); if (id) si.value = id; } catch(e){}
            }
          }
        }
        return r;
      };
      window.selectCustomer.__skaPatched2 = true;
    }
  }
  patch(); setInterval(patch, 800);
})();

/* ============ 🔄 fetch button ============ */
(function(){
  function patch(){
    if (window.manualFetchStockistId && !window.manualFetchStockistId.__skaPatched){
      var _orig = window.manualFetchStockistId;
      window.manualFetchStockistId = async function(){
        var u = curUser();
        if (u && u.user_type === 'distributor'){
          var name = document.getElementById('cust-name').value.trim();
          var mobile = document.getElementById('cust-mobile').value.trim();
          if (!name){ alert('⚠️ Enter customer name first'); return; }
          var si = document.getElementById('stockist-id');
          if (si){ si.disabled = false; si.removeAttribute('disabled'); }
          var id = await autoFetchStockistId(name, mobile);
          if (si){
            if (id){ si.value = id; window.__skaFillKey = name + '|' + mobile; alert('✅ Distributor ID fetched: ' + id); }
            else { alert('ℹ️ No previous Distributor ID found.\n\nYou can type a new one.'); }
          }
          return;
        }
        return _orig.apply(this, arguments);
      };
      window.manualFetchStockistId.__skaPatched = true;
    }
  }
  patch(); setInterval(patch, 800);
})();

/* ============ autoFetchStockistId fallbacks ============ */
(function(){
  function patch(){
    if (window.autoFetchStockistId && !window.autoFetchStockistId.__skaPatched){
      var _orig = window.autoFetchStockistId;
      window.autoFetchStockistId = async function(name, mobile){
        var id = await _orig.apply(this, arguments);
        if (id) return id;
        try {
          var nm = (name||'').toLowerCase().trim();
          if (!nm) return '';
          var bills = await DB.query('bills');
          for (var i=bills.length-1;i>=0;i--){
            var b = bills[i];
            if ((b.cust_name||'').toLowerCase().trim() === nm && b.stockist_id && String(b.stockist_id).trim() !== '') return b.stockist_id;
          }
          var cs = await DB.query('customers');
          for (var k=0;k<cs.length;k++){
            if ((cs[k].name||'').toLowerCase().trim() === nm && cs[k].stockist_id && String(cs[k].stockist_id).trim() !== '') return cs[k].stockist_id;
          }
        } catch(e){}
        return '';
      };
      window.autoFetchStockistId.__skaPatched = true;
    }
  }
  patch(); setInterval(patch, 800);
})();

/* ============ Add Customer modal logic ============ */
(function(){
  function patch(){
    if (window.openAddCustomerModal && !window.openAddCustomerModal.__skaPatched){
      var _orig = window.openAddCustomerModal;
      window.openAddCustomerModal = async function(){
        await _orig.apply(this, arguments);
        var u = curUser();
        var typeSelect = document.getElementById('new-cust-type');
        var idInput = document.getElementById('new-cust-stockist-id');
        if (!typeSelect || !idInput) return;
        var isDistLogin = !!(u && u.user_type === 'distributor');
        for (var i=0;i<typeSelect.options.length;i++){
          var opt = typeSelect.options[i];
          if (opt.value === 'stockist'){ opt.style.display = isDistLogin ? 'none' : ''; opt.disabled = isDistLogin; }
        }
        if (isDistLogin && typeSelect.value === 'stockist') typeSelect.value = 'distributor';
        var label = idInput.previousElementSibling && idInput.previousElementSibling.tagName === 'LABEL' ? idInput.previousElementSibling : null;
        var handler = function(){
          var v = typeSelect.value;
          if (v === 'distributor' || v === 'stockist'){
            idInput.disabled = false;
            idInput.placeholder = v === 'distributor' ? 'e.g., DST001' : 'e.g., STK001';
            if (label) label.innerHTML = v === 'distributor' ? '🏪 Distributor ID' : '🏪 Stockist ID';
          } else {
            idInput.disabled = true; idInput.value = '';
            if (label) label.innerHTML = '🏪 Stockist ID (only for Stockist)';
          }
        };
        typeSelect.addEventListener('change', handler);
        handler();
      };
      window.openAddCustomerModal.__skaPatched = true;
    }
  }
  patch(); setInterval(patch, 800);
})();

/* ============ saveNewCustomer: persist ID ============ */
(function(){
  function patch(){
    if (window.saveNewCustomer && !window.saveNewCustomer.__skaPatched){
      var _orig = window.saveNewCustomer;
      window.saveNewCustomer = async function(){
        var nameEl = document.getElementById('new-cust-name');
        var mobEl = document.getElementById('new-cust-mobile');
        var typeEl = document.getElementById('new-cust-type');
        var sidEl = document.getElementById('new-cust-stockist-id');
        var name = nameEl ? nameEl.value.trim() : '';
        var mobile = mobEl ? mobEl.value.trim() : '';
        var type = typeEl ? typeEl.value : 'customer';
        var sid = sidEl ? sidEl.value.trim() : '';
        var r = await _orig.apply(this, arguments);
        try {
          if (sid && (type === 'distributor' || type === 'stockist') && name){
            var md = mobile.replace(/\D/g,'');
            var cs = await DB.query('customers');
            var c = null;
            for (var j=0;j<cs.length;j++){
              if ((cs[j].name||'').toLowerCase() === name.toLowerCase() && ((cs[j].mobile||'').replace(/\D/g,'')) === md){ c = cs[j]; break; }
            }
            if (c){
              try { await DB.update('customers', c.id, { stockist_id: sid }); } catch(e){}
              var bills = await DB.query('bills');
              var has = false;
              for (var i=0;i<bills.length;i++){
                var b = bills[i];
                if ((b.cust_name||'').toLowerCase() === name.toLowerCase() && ((b.cust_mobile||'').replace(/\D/g,'')) === md && b.stockist_id){ has = true; break; }
              }
              if (!has){
                var bn = await generateBillNumber();
                if (bn){
                  await DB.run('bills', {bill_number:bn, customer_id:c.id, cust_name:name, cust_mobile:mobile, customer_type:type, date:new Date().toISOString(), total_mrp:0, total_sp:0, total_bp:0, price_columns:(type==='distributor'?'mrp,bp':'mrp,sp,bp'), bp_status:'done', stockist_id:sid, bp_done_date:new Date().toISOString(), bp_done_remarks:'Customer created with ' + (type==='distributor'?'Distributor':'Stockist') + ' ID'});
                  if (typeof refreshDropdownCache === 'function') await refreshDropdownCache();
                }
              }
            }
          }
        } catch(e){}
        return r;
      };
      window.saveNewCustomer.__skaPatched = true;
    }
  }
  patch(); setInterval(patch, 800);
})();

/* ============ Global distributor option logic ============ */
function applyDistributorOptions(){
  var u = curUser(); if (!u) return;
  var isDist = u.user_type === 'distributor';
  var sels = document.querySelectorAll('select');
  for (var i=0;i<sels.length;i++){
    var sel = sels[i];
    if (sel.closest('#settings') || sel.closest('#login-overlay')) continue;
    for (var j=0;j<sel.options.length;j++){
      var opt = sel.options[j];
      if ((opt.value||'').toLowerCase() === 'stockist'){
        var isCurrent = sel.value === 'stockist';
        if (isDist && !isCurrent){ opt.style.display='none'; opt.disabled=true; }
        else { opt.style.display=''; opt.disabled=false; }
      }
    }
  }
  var reqType = document.getElementById('req-customer-type');
  if (isDist && reqType && reqType.value === 'stockist') reqType.value = 'distributor';
}
setInterval(applyDistributorOptions, 800);

/* ============ Dynamic headers ============ */
(function(){
  function patch(){
    if (window.getBillText && !window.getBillText.__skaPatched){
      var _orig = window.getBillText;
      window.getBillText = function(){
        var t = _orig.apply(this, arguments);
        var u = curUser();
        if (u && typeof t === 'string'){
          t = t.replace('🕉️ *SK AAYURVEDA*', '🕉️ *' + (u.shop_name || 'SK AAYURVEDA') + '*');
          t = t.replace('KEVA SUPER STOCK POINT', u.subtitle || 'KEVA SUPER STOCK POINT');
        }
        return t;
      };
      window.getBillText.__skaPatched = true;
    }
    if (window.viewBillDetails && !window.viewBillDetails.__skaPatched){
      var _origV = window.viewBillDetails;
      window.viewBillDetails = async function(id){
        await _origV.apply(this, arguments);
        var u = curUser();
        if (u){
          var cn = document.querySelector('.company-name');
          var cs = document.querySelector('.company-sub');
          if (cn) cn.textContent = '🕉️ ' + (u.shop_name || 'SK AAYURVEDA');
          if (cs) cs.textContent = u.subtitle || 'KEVA SUPER STOCK POINT';
        }
      };
      window.viewBillDetails.__skaPatched = true;
    }
    try {
      if (window.jspdf && window.jspdf.jsPDF && !window.jspdf.jsPDF.__skaTextPatched){
        var proto = window.jspdf.jsPDF.prototype;
        var _origText = proto.text;
        proto.text = function(){
          var u = curUser();
          if (u && typeof arguments[0] === 'string'){
            if (arguments[0] === 'SK AAYURVEDA') arguments[0] = u.shop_name || arguments[0];
            else if (arguments[0] === 'KEVA SUPER STOCK POINT') arguments[0] = u.subtitle || arguments[0];
          }
          return _origText.apply(this, arguments);
        };
        window.jspdf.jsPDF.__skaTextPatched = true;
      }
    } catch(e){}
    if (window.openShareModal && !window.openShareModal.__skaPatched){
      var _origS = window.openShareModal;
      window.openShareModal = async function(id){
        await _origS.apply(this, arguments);
        var u = curUser();
        if (u){
          var modal = document.getElementById('share-modal');
          if (modal){
            var h = document.getElementById('share-shop-header');
            if (!h){
              h = document.createElement('div'); h.id='share-shop-header';
              h.style.cssText='text-align:center;padding:10px 0;border-bottom:2px solid #f1c40f;margin-bottom:10px;';
              var content = modal.querySelector('.modal-content') || modal;
              content.insertBefore(h, content.firstChild);
            }
            h.innerHTML = '<div style="color:#f1c40f;font-size:1.15rem;font-weight:800;">🕉️ '+(u.shop_name||'').toUpperCase()+'</div><div style="color:#ecf0f1;font-size:0.8rem;letter-spacing:2px;font-weight:600;">'+(u.subtitle||'').toUpperCase()+'</div>';
          }
        }
      };
      window.openShareModal.__skaPatched = true;
    }
    if (window.switchSettingsPanel && !window.switchSettingsPanel.__skaPatched){
      var _origP = window.switchSettingsPanel;
      window.switchSettingsPanel = function(p, b){
        _origP(p, b);
        var panels = document.querySelectorAll('.settings-panel');
        for (var i=0;i<panels.length;i++){ panels[i].classList.remove('active'); panels[i].style.display='none'; }
        var target = document.getElementById('panel-' + p);
        if (target){ target.classList.add('active'); target.style.display='block'; }
        var btns = document.querySelectorAll('.settings-submenu button');
        for (var j=0;j<btns.length;j++) btns[j].classList.remove('active');
        if (b) b.classList.add('active');
      };
      window.switchSettingsPanel.__skaPatched = true;
    }
  }
  patch(); setInterval(patch, 800);
})();

/* ============ Export ============ */
window.exportData = async function(){
  var se = document.getElementById('backup-status');
  try {
    if (se){ se.innerText='⏳ Creating backup...'; se.style.color='orange'; }
    var bd;
    if (DB.isCapacitor && DB.conn){
      bd = {version:'2.0', exportDate:new Date().toISOString(), customers:await DB.query('customers'), products:await DB.query('products'), manual_products:await DB.query('manual_products'), bills:await DB.query('bills'), bill_items:await DB.query('bill_items'), requirements:await DB.query('requirements')};
    } else {
      bd = {version:'2.0', exportDate:new Date().toISOString()};
      for (var k in DB.data) bd[k] = DB.data[k];
    }
    var js = JSON.stringify(bd, null, 2);
    var fn = 'SKA_Backup_' + new Date().toISOString().split('T')[0] + '.json';
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem){
      var FS = window.Capacitor.Plugins.Filesystem;
      try { if (FS.requestPermissions) await FS.requestPermissions(); } catch(pe){}
      try {
        await FS.writeFile({path:fn, data:js, directory:'DOCUMENTS', encoding:'utf8', recursive:true});
        if (se){ se.innerText='✅ Backup saved!'; se.style.color='green'; }
        try {
          var uri = await FS.getUri({path:fn, directory:'DOCUMENTS'});
          if (window.Capacitor.Plugins.Share) await window.Capacitor.Plugins.Share.share({title:'SK Aayurveda Backup', text:'Backup: '+fn, url:uri.uri, dialogTitle:'Save Backup'});
        } catch(s2){}
        alert('✅ Saved!\n\n📁 ' + fn + '\n📍 Documents folder');
        return;
      } catch(docErr){
        try {
          await FS.writeFile({path:fn, data:js, directory:'CACHE', encoding:'utf8', recursive:true});
          var uri2 = await FS.getUri({path:fn, directory:'CACHE'});
          if (window.Capacitor.Plugins.Share){
            await window.Capacitor.Plugins.Share.share({title:'SK Aayurveda Backup', text:'Backup: '+fn, url:uri2.uri, dialogTitle:'Save Backup'});
            if (se){ se.innerText='✅ Backup shared!'; se.style.color='green'; }
            return;
          }
          if (se){ se.innerText='✅ Backup saved!'; se.style.color='green'; }
          alert('✅ Backup saved!'); return;
        } catch(cErr){}
      }
    }
    var bl = new Blob([js], {type:'application/json;charset=utf-8'});
    var fl = new File([bl], fn, {type:'application/json;charset=utf-8'});
    if (navigator.canShare && navigator.canShare({files:[fl]})){
      await navigator.share({files:[fl], title:'Backup'});
      if (se){ se.innerText='✅ Shared!'; se.style.color='green'; }
    } else {
      var u2 = URL.createObjectURL(bl);
      var a = document.createElement('a'); a.href = u2; a.download = fn;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(u2);
      if (se){ se.innerText='✅ Downloaded: ' + fn; se.style.color='green'; }
    }
  } catch(err){
    if (se){ se.innerText='❌ ' + err.message; se.style.color='red'; }
    alert('❌ Export failed: ' + err.message);
  }
};

/* ============ HEADER ============ */
function applyHeader(user){
  var shop = ((user&&user.shop_name)||'SK AAYURVEDA').toUpperCase();
  var sub = ((user&&user.subtitle)||'KEVA SUPER STOCK POINT').toUpperCase();
  var all = document.querySelectorAll('h1, h2, h3, div, span, p');
  for (var i=0;i<all.length;i++){
    var el = all[i];
    if (el.children.length || (el.closest && el.closest('#login-overlay'))) continue;
    var t = (el.textContent||'').trim();
    if (!t) continue;
    if (t.indexOf('SK AAYURVEDA')>-1 && t.length<40){
      el.textContent = '🕉️ ' + shop;
      el.style.color='#f1c40f'; el.style.fontWeight='800'; el.style.textShadow='0 2px 4px rgba(0,0,0,0.45)';
    } else if (t.indexOf('STOCK POINT')>-1 && t.length<60){
      el.textContent = sub;
      el.style.color='#ecf0f1'; el.style.fontWeight='600'; el.style.letterSpacing='2px';
    }
  }
}

/* ============ SETTINGS ============ */
function buildSettingsExtras(){
  var submenu = document.querySelector('.settings-submenu');
  var settings = document.getElementById('settings');
  if (!submenu || !settings) return;
  if (!document.getElementById('panel-profile')){
    var p = document.createElement('div'); p.id='panel-profile'; p.className='settings-panel'; p.style.display='none';
    p.innerHTML = '<div class="card"><h3>👤 User Profile</h3><div id="profile-details" style="padding:15px;background:#f8f9fa;border-radius:8px;margin-bottom:15px;line-height:1.7;"></div><button class="btn btn-danger" onclick="doLogout()">🚪 Logout</button></div>';
    settings.appendChild(p);
  }
  if (!document.getElementById('panel-admin')){
    var a = document.createElement('div'); a.id='panel-admin'; a.className='settings-panel'; a.style.display='none';
    a.innerHTML = '<div class="card"><h3>👑 Manage Users</h3><div style="background:#f8f9fa;padding:15px;border-radius:8px;margin-bottom:15px;"><h4>Add / Update User</h4><input type="text" id="new-username" class="user-form-input" placeholder="Username *"><input type="password" id="new-password" class="user-form-input" placeholder="Password * (blank = keep old)"><input type="text" id="new-name" class="user-form-input" placeholder="Full Name *"><input type="text" id="new-shop-name" class="user-form-input" placeholder="Shop Name *"><input type="text" id="new-subtitle" class="user-form-input" placeholder="Subtitle *"><select id="new-user-type" class="user-form-input"><option value="distributor">Distributor</option><option value="stockist">Stockist</option><option value="admin">Admin</option></select><input type="text" id="new-bill-prefix" class="user-form-input" placeholder="Bill Prefix (e.g., SKP-) optional"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><input type="number" id="new-bill-from" class="user-form-input" placeholder="Bill No From"><input type="number" id="new-bill-to" class="user-form-input" placeholder="Bill No To"></div><input type="hidden" id="edit-user-id" value=""><button class="btn btn-primary" onclick="saveUser()">Save User</button> <button class="btn btn-back" onclick="clearUserForm()">Clear</button></div><h4>Existing Users</h4><div id="users-list"></div></div>';
    settings.appendChild(a);
  }
  var mpBtn = document.getElementById('menu-profile'), maBtn = document.getElementById('menu-admin');
  if (!mpBtn){ mpBtn = document.createElement('button'); mpBtn.id='menu-profile'; mpBtn.textContent='👤 Profile & Logout'; submenu.insertBefore(mpBtn, submenu.lastElementChild); mpBtn.onclick = function(){ if(window.switchSettingsPanel) window.switchSettingsPanel('profile', mpBtn); }; }
  if (!maBtn){ maBtn = document.createElement('button'); maBtn.id='menu-admin'; maBtn.textContent='👑 Manage Users'; submenu.insertBefore(maBtn, submenu.lastElementChild); maBtn.onclick = function(){ if(window.switchSettingsPanel) window.switchSettingsPanel('admin', maBtn); }; }
}

/* ============ USER CRUD ============ */
window.clearUserForm = function(){
  ['new-username','new-password','new-name','new-shop-name','new-subtitle','edit-user-id','new-bill-prefix','new-bill-from','new-bill-to'].forEach(function(id){ var e=document.getElementById(id); if(e) e.value=''; });
};
window.saveUser = async function(){
  var id = gv('edit-user-id').trim(), username = gv('new-username').trim(), password = gv('new-password').trim();
  var name = gv('new-name').trim(), shop_name = gv('new-shop-name').trim(), subtitle = gv('new-subtitle').trim();
  var bill_prefix = gv('new-bill-prefix').trim(), bill_from = gv('new-bill-from').trim(), bill_to = gv('new-bill-to').trim();
  var typeEl = document.getElementById('new-user-type'), user_type = typeEl ? typeEl.value : 'stockist';
  if (!username || !name || !shop_name) return alert('Fill Username, Name, Shop Name');
  var users = JSON.parse(localStorage.getItem('ska_users')||'[]');
  if (id){
    var idx = users.findIndex(function(x){ return String(x.id)===id; });
    if (idx > -1){
      users[idx] = Object.assign({}, users[idx], { username:username, name:name, shop_name:shop_name, subtitle:subtitle, user_type:user_type, bill_prefix:bill_prefix, bill_from:bill_from, bill_to:bill_to });
      if (password) users[idx].password = password;
      localStorage.setItem('ska_users', JSON.stringify(users));
      alert('✅ User updated');
      var me = curUser(); if (me && String(me.id)===id){ Object.assign(me, users[idx]); sessionStorage.setItem('currentUser', JSON.stringify(me)); applyUserSettings(me); }
    }
  } else {
    if (!password) return alert('Password required');
    if (users.find(function(x){ return x.username===username; })) return alert('Username exists');
    users.push({ id: Date.now(), username:username, password:password, name:name, shop_name:shop_name, subtitle:subtitle, user_type:user_type, bill_prefix:bill_prefix, bill_from:bill_from, bill_to:bill_to });
    localStorage.setItem('ska_users', JSON.stringify(users)); alert('✅ User added');
  }
  clearUserForm(); loadUsersList();
};
window.editUser = function(id){
  var users = JSON.parse(localStorage.getItem('ska_users')||'[]'), u = users.find(function(x){ return String(x.id)===String(id); }); if (!u) return;
  var set = function(idv,val){ var e=document.getElementById(idv); if(e) e.value=val; };
  set('edit-user-id', u.id); set('new-username', u.username); set('new-password', ''); set('new-name', u.name||''); set('new-shop-name', u.shop_name||''); set('new-subtitle', u.subtitle||'');
  set('new-bill-prefix', u.bill_prefix||''); set('new-bill-from', u.bill_from||''); set('new-bill-to', u.bill_to||'');
  var t = document.getElementById('new-user-type'); if (t) t.value = u.user_type||'stockist';
};
window.deleteUser = function(id){
  if (!confirm('Delete?')) return;
  var users = JSON.parse(localStorage.getItem('ska_users')||'[]').filter(function(x){ return String(x.id)!==String(id); });
  localStorage.setItem('ska_users', JSON.stringify(users)); loadUsersList();
};
window.loadUsersList = function(){
  var users = JSON.parse(localStorage.getItem('ska_users')||'[]'), box = document.getElementById('users-list'); if (!box) return;
  box.innerHTML = users.map(function(u){
    var col = u.user_type==='admin' ? '#e74c3c' : (u.user_type==='distributor' ? '#f39c12' : '#27ae60');
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:#fff;border:1px solid #e0e0e0;border-radius:8px;margin-bottom:8px;"><div><strong>'+u.name+'</strong> (@'+u.username+')<br><small style="color:#666;">'+(u.shop_name||'')+'</small><br><span style="background:'+col+';color:#fff;padding:2px 8px;border-radius:12px;font-size:.72rem;">'+u.user_type.toUpperCase()+'</span>'+(u.bill_from?' <span style="background:#9b59b6;color:#fff;padding:2px 8px;border-radius:12px;font-size:.72rem;">RANGE '+u.bill_from+'-'+u.bill_to+'</span>':'')+'</div><div><button class="btn btn-edit btn-small" onclick="editUser('+u.id+')">Edit</button> <button class="btn btn-danger btn-small" onclick="deleteUser('+u.id+')">Delete</button></div></div>';
  }).join('') || '<p>No users yet.</p>';
};

/* ============ APPLY SETTINGS ============ */
function applyUserSettings(user){
  if (!user) return;
  buildSettingsExtras();
  applyHeader(user);
  applyDistributorOptions();
  var mp = document.getElementById('menu-profile'), ma = document.getElementById('menu-admin');
  if (mp) mp.style.display='';
  var d = document.getElementById('profile-details');
  if (d) d.innerHTML = '<strong>Name:</strong> '+user.name+'<br><strong>Shop:</strong> '+user.shop_name+'<br><strong>Subtitle:</strong> '+user.subtitle+'<br><strong>Role:</strong> '+user.user_type.toUpperCase()+(user.bill_prefix?'<br><strong>Prefix:</strong> '+user.bill_prefix:'')+(user.bill_from?'<br><strong>Range:</strong> '+user.bill_from+' – '+user.bill_to:'');
  if (user.user_type==='admin'){ if (ma) ma.style.display=''; loadUsersList(); } else { if (ma) ma.style.display='none'; }
  if (typeof window.updatePriceDisplay === 'function') window.updatePriceDisplay();
}

/* ============ INIT ============ */
window.addEventListener('DOMContentLoaded', function(){
  var u = curUser();
  if (u){
    var ov = document.getElementById('login-overlay'); if (ov) ov.style.display='none';
    applyUserSettings(u);
  }
  var lp = document.getElementById('login-password');
  if (lp) lp.addEventListener('keypress', function(e){ if (e.key==='Enter') attemptLogin(); });
});

/* ==== V11-A: Only admin role is built-in; remove "admin" from Add-User types ==== */
(function(){
  var done = false;
  function fix(){
    if (done) return;
    var sel = document.getElementById('new-user-type');
    if (sel){
      var opt = sel.querySelector('option[value="admin"]');
      if (opt){ sel.removeChild(opt); done = true; }
    }
  }
  fix(); setInterval(fix, 1200);
})();

/* ==== V11-B: Hide BP everywhere for CUSTOMER-type bills ==== */
function hideCustomerBp(){
  var i, j, el, badge, t, d;
  /* 1) History > bill list */
  var list = document.getElementById('detail-bill-list');
  if (list){
    var items = list.querySelectorAll('.bill-item');
    for (i=0;i<items.length;i++){
      el = items[i];
      badge = el.querySelector('.customer-type-badge');
      if (!badge || badge.textContent.trim().toUpperCase() !== 'CUSTOMER') continue;
      if (el.getAttribute('data-bpfix')) continue;
      el.setAttribute('data-bpfix','1');
      var nodes = el.querySelectorAll('div,span,button');
      for (j=0;j<nodes.length;j++){
        d = nodes[j];
        t = (d.textContent||'').trim();
        if (/^[\d.,]+\s*BP$/i.test(t)){ d.style.display='none'; continue; }
        if (d.classList && d.classList.contains('bp-status-badge')){ d.style.display='none'; continue; }
        if (d.tagName==='BUTTON' && /BP\s*Done/i.test(t)){ d.style.display='none'; continue; }
        if (t.indexOf('BP:') > -1 && t.length < 90 && d.children.length === 0){
          d.textContent = t.replace(/\|?\s*💰?\s*BP:\s*[\d.,]+/g,'').replace(/\s{2,}/g,' ').replace(/\|\s*$/,'').trim();
        }
      }
    }
  }
  /* 2) View-Bill modal: hide BP Status row */
  var vm = document.getElementById('view-bill-content');
  if (vm && !vm.getAttribute('data-bpfix')){
    var badge2 = vm.querySelector('.customer-type-badge');
    if (badge2 && badge2.textContent.trim().toUpperCase() === 'CUSTOMER'){
      vm.setAttribute('data-bpfix','1');
      var rows = vm.querySelectorAll('.view-bill-info-row');
      for (i=0;i<rows.length;i++){
        if ((rows[i].textContent||'').indexOf('BP Status') > -1) rows[i].style.display='none';
      }
    }
  }
  /* 3) Manage Customers: hide BP total for customer-type */
  var mg = document.getElementById('mgmt-customer-list');
  if (mg){
    var mitems = mg.querySelectorAll('.mgmt-cust-item');
    for (i=0;i<mitems.length;i++){
      el = mitems[i];
      badge = el.querySelector('.customer-type-badge');
      if (!badge || badge.textContent.trim().toUpperCase() !== 'CUSTOMER') continue;
      if (el.getAttribute('data-bpfix')) continue;
      el.setAttribute('data-bpfix','1');
      var leaves = el.querySelectorAll('div');
      for (j=0;j<leaves.length;j++){
        d = leaves[j];
        if (d.children.length) continue;
        t = (d.textContent||'').trim();
        if (/💰\s*[\d.,]+\s*BP$/.test(t)){
          d.textContent = t.replace(/\|\s*💰\s*[\d.,]+\s*BP$/,'').trim();
        }
      }
    }
  }
}
setInterval(hideCustomerBp, 700);

/* ==== V11-C: Monthly BP Summary excludes customer-type bills ==== */
(function(){
  function patch(){
    if (window.updateMonthlySummary && !window.updateMonthlySummary.__skaPatched){
      var _orig = window.updateMonthlySummary;
      window.updateMonthlySummary = function(){
        var keep = null, filtered = false;
        try {
          if (typeof currentCustomerBills !== 'undefined' && Array.isArray(currentCustomerBills)){
            keep = currentCustomerBills;
            currentCustomerBills = keep.filter(function(b){ return (b.customer_type||'customer') !== 'customer'; });
            filtered = true;
          }
        } catch(e){}
        var r = _orig.apply(this, arguments);
        if (filtered){ try { currentCustomerBills = keep; } catch(e){} }
        return r;
      };
      window.updateMonthlySummary.__skaPatched = true;
    }
  }
  patch(); setInterval(patch, 800);
})();

/* ==== V12: Bill stats in User Profile — total(count used) ==== */
window.skaRefreshProfileStats = async function(){
  var u = curUser(); if (!u) return;
  var d = document.getElementById('profile-details');
  if (!d) return;
  var st = document.getElementById('profile-stats');
  if (!st){
    st = document.createElement('div');
    st.id = 'profile-stats';
    st.style.cssText = 'margin-top:10px;padding-top:10px;border-top:1px dashed #ddd;font-size:.9rem;line-height:1.8;';
    d.appendChild(st);
  }
  st.innerHTML = '⏳ Loading bill stats...';
  try {
    var bills = await DB.query('bills');
    var html = '';
    if (u.user_type === 'admin'){
      /* Admin: no range — show total bills + next available number */
      var mx = 0;
      bills.forEach(function(b){
        var mm = String(b.bill_number||'').toUpperCase().match(/(\d+)$/);
        if (mm){ var n = parseInt(mm[1],10); if (n > mx) mx = n; }
      });
      html = '<strong>🧾 Total Bills:</strong> ' + bills.length +
             '<br><strong>🔢 Next Bill No:</strong> SKAA' + String(mx+1).padStart(4,'0');
    } else {
      /* Users with range: total(count used) */
      var from = parseInt(u.bill_from, 10), to = parseInt(u.bill_to, 10);
      var seq = parseInt(localStorage.getItem('ska_seq_' + u.username) || '0', 10);
      var used = 0, total = 0;
      if (!isNaN(from) && !isNaN(to)){
        total = to - from + 1;
        used = (seq >= from) ? (seq - from + 1) : 0;
        if (used < 0) used = 0;
        html += '<strong>🔢 Bill Numbers:</strong> ' + total + '(' + used + ' used)' +
                (used < total ? ' — ' + (total - used) + ' left' : ' — ⚠️ exhausted, contact admin') + '<br>';
      }
      var cnt = 0;
      if (u.bill_prefix){
        bills.forEach(function(b){ if (String(b.bill_number||'').indexOf(u.bill_prefix) === 0) cnt++; });
      } else {
        cnt = used;
      }
      html += '<strong>🧾 Total Bills:</strong> ' + cnt;
    }
    st.innerHTML = html;
  } catch(e){ st.innerHTML = ''; }
};

/* refresh stats after login / settings apply */
(function(){
  if (window.applyUserSettings && !window.applyUserSettings.__skaStats){
    var _orig = window.applyUserSettings;
    window.applyUserSettings = function(){
      var r = _orig.apply(this, arguments);
      setTimeout(function(){ window.skaRefreshProfileStats(); }, 60);
      return r;
    };
    window.applyUserSettings.__skaStats = true;
  }
})();

/* refresh stats after every saved bill */
(function(){
  if (window.saveBill && !window.saveBill.__skaStats){
    var _sb = window.saveBill;
    window.saveBill = async function(){
      var r = await _sb.apply(this, arguments);
      setTimeout(function(){ window.skaRefreshProfileStats(); }, 300);
      return r;
    };
    window.saveBill.__skaStats = true;
  }
})();

/* refresh stats each time Profile panel is opened */
(function(){
  function hook(fnName){
    var fn = window[fnName];
    if (fn && !fn.__skaStats2){
      window[fnName] = function(p, b){
        var r = fn.apply(this, arguments);
        if (p === 'profile' || p === 'panel-profile') setTimeout(function(){ window.skaRefreshProfileStats(); }, 60);
        return r;
      };
      window[fnName].__skaStats2 = true;
    }
  }
  function patch(){ hook('switchSettingsPanel'); hook('switchUserPanel'); }
  patch(); setInterval(patch, 1000);
})();

/* ==== V13-A: Profile stats — users see ONLY total bills; admin unchanged ==== */
window.skaRefreshProfileStats = async function(){
  var u = curUser(); if (!u) return;
  var d = document.getElementById('profile-details');
  if (!d) return;
  var st = document.getElementById('profile-stats');
  if (!st){
    st = document.createElement('div');
    st.id = 'profile-stats';
    st.style.cssText = 'margin-top:10px;padding-top:10px;border-top:1px dashed #ddd;font-size:.9rem;line-height:1.8;';
    d.appendChild(st);
  }
  st.innerHTML = '⏳ Loading...';
  try {
    var bills = await DB.query('bills');
    var html = '';
    if (u.user_type === 'admin'){
      /* ADMIN: unchanged */
      var mx = 0;
      bills.forEach(function(b){
        var mm = String(b.bill_number||'').toUpperCase().match(/(\d+)$/);
        if (mm){ var n = parseInt(mm[1],10); if (n > mx) mx = n; }
      });
      html = '<strong>🧾 Total Bills:</strong> ' + bills.length +
             '<br><strong>🔢 Next Bill No:</strong> SKAA' + String(mx+1).padStart(4,'0');
    } else {
      /* USERS: total bill count ONLY (no range shown) */
      var cnt = 0;
      if (u.bill_prefix){
        bills.forEach(function(b){ if (String(b.bill_number||'').indexOf(u.bill_prefix) === 0) cnt++; });
      } else {
        var seq = parseInt(localStorage.getItem('ska_seq_' + u.username) || '0', 10);
        var from = parseInt(u.bill_from, 10);
        cnt = (!isNaN(from) && seq >= from) ? (seq - from + 1) : (seq > 0 ? seq : 0);
      }
      html = '<strong>🧾 Total Bills:</strong> ' + cnt;
    }
    st.innerHTML = html;
  } catch(e){ st.innerHTML = ''; }
};

/* ==== V13-B: PROFESSIONAL UI THEME (visual only, no layout changes) ==== */
(function(){
  if (document.getElementById('ska-pro-css')) return;
  var st = document.createElement('style');
  st.id = 'ska-pro-css';
  st.textContent = [
    ':root{--bg:#eef2f7;--ink:#0f172a;--acc:#4f46e5;--ring:0 0 0 3px rgba(79,70,229,.18);--sh1:0 1px 2px rgba(15,23,42,.06),0 8px 24px rgba(15,23,42,.07);--r:14px}',
    'body{background:var(--bg)!important;color:var(--ink)!important;font-family:Inter,"Segoe UI",system-ui,-apple-system,sans-serif!important}',
    '.header{background:linear-gradient(135deg,#0b1220 0%,#16213e 55%,#1f2b4a 100%)!important;padding:18px 16px!important;box-shadow:0 6px 20px rgba(2,6,23,.35)!important}',
    '.header .subtitle{color:#9fb3d1!important;letter-spacing:2.2px!important;font-weight:600!important}',
    '.tabs{background:#fff!important;border-bottom:1px solid #e5eaf1!important;box-shadow:0 2px 10px rgba(15,23,42,.05)!important}',
    '.tab-btn{color:#7c8aa0!important;font-weight:700!important}',
    '.tab-btn.active{color:var(--acc)!important;border-bottom-color:var(--acc)!important;background:linear-gradient(180deg,rgba(79,70,229,.07),rgba(79,70,229,0))!important}',
    '.card{background:#fff!important;border:1px solid #e8edf4!important;border-radius:var(--r)!important;box-shadow:var(--sh1)!important;padding:18px!important;margin-bottom:14px!important}',
    '.card h3{color:var(--ink)!important;font-weight:800!important}',
    'input[type="text"],input[type="tel"],input[type="number"],select{border:1.5px solid #dbe3ee!important;border-radius:10px!important;background:#f8fafc!important;font-weight:600!important;color:var(--ink)!important}',
    'input:focus,select:focus{border-color:var(--acc)!important;box-shadow:var(--ring)!important;background:#fff!important}',
    '.btn{border-radius:12px!important;font-weight:800!important;letter-spacing:.3px!important;box-shadow:0 3px 10px rgba(15,23,42,.12)!important}',
    '.btn-primary{background:linear-gradient(135deg,#4f46e5,#7c3aed)!important}',
    '.btn-danger{background:linear-gradient(135deg,#e11d48,#dc2626)!important}',
    '.btn-share{background:linear-gradient(135deg,#0284c7,#2563eb)!important}',
    '.btn-edit{background:linear-gradient(135deg,#f59e0b,#ea580c)!important}',
    '.btn-done{background:linear-gradient(135deg,#059669,#10b981)!important}',
    '.btn-back{background:linear-gradient(135deg,#94a3b8,#64748b)!important}',
    '.btn-export{background:linear-gradient(135deg,#0ea5e9,#0369a1)!important}',
    '.btn-import{background:linear-gradient(135deg,#8b5cf6,#6d28d9)!important}',
    '.table-wrap{border:1px solid #e8edf4!important;border-radius:12px!important}',
    'th{background:#f1f5fb!important;color:#526078!important;font-weight:800!important;letter-spacing:.4px!important}',
    'td{border-bottom:1px solid #eef2f8!important}',
    'tbody tr:nth-child(even){background:#fafcff!important}',
    '.summary-grid div{background:#f6f8fc!important;border:1px solid #e8edf4!important;border-radius:12px!important;font-weight:700!important}',
    '.settings-submenu{border-bottom:2px solid #e8edf4!important}',
    '.settings-submenu button{color:#7c8aa0!important;font-weight:800!important}',
    '.settings-submenu button.active{color:var(--acc)!important;border-bottom-color:var(--acc)!important}',
    '.customer-type-badge{border-radius:999px!important;font-weight:800!important}',
    '.type-stockist{background:#ecfdf5!important;color:#047857!important;border:1.5px solid #34d399!important}',
    '.type-distributor{background:#fff7ed!important;color:#c2410c!important;border:1.5px solid #fb923c!important}',
    '.type-customer{background:#eff6ff!important;color:#1d4ed8!important;border:1.5px solid #60a5fa!important}',
    '.bill-number-badge{background:#312e81!important;border-radius:8px!important}',
    '.bp-pending{background:#fef3c7!important;color:#92400e!important;border:1px solid #fcd34d!important}',
    '.bp-done{background:#dcfce7!important;color:#166534!important;border:1px solid #86efac!important}',
    '.stockist-id-badge{background:#065f46!important}',
    '.modal-content{border-radius:20px!important;box-shadow:0 24px 64px rgba(2,6,23,.35)!important}',
    '.backup-info{background:#f0f9ff!important;border:1px solid #bae6fd!important;border-radius:12px!important}',
    '.manual-prod-item{background:#fffbeb!important;border:1px solid #fde68a!important}',
    '.search-dropdown .dropdown-list{border-radius:0 0 12px 12px!important;box-shadow:0 12px 32px rgba(15,23,42,.14)!important}',
    '.search-dropdown .dropdown-item:hover{background:#eef2ff!important}',
    '.price-selection{background:#f6f8fc!important;border:1.5px solid #e8edf4!important;border-radius:12px!important}',
    '.update-mobile-wrap{background:#fffbeb!important;border:1.5px dashed #f59e0b!important;border-radius:12px!important}',
    '.view-bill-header{background:linear-gradient(135deg,#0b1220,#1e293b)!important;border-radius:14px!important}',
    '.view-bill-total{background:linear-gradient(135deg,#ecfdf5,#d1fae5)!important;border:1px solid #a7f3d0!important;border-radius:14px!important}',
    '.bill-item,.cust-item,.cust-item-req,.mgmt-cust-item{border-radius:14px!important;border:1px solid #e8edf4!important;box-shadow:0 2px 8px rgba(15,23,42,.05)!important}',
    '.month-card{background:linear-gradient(135deg,#eef2ff,#e0e7ff)!important;border:1px solid #c7d2fe!important}',
    '.month-card .m-val{color:#3730a3!important}',
    '#login-overlay{background:linear-gradient(135deg,#0b1220,#16213e 50%,#1f2b4a)!important}'
  ].join('');
  document.head.appendChild(st);
})();

/* ==== V14-A: Profile stats — show "Total (used)" format ==== */
window.skaRefreshProfileStats = async function(){
  var u = curUser(); if (!u) return;
  var d = document.getElementById('profile-details');
  if (!d) return;
  var st = document.getElementById('profile-stats');
  if (!st){
    st = document.createElement('div');
    st.id = 'profile-stats';
    st.style.cssText = 'margin-top:10px;padding-top:10px;border-top:1px dashed #ddd;font-size:.9rem;line-height:1.8;';
    d.appendChild(st);
  }
  st.innerHTML = '⏳ Loading...';
  try {
    var bills = await DB.query('bills');
    var html = '';
    if (u.user_type === 'admin'){
      /* ADMIN: unchanged */
      var mx = 0;
      bills.forEach(function(b){
        var mm = String(b.bill_number||'').toUpperCase().match(/(\d+)$/);
        if (mm){ var n = parseInt(mm[1],10); if (n > mx) mx = n; }
      });
      html = '<strong>🧾 Total Bills:</strong> ' + bills.length +
             '<br><strong>🔢 Next Bill No:</strong> SKAA' + String(mx+1).padStart(4,'0');
    } else {
      /* USERS: show "Total (used)" format */
      var from = parseInt(u.bill_from, 10), to = parseInt(u.bill_to, 10);
      var seq = parseInt(localStorage.getItem('ska_seq_' + u.username) || '0', 10);
      var used = 0, total = 0;
      if (!isNaN(from) && !isNaN(to)){
        total = to - from + 1;
        used = (seq >= from) ? (seq - from + 1) : 0;
        if (used < 0) used = 0;
      } else {
        /* No range set, just count prefix matches */
        if (u.bill_prefix){
          bills.forEach(function(b){ if (String(b.bill_number||'').indexOf(u.bill_prefix) === 0) used++; });
        }
        total = used;
      }
      html = '<strong>🧾 Total Bills:</strong> ' + total + ' (' + used + ' used)';
    }
    st.innerHTML = html;
  } catch(e){ st.innerHTML = ''; }
};

/* ==== V14-B: PROFESSIONAL GLASSMORPHISM CSS (replaces v13 theme) ==== */
(function(){
  var old = document.getElementById('ska-pro-css');
  if (old) old.remove();
  
  var st = document.createElement('style');
  st.id = 'ska-glass-css';
  st.textContent = [
    /* Base glass variables */
    ':root{--glass-bg:rgba(255,255,255,0.08);--glass-border:rgba(255,255,255,0.18);--glass-shadow:0 8px 32px rgba(31,38,135,0.15);--glass-blur:12px;--accent:#6366f1;--accent2:#8b5cf6;--ink:#1e293b;--muted:#64748b}',
    
    /* Body & background */
    'body{background:linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%)!important;background-attachment:fixed!important;font-family:Inter,"SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif!important;color:var(--ink)!important;min-height:100vh!important}',
    
    /* Header glass */
    '.header{background:var(--glass-bg)!important;backdrop-filter:blur(var(--glass-blur))!important;-webkit-backdrop-filter:blur(var(--glass-blur))!important;border-bottom:1px solid var(--glass-border)!important;box-shadow:var(--glass-shadow)!important;padding:20px 16px!important}',
    '.header h2{color:#fff!important;font-weight:800!important;text-shadow:0 2px 8px rgba(0,0,0,0.3)!important;letter-spacing:0.5px!important}',
    '.header .subtitle{color:rgba(255,255,255,0.85)!important;letter-spacing:2.5px!important;font-weight:600!important;text-shadow:0 1px 4px rgba(0,0,0,0.2)!important}',
    
    /* Tabs glass */
    '.tabs{background:rgba(255,255,255,0.12)!important;backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important;border-bottom:1px solid var(--glass-border)!important;box-shadow:0 4px 12px rgba(31,38,135,0.1)!important}',
    '.tab-btn{color:rgba(255,255,255,0.75)!important;font-weight:700!important;transition:all 0.3s ease!important}',
    '.tab-btn:hover{color:#fff!important;background:rgba(255,255,255,0.08)!important}',
    '.tab-btn.active{color:#fff!important;border-bottom:3px solid #fff!important;background:rgba(255,255,255,0.15)!important;box-shadow:inset 0 -2px 8px rgba(255,255,255,0.1)!important}',
    
    /* Cards glass */
    '.card{background:rgba(255,255,255,0.95)!important;backdrop-filter:blur(8px)!important;-webkit-backdrop-filter:blur(8px)!important;border:1px solid rgba(255,255,255,0.3)!important;border-radius:16px!important;box-shadow:0 8px 24px rgba(31,38,135,0.12),0 2px 8px rgba(0,0,0,0.06)!important;padding:20px!important;margin-bottom:16px!important;transition:transform 0.2s ease,box-shadow 0.2s ease!important}',
    '.card:hover{transform:translateY(-2px)!important;box-shadow:0 12px 32px rgba(31,38,135,0.18),0 4px 12px rgba(0,0,0,0.08)!important}',
    '.card h3{color:var(--ink)!important;font-weight:800!important;letter-spacing:-0.3px!important}',
    '.card h3 .icon{filter:drop-shadow(0 2px 4px rgba(0,0,0,0.1))!important}',
    
    /* Inputs glass */
    'input[type="text"],input[type="tel"],input[type="number"],select{background:rgba(255,255,255,0.7)!important;backdrop-filter:blur(4px)!important;border:1.5px solid rgba(148,163,184,0.3)!important;border-radius:12px!important;font-weight:600!important;color:var(--ink)!important;transition:all 0.3s ease!important}',
    'input[type="text"]:focus,input[type="tel"]:focus,input[type="number"]:focus,select:focus{background:rgba(255,255,255,0.95)!important;border-color:var(--accent)!important;box-shadow:0 0 0 4px rgba(99,102,241,0.15)!important;outline:none!important}',
    'input::placeholder{color:var(--muted)!important;font-weight:500!important}',
    
    /* Buttons glass */
    '.btn{border-radius:12px!important;font-weight:700!important;letter-spacing:0.3px!important;box-shadow:0 4px 12px rgba(31,38,135,0.15)!important;transition:all 0.3s ease!important;border:1px solid rgba(255,255,255,0.2)!important;backdrop-filter:blur(6px)!important}',
    '.btn:hover{transform:translateY(-2px)!important;box-shadow:0 6px 16px rgba(31,38,135,0.2)!important}',
    '.btn:active{transform:translateY(0)!important}',
    '.btn-primary{background:linear-gradient(135deg,#6366f1,#8b5cf6)!important;border-color:rgba(255,255,255,0.3)!important}',
    '.btn-danger{background:linear-gradient(135deg,#ef4444,#dc2626)!important;border-color:rgba(255,255,255,0.3)!important}',
    '.btn-share{background:linear-gradient(135deg,#0ea5e9,#0284c7)!important;border-color:rgba(255,255,255,0.3)!important}',
    '.btn-edit{background:linear-gradient(135deg,#f59e0b,#d97706)!important;border-color:rgba(255,255,255,0.3)!important}',
    '.btn-done{background:linear-gradient(135deg,#10b981,#059669)!important;border-color:rgba(255,255,255,0.3)!important}',
    '.btn-back{background:linear-gradient(135deg,#94a3b8,#64748b)!important;border-color:rgba(255,255,255,0.3)!important}',
    '.btn-export{background:linear-gradient(135deg,#06b6d4,#0891b2)!important;border-color:rgba(255,255,255,0.3)!important}',
    '.btn-import{background:linear-gradient(135deg,#a855f7,#9333ea)!important;border-color:rgba(255,255,255,0.3)!important}',
    '.btn-whatsapp{background:linear-gradient(135deg,#25D366,#128C7E)!important;border-color:rgba(255,255,255,0.3)!important}',
    '.btn-sms{background:linear-gradient(135deg,#f59e0b,#ea580c)!important;border-color:rgba(255,255,255,0.3)!important}',
    '.btn-pdf{background:linear-gradient(135deg,#dc2626,#991b1b)!important;border-color:rgba(255,255,255,0.3)!important}',
    '.btn-debug{background:linear-gradient(135deg,#8b5cf6,#7c3aed)!important;border-color:rgba(255,255,255,0.3)!important}',
    
    /* Tables glass */
    '.table-wrap{border:1px solid rgba(148,163,184,0.2)!important;border-radius:14px!important;overflow:hidden!important;box-shadow:inset 0 2px 8px rgba(0,0,0,0.04)!important}',
    'table{background:rgba(255,255,255,0.6)!important;backdrop-filter:blur(4px)!important}',
    'th{background:rgba(99,102,241,0.08)!important;color:var(--ink)!important;font-weight:800!important;letter-spacing:0.4px!important;text-transform:uppercase!important;font-size:0.75rem!important}',
    'td{border-bottom:1px solid rgba(148,163,184,0.15)!important;color:var(--ink)!important}',
    'tbody tr{transition:background 0.2s ease!important}',
    'tbody tr:hover{background:rgba(99,102,241,0.05)!important}',
    'tbody tr:nth-child(even){background:rgba(248,250,252,0.5)!important}',
    
    /* Summary grid glass */
    '.summary-grid div{background:rgba(255,255,255,0.7)!important;backdrop-filter:blur(6px)!important;border:1px solid rgba(148,163,184,0.2)!important;border-radius:14px!important;font-weight:700!important;box-shadow:0 2px 8px rgba(31,38,135,0.08)!important;transition:all 0.3s ease!important}',
    '.summary-grid div:hover{background:rgba(255,255,255,0.9)!important;transform:translateY(-2px)!important;box-shadow:0 4px 12px rgba(31,38,135,0.12)!important}',
    '.summary-grid span{color:var(--ink)!important;text-shadow:0 1px 2px rgba(0,0,0,0.05)!important}',
    
    /* Settings submenu glass */
    '.settings-submenu{border-bottom:2px solid rgba(148,163,184,0.2)!important;background:rgba(255,255,255,0.5)!important;backdrop-filter:blur(6px)!important;border-radius:12px 12px 0 0!important;padding:4px!important}',
    '.settings-submenu button{color:var(--muted)!important;font-weight:700!important;transition:all 0.3s ease!important;border-radius:8px!important;margin:2px!important}',
    '.settings-submenu button:hover{color:var(--ink)!important;background:rgba(99,102,241,0.08)!important}',
    '.settings-submenu button.active{color:var(--accent)!important;border-bottom:none!important;background:rgba(99,102,241,0.12)!important;box-shadow:inset 0 -2px 4px rgba(99,102,241,0.15)!important}',
    
    /* Badges glass */
    '.customer-type-badge{border-radius:999px!important;font-weight:800!important;box-shadow:0 2px 8px rgba(0,0,0,0.1)!important;backdrop-filter:blur(4px)!important}',
    '.type-stockist{background:rgba(16,185,129,0.15)!important;color:#047857!important;border:2px solid rgba(16,185,129,0.4)!important;backdrop-filter:blur(4px)!important}',
    '.type-distributor{background:rgba(251,146,60,0.15)!important;color:#c2410c!important;border:2px solid rgba(251,146,60,0.4)!important;backdrop-filter:blur(4px)!important}',
    '.type-customer{background:rgba(59,130,246,0.15)!important;color:#1d4ed8!important;border:2px solid rgba(59,130,246,0.4)!important;backdrop-filter:blur(4px)!important}',
    '.bill-number-badge{background:linear-gradient(135deg,#6366f1,#8b5cf6)!important;border-radius:10px!important;box-shadow:0 2px 8px rgba(99,102,241,0.3)!important;border:1px solid rgba(255,255,255,0.3)!important}',
    '.bp-pending{background:rgba(251,191,36,0.2)!important;color:#92400e!important;border:1.5px solid rgba(251,191,36,0.5)!important;backdrop-filter:blur(4px)!important}',
    '.bp-done{background:rgba(34,197,94,0.2)!important;color:#166534!important;border:1.5px solid rgba(34,197,94,0.5)!important;backdrop-filter:blur(4px)!important}',
    '.stockist-id-badge{background:linear-gradient(135deg,#059669,#047857)!important;box-shadow:0 2px 6px rgba(5,150,105,0.3)!important;border:1px solid rgba(255,255,255,0.3)!important}',
    '.phone-badge{background:rgba(14,165,233,0.15)!important;color:#075985!important;border:1.5px solid rgba(14,165,233,0.3)!important;backdrop-filter:blur(4px)!important}',
    '.qty-badge{background:linear-gradient(135deg,#8b5cf6,#7c3aed)!important;box-shadow:0 2px 6px rgba(139,92,246,0.3)!important;border:1px solid rgba(255,255,255,0.3)!important}',
    '.manual-badge{background:linear-gradient(135deg,#f59e0b,#d97706)!important;box-shadow:0 2px 6px rgba(245,158,11,0.3)!important;border:1px solid rgba(255,255,255,0.3)!important}',
    
    /* Modals glass */
    '.modal-content{background:rgba(255,255,255,0.95)!important;backdrop-filter:blur(16px)!important;-webkit-backdrop-filter:blur(16px)!important;border:1px solid rgba(255,255,255,0.4)!important;border-radius:20px!important;box-shadow:0 24px 64px rgba(31,38,135,0.25),0 8px 24px rgba(0,0,0,0.15)!important}',
    '.modal{background:rgba(15,23,42,0.6)!important;backdrop-filter:blur(8px)!important}',
    
    /* Info boxes glass */
    '.backup-info{background:rgba(14,165,233,0.1)!important;border:1.5px solid rgba(14,165,233,0.3)!important;border-radius:14px!important;backdrop-filter:blur(6px)!important}',
    '.manual-prod-item{background:rgba(251,191,36,0.1)!important;border:1.5px solid rgba(251,191,36,0.3)!important;backdrop-filter:blur(6px)!important}',
    '.update-mobile-wrap{background:rgba(251,191,36,0.1)!important;border:1.5px dashed rgba(245,158,11,0.5)!important;border-radius:14px!important;backdrop-filter:blur(6px)!important}',
    '.price-selection{background:rgba(248,250,252,0.7)!important;border:1.5px solid rgba(148,163,184,0.2)!important;border-radius:14px!important;backdrop-filter:blur(6px)!important}',
    '.add-product-section{background:rgba(14,165,233,0.1)!important;border:1.5px solid rgba(14,165,233,0.3)!important;border-radius:14px!important;backdrop-filter:blur(6px)!important}',
    
    /* Dropdowns glass */
    '.search-dropdown .dropdown-list{background:rgba(255,255,255,0.98)!important;backdrop-filter:blur(12px)!important;border:1.5px solid rgba(148,163,184,0.2)!important;border-radius:0 0 14px 14px!important;box-shadow:0 12px 32px rgba(31,38,135,0.15)!important}',
    '.search-dropdown .dropdown-item{transition:all 0.2s ease!important;border-radius:8px!important;margin:4px!important}',
    '.search-dropdown .dropdown-item:hover{background:rgba(99,102,241,0.08)!important;transform:translateX(4px)!important}',
    
    /* View bill glass */
    '.view-bill-header{background:linear-gradient(135deg,rgba(15,23,42,0.9),rgba(30,41,59,0.9))!important;backdrop-filter:blur(12px)!important;border-radius:16px!important;border:1px solid rgba(255,255,255,0.1)!important;box-shadow:0 8px 24px rgba(0,0,0,0.2)!important}',
    '.view-bill-total{background:rgba(34,197,94,0.1)!important;border:1.5px solid rgba(34,197,94,0.3)!important;border-radius:14px!important;backdrop-filter:blur(8px)!important}',
    
    /* Customer items glass */
    '.bill-item,.cust-item,.cust-item-req,.mgmt-cust-item{background:rgba(255,255,255,0.9)!important;backdrop-filter:blur(6px)!important;border:1.5px solid rgba(148,163,184,0.2)!important;border-radius:14px!important;box-shadow:0 2px 8px rgba(31,38,135,0.08)!important;transition:all 0.3s ease!important}',
    '.bill-item:hover,.cust-item:hover,.cust-item-req:hover,.mgmt-cust-item:hover{background:rgba(255,255,255,1)!important;transform:translateY(-2px)!important;box-shadow:0 6px 16px rgba(31,38,135,0.12)!important}',
    
    /* Month cards glass */
    '.month-card{background:rgba(99,102,241,0.1)!important;border:1.5px solid rgba(99,102,241,0.3)!important;backdrop-filter:blur(6px)!important;transition:all 0.3s ease!important}',
    '.month-card:hover{background:rgba(99,102,241,0.15)!important;transform:translateY(-2px)!important;box-shadow:0 4px 12px rgba(99,102,241,0.2)!important}',
    '.month-card .m-val{color:#4338ca!important;text-shadow:0 1px 2px rgba(0,0,0,0.05)!important}',
    
    /* Login overlay glass */
    '#login-overlay{background:linear-gradient(135deg,rgba(15,23,42,0.95),rgba(30,41,59,0.9))!important;backdrop-filter:blur(12px)!important}',
    
    /* Scrollbar glass */
    '::-webkit-scrollbar{width:10px;height:10px}',
    '::-webkit-scrollbar-track{background:rgba(255,255,255,0.1);border-radius:10px}',
    '::-webkit-scrollbar-thumb{background:rgba(99,102,241,0.3);border-radius:10px;border:2px solid transparent;background-clip:padding-box}',
    '::-webkit-scrollbar-thumb:hover{background:rgba(99,102,241,0.5);background-clip:padding-box}'
  ].join('');
  document.head.appendChild(st);
})();

/* ==== V15: SOLID header + menu (readable while scrolling) + tables restored ==== */
(function(){
  ['ska-pro-css','ska-glass-css'].forEach(function(id){ var e=document.getElementById(id); if(e) e.remove(); });
  var st = document.createElement('style');
  st.id = 'ska-glass-css';
  st.textContent = [
    /* Background */
    'body{background:linear-gradient(160deg,#eef1fb 0%,#e8ecf9 40%,#f3eefb 100%)!important;background-attachment:fixed!important;color:#0f172a!important}',
    /* HEADER: solid dark navy (own colour, opaque while scrolling) */
    '.header{background:linear-gradient(135deg,#0b1220 0%,#16213e 55%,#1f2b4a 100%)!important;padding:16px 15px!important;box-shadow:0 4px 16px rgba(2,6,23,.35)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}',
    '.header .subtitle{color:#9fb3d1!important;letter-spacing:2.2px!important;font-weight:600!important}',
    /* MENU/TABS: solid white bar (different colour from header) */
    '.tabs{background:#ffffff!important;border-bottom:1px solid #e5eaf1!important;box-shadow:0 2px 10px rgba(15,23,42,.08)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}',
    '.tab-btn{color:#7c8aa0!important;font-weight:700!important}',
    '.tab-btn.active{color:#4f46e5!important;border-bottom-color:#4f46e5!important;background:rgba(79,70,229,.07)!important}',
    /* Cards */
    '.card{background:#ffffff!important;border:1px solid #e8edf4!important;border-radius:16px!important;box-shadow:0 2px 6px rgba(15,23,42,.05),0 10px 28px rgba(15,23,42,.07)!important;padding:18px!important;margin-bottom:14px!important}',
    '.card h3{color:#0f172a!important;font-weight:800!important}',
    /* Inputs */
    'input[type="text"],input[type="tel"],input[type="number"],select{background:#f8fafc!important;border:1.5px solid #dbe3ee!important;border-radius:10px!important;font-weight:600!important;color:#0f172a!important}',
    'input:focus,select:focus{background:#fff!important;border-color:#4f46e5!important;box-shadow:0 0 0 3px rgba(79,70,229,.15)!important}',
    /* Buttons */
    '.btn{border-radius:12px!important;font-weight:800!important;box-shadow:0 3px 10px rgba(15,23,42,.12)!important;border:none!important}',
    '.btn-primary{background:linear-gradient(135deg,#4f46e5,#7c3aed)!important}',
    '.btn-danger{background:linear-gradient(135deg,#e11d48,#dc2626)!important}',
    '.btn-share{background:linear-gradient(135deg,#0284c7,#2563eb)!important}',
    '.btn-edit{background:linear-gradient(135deg,#f59e0b,#ea580c)!important}',
    '.btn-done{background:linear-gradient(135deg,#059669,#10b981)!important}',
    '.btn-back{background:linear-gradient(135deg,#94a3b8,#64748b)!important}',
    '.btn-export{background:linear-gradient(135deg,#0ea5e9,#0369a1)!important}',
    '.btn-import{background:linear-gradient(135deg,#8b5cf6,#6d28d9)!important}',
    '.btn-whatsapp{background:linear-gradient(135deg,#25D366,#128C7E)!important}',
    '.btn-sms{background:linear-gradient(135deg,#f59e0b,#ea580c)!important}',
    '.btn-pdf{background:linear-gradient(135deg,#dc2626,#991b1b)!important}',
    '.btn-debug{background:linear-gradient(135deg,#8b5cf6,#7c3aed)!important}',
    /* TABLES: restored — solid white + horizontal scroll works again */
    '.table-wrap{border:1px solid #e8edf4!important;border-radius:12px!important;overflow-x:auto!important;overflow-y:visible!important;backdrop-filter:none!important}',
    'table{background:#ffffff!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}',
    'th{background:#eef2ff!important;color:#3730a3!important;font-weight:800!important;letter-spacing:.4px!important}',
    'td{border-bottom:1px solid #eef2f8!important;color:#0f172a!important}',
    'tbody tr:nth-child(even){background:#f8fafc!important}',
    'tbody tr:hover{background:#eef2ff!important}',
    /* Summary */
    '.summary-grid div{background:#f6f8fc!important;border:1px solid #e8edf4!important;border-radius:12px!important;font-weight:700!important}',
    /* Settings menu */
    '.settings-submenu{border-bottom:2px solid #e8edf4!important}',
    '.settings-submenu button{color:#7c8aa0!important;font-weight:800!important}',
    '.settings-submenu button.active{color:#4f46e5!important;border-bottom-color:#4f46e5!important}',
    /* History / bill cards: LEFT ACCENT BORDERS RESTORED */
    '.bill-item,.cust-item{background:#fff!important;border:1px solid #e8edf4!important;border-left:4px solid #27ae60!important;border-radius:14px!important;box-shadow:0 2px 8px rgba(15,23,42,.06)!important}',
    '.bill-item.completed{border-left-color:#94a3b8!important;background:#f8fafc!important}',
    '.cust-item-req{background:#fff!important;border:1px solid #e8edf4!important;border-left:4px solid #f59e0b!important;border-radius:14px!important;box-shadow:0 2px 8px rgba(15,23,42,.06)!important}',
    '.mgmt-cust-item{background:#fff!important;border:1px solid #e8edf4!important;border-left:4px solid #3498db!important;border-radius:14px!important;box-shadow:0 2px 8px rgba(15,23,42,.06)!important}',
    /* Badges */
    '.customer-type-badge{border-radius:999px!important;font-weight:800!important}',
    '.type-stockist{background:#ecfdf5!important;color:#047857!important;border:1.5px solid #34d399!important}',
    '.type-distributor{background:#fff7ed!important;color:#c2410c!important;border:1.5px solid #fb923c!important}',
    '.type-customer{background:#eff6ff!important;color:#1d4ed8!important;border:1.5px solid #60a5fa!important}',
    '.bill-number-badge{background:linear-gradient(135deg,#4338ca,#4f46e5)!important;border-radius:8px!important}',
    '.bp-pending{background:#fef3c7!important;color:#92400e!important;border:1px solid #fcd34d!important}',
    '.bp-done{background:#dcfce7!important;color:#166534!important;border:1px solid #86efac!important}',
    '.stockist-id-badge{background:#065f46!important}',
    '.phone-badge{background:#e0f2fe!important;color:#075985!important;border:1px solid #7dd3fc!important}',
    '.qty-badge{background:#4f46e5!important}',
    '.manual-badge{background:#f59e0b!important}',
    /* Info boxes */
    '.backup-info{background:#f0f9ff!important;border:1px solid #bae6fd!important;border-radius:12px!important}',
    '.manual-prod-item{background:#fffbeb!important;border:1px solid #fde68a!important;border-left:4px solid #f59e0b!important}',
    '.update-mobile-wrap{background:#fffbeb!important;border:1.5px dashed #f59e0b!important;border-radius:12px!important}',
    '.price-selection{background:#f6f8fc!important;border:1.5px solid #e8edf4!important;border-radius:12px!important}',
    '.add-product-section{background:#e0f2fe!important;border:1.5px solid #7dd3fc!important;border-radius:12px!important}',
    /* Dropdowns */
    '.search-dropdown .dropdown-list{background:#fff!important;border:1.5px solid #dbe3ee!important;border-radius:0 0 12px 12px!important;box-shadow:0 12px 32px rgba(15,23,42,.14)!important}',
    '.search-dropdown .dropdown-item:hover{background:#eef2ff!important}',
    /* Modals (blur only on the overlay, not on scrolling parts) */
    '.modal{background:rgba(15,23,42,.55)!important;backdrop-filter:blur(6px)!important;-webkit-backdrop-filter:blur(6px)!important}',
    '.modal-content{background:#fff!important;border-radius:20px!important;box-shadow:0 24px 64px rgba(2,6,23,.3)!important}',
    '.view-bill-header{background:linear-gradient(135deg,#0b1220,#1e293b)!important;border-radius:14px!important}',
    '.view-bill-total{background:linear-gradient(135deg,#ecfdf5,#d1fae5)!important;border:1px solid #a7f3d0!important;border-radius:14px!important}',
    '.month-card{background:linear-gradient(135deg,#eef2ff,#e0e7ff)!important;border:1px solid #c7d2fe!important}',
    '.month-card .m-val{color:#3730a3!important}',
    /* Bill-list pagination buttons */
    '.blx-pag button{background:#4f46e5!important;color:#fff!important;border-radius:8px!important}',
    '.blx-pag button:disabled{background:#cbd5e1!important}',
    /* Login */
    '#login-overlay{background:linear-gradient(135deg,#0b1220,#16213e 50%,#1f2b4a)!important}',
    /* Scrollbar */
    '::-webkit-scrollbar{width:8px;height:8px}',
    '::-webkit-scrollbar-track{background:#eef2f7}',
    '::-webkit-scrollbar-thumb{background:#c7d2fe;border-radius:8px}',
    '::-webkit-scrollbar-thumb:hover{background:#a5b4fc}'
  ].join('');
  document.head.appendChild(st);
})();

/* ==== V15: FIXED HEADER VISIBILITY + BILL HISTORY DISPLAY ==== */
(function(){
  var old = document.getElementById('ska-glass-css');
  if (old) old.remove();
  
  var st = document.createElement('style');
  st.id = 'ska-glass-css';
  st.textContent = [
    /* Base variables */
    ':root{--glass-bg:rgba(255,255,255,0.08);--glass-border:rgba(255,255,255,0.18);--glass-shadow:0 8px 32px rgba(31,38,135,0.15);--glass-blur:12px;--accent:#6366f1;--accent2:#8b5cf6;--ink:#1e293b;--muted:#64748b}',
    
    /* Body & background */
    'body{background:linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%)!important;background-attachment:fixed!important;font-family:Inter,"SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif!important;color:var(--ink)!important;min-height:100vh!important}',
    
    /* Header - SOLID, HIGH CONTRAST (fixed visibility) */
    '.header{background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%)!important;border-bottom:3px solid #fbbf24!important;box-shadow:0 4px 20px rgba(0,0,0,0.3)!important;padding:20px 16px!important}',
    '.header h2{color:#fbbf24!important;font-weight:900!important;text-shadow:0 2px 8px rgba(0,0,0,0.5)!important;letter-spacing:1px!important;font-size:1.4rem!important}',
    '.header .subtitle{color:#e2e8f0!important;letter-spacing:3px!important;font-weight:700!important;text-shadow:0 1px 4px rgba(0,0,0,0.4)!important;font-size:0.85rem!important}',
    
    /* Tabs - DIFFERENT COLOR (white background, distinct from header) */
    '.tabs{background:#ffffff!important;border-bottom:3px solid #6366f1!important;box-shadow:0 4px 16px rgba(0,0,0,0.15)!important}',
    '.tab-btn{color:#64748b!important;font-weight:700!important;transition:all 0.3s ease!important;background:#fff!important}',
    '.tab-btn:hover{color:#6366f1!important;background:#f8fafc!important}',
    '.tab-btn.active{color:#6366f1!important;border-bottom:4px solid #6366f1!important;background:linear-gradient(180deg,#eef2ff 0%,#ffffff 100%)!important;box-shadow:inset 0 -2px 8px rgba(99,102,241,0.15)!important;font-weight:800!important}',
    '.tab-btn .tab-icon{font-size:1.4rem!important}',
    
    /* Cards glass */
    '.card{background:rgba(255,255,255,0.95)!important;backdrop-filter:blur(8px)!important;-webkit-backdrop-filter:blur(8px)!important;border:1px solid rgba(255,255,255,0.3)!important;border-radius:16px!important;box-shadow:0 8px 24px rgba(31,38,135,0.12),0 2px 8px rgba(0,0,0,0.06)!important;padding:20px!important;margin-bottom:16px!important;transition:transform 0.2s ease,box-shadow 0.2s ease!important}',
    '.card:hover{transform:translateY(-2px)!important;box-shadow:0 12px 32px rgba(31,38,135,0.18),0 4px 12px rgba(0,0,0,0.08)!important}',
    '.card h3{color:var(--ink)!important;font-weight:800!important;letter-spacing:-0.3px!important}',
    '.card h3 .icon{filter:drop-shadow(0 2px 4px rgba(0,0,0,0.1))!important}',
    
    /* Inputs glass */
    'input[type="text"],input[type="tel"],input[type="number"],select{background:rgba(255,255,255,0.7)!important;backdrop-filter:blur(4px)!important;border:1.5px solid rgba(148,163,184,0.3)!important;border-radius:12px!important;font-weight:600!important;color:var(--ink)!important;transition:all 0.3s ease!important}',
    'input[type="text"]:focus,input[type="tel"]:focus,input[type="number"]:focus,select:focus{background:rgba(255,255,255,0.95)!important;border-color:var(--accent)!important;box-shadow:0 0 0 4px rgba(99,102,241,0.15)!important;outline:none!important}',
    'input::placeholder{color:var(--muted)!important;font-weight:500!important}',
    
    /* Buttons glass */
    '.btn{border-radius:12px!important;font-weight:700!important;letter-spacing:0.3px!important;box-shadow:0 4px 12px rgba(31,38,135,0.15)!important;transition:all 0.3s ease!important;border:1px solid rgba(255,255,255,0.2)!important;backdrop-filter:blur(6px)!important}',
    '.btn:hover{transform:translateY(-2px)!important;box-shadow:0 6px 16px rgba(31,38,135,0.2)!important}',
    '.btn:active{transform:translateY(0)!important}',
    '.btn-primary{background:linear-gradient(135deg,#6366f1,#8b5cf6)!important;border-color:rgba(255,255,255,0.3)!important}',
    '.btn-danger{background:linear-gradient(135deg,#ef4444,#dc2626)!important;border-color:rgba(255,255,255,0.3)!important}',
    '.btn-share{background:linear-gradient(135deg,#0ea5e9,#0284c7)!important;border-color:rgba(255,255,255,0.3)!important}',
    '.btn-edit{background:linear-gradient(135deg,#f59e0b,#d97706)!important;border-color:rgba(255,255,255,0.3)!important}',
    '.btn-done{background:linear-gradient(135deg,#10b981,#059669)!important;border-color:rgba(255,255,255,0.3)!important}',
    '.btn-back{background:linear-gradient(135deg,#94a3b8,#64748b)!important;border-color:rgba(255,255,255,0.3)!important}',
    '.btn-export{background:linear-gradient(135deg,#06b6d4,#0891b2)!important;border-color:rgba(255,255,255,0.3)!important}',
    '.btn-import{background:linear-gradient(135deg,#a855f7,#9333ea)!important;border-color:rgba(255,255,255,0.3)!important}',
    '.btn-whatsapp{background:linear-gradient(135deg,#25D366,#128C7E)!important;border-color:rgba(255,255,255,0.3)!important}',
    '.btn-sms{background:linear-gradient(135deg,#f59e0b,#ea580c)!important;border-color:rgba(255,255,255,0.3)!important}',
    '.btn-pdf{background:linear-gradient(135deg,#dc2626,#991b1b)!important;border-color:rgba(255,255,255,0.3)!important}',
    '.btn-debug{background:linear-gradient(135deg,#8b5cf6,#7c3aed)!important;border-color:rgba(255,255,255,0.3)!important}',
    
    /* Tables glass */
    '.table-wrap{border:1px solid rgba(148,163,184,0.2)!important;border-radius:14px!important;overflow:hidden!important;box-shadow:inset 0 2px 8px rgba(0,0,0,0.04)!important}',
    'table{background:rgba(255,255,255,0.6)!important;backdrop-filter:blur(4px)!important}',
    'th{background:rgba(99,102,241,0.08)!important;color:var(--ink)!important;font-weight:800!important;letter-spacing:0.4px!important;text-transform:uppercase!important;font-size:0.75rem!important}',
    'td{border-bottom:1px solid rgba(148,163,184,0.15)!important;color:var(--ink)!important}',
    'tbody tr{transition:background 0.2s ease!important}',
    'tbody tr:hover{background:rgba(99,102,241,0.05)!important}',
    'tbody tr:nth-child(even){background:rgba(248,250,252,0.5)!important}',
    
    /* Summary grid glass */
    '.summary-grid div{background:rgba(255,255,255,0.7)!important;backdrop-filter:blur(6px)!important;border:1px solid rgba(148,163,184,0.2)!important;border-radius:14px!important;font-weight:700!important;box-shadow:0 2px 8px rgba(31,38,135,0.08)!important;transition:all 0.3s ease!important}',
    '.summary-grid div:hover{background:rgba(255,255,255,0.9)!important;transform:translateY(-2px)!important;box-shadow:0 4px 12px rgba(31,38,135,0.12)!important}',
    '.summary-grid span{color:var(--ink)!important;text-shadow:0 1px 2px rgba(0,0,0,0.05)!important}',
    
    /* Settings submenu glass */
    '.settings-submenu{border-bottom:2px solid rgba(148,163,184,0.2)!important;background:rgba(255,255,255,0.5)!important;backdrop-filter:blur(6px)!important;border-radius:12px 12px 0 0!important;padding:4px!important}',
    '.settings-submenu button{color:var(--muted)!important;font-weight:700!important;transition:all 0.3s ease!important;border-radius:8px!important;margin:2px!important}',
    '.settings-submenu button:hover{color:var(--ink)!important;background:rgba(99,102,241,0.08)!important}',
    '.settings-submenu button.active{color:var(--accent)!important;border-bottom:none!important;background:rgba(99,102,241,0.12)!important;box-shadow:inset 0 -2px 4px rgba(99,102,241,0.15)!important}',
    
    /* Badges glass */
    '.customer-type-badge{border-radius:999px!important;font-weight:800!important;box-shadow:0 2px 8px rgba(0,0,0,0.1)!important;backdrop-filter:blur(4px)!important}',
    '.type-stockist{background:rgba(16,185,129,0.15)!important;color:#047857!important;border:2px solid rgba(16,185,129,0.4)!important;backdrop-filter:blur(4px)!important}',
    '.type-distributor{background:rgba(251,146,60,0.15)!important;color:#c2410c!important;border:2px solid rgba(251,146,60,0.4)!important;backdrop-filter:blur(4px)!important}',
    '.type-customer{background:rgba(59,130,246,0.15)!important;color:#1d4ed8!important;border:2px solid rgba(59,130,246,0.4)!important;backdrop-filter:blur(4px)!important}',
    '.bill-number-badge{background:linear-gradient(135deg,#6366f1,#8b5cf6)!important;border-radius:10px!important;box-shadow:0 2px 8px rgba(99,102,241,0.3)!important;border:1px solid rgba(255,255,255,0.3)!important}',
    '.bp-pending{background:rgba(251,191,36,0.2)!important;color:#92400e!important;border:1.5px solid rgba(251,191,36,0.5)!important;backdrop-filter:blur(4px)!important}',
    '.bp-done{background:rgba(34,197,94,0.2)!important;color:#166534!important;border:1.5px solid rgba(34,197,94,0.5)!important;backdrop-filter:blur(4px)!important}',
    '.stockist-id-badge{background:linear-gradient(135deg,#059669,#047857)!important;box-shadow:0 2px 6px rgba(5,150,105,0.3)!important;border:1px solid rgba(255,255,255,0.3)!important}',
    '.phone-badge{background:rgba(14,165,233,0.15)!important;color:#075985!important;border:1.5px solid rgba(14,165,233,0.3)!important;backdrop-filter:blur(4px)!important}',
    '.qty-badge{background:linear-gradient(135deg,#8b5cf6,#7c3aed)!important;box-shadow:0 2px 6px rgba(139,92,246,0.3)!important;border:1px solid rgba(255,255,255,0.3)!important}',
    '.manual-badge{background:linear-gradient(135deg,#f59e0b,#d97706)!important;box-shadow:0 2px 6px rgba(245,158,11,0.3)!important;border:1px solid rgba(255,255,255,0.3)!important}',
    
    /* Modals glass */
    '.modal-content{background:rgba(255,255,255,0.95)!important;backdrop-filter:blur(16px)!important;-webkit-backdrop-filter:blur(16px)!important;border:1px solid rgba(255,255,255,0.4)!important;border-radius:20px!important;box-shadow:0 24px 64px rgba(31,38,135,0.25),0 8px 24px rgba(0,0,0,0.15)!important}',
    '.modal{background:rgba(15,23,42,0.6)!important;backdrop-filter:blur(8px)!important}',
    
    /* Info boxes glass */
    '.backup-info{background:rgba(14,165,233,0.1)!important;border:1.5px solid rgba(14,165,233,0.3)!important;border-radius:14px!important;backdrop-filter:blur(6px)!important}',
    '.manual-prod-item{background:rgba(251,191,36,0.1)!important;border:1.5px solid rgba(251,191,36,0.3)!important;backdrop-filter:blur(6px)!important}',
    '.update-mobile-wrap{background:rgba(251,191,36,0.1)!important;border:1.5px dashed rgba(245,158,11,0.5)!important;border-radius:14px!important;backdrop-filter:blur(6px)!important}',
    '.price-selection{background:rgba(248,250,252,0.7)!important;border:1.5px solid rgba(148,163,184,0.2)!important;border-radius:14px!important;backdrop-filter:blur(6px)!important}',
    '.add-product-section{background:rgba(14,165,233,0.1)!important;border:1.5px solid rgba(14,165,233,0.3)!important;border-radius:14px!important;backdrop-filter:blur(6px)!important}',
    
    /* Dropdowns glass */
    '.search-dropdown .dropdown-list{background:rgba(255,255,255,0.98)!important;backdrop-filter:blur(12px)!important;border:1.5px solid rgba(148,163,184,0.2)!important;border-radius:0 0 14px 14px!important;box-shadow:0 12px 32px rgba(31,38,135,0.15)!important}',
    '.search-dropdown .dropdown-item{transition:all 0.2s ease!important;border-radius:8px!important;margin:4px!important}',
    '.search-dropdown .dropdown-item:hover{background:rgba(99,102,241,0.08)!important;transform:translateX(4px)!important}',
    
    /* View bill glass */
    '.view-bill-header{background:linear-gradient(135deg,rgba(15,23,42,0.9),rgba(30,41,59,0.9))!important;backdrop-filter:blur(12px)!important;border-radius:16px!important;border:1px solid rgba(255,255,255,0.1)!important;box-shadow:0 8px 24px rgba(0,0,0,0.2)!important}',
    '.view-bill-total{background:rgba(34,197,94,0.1)!important;border:1.5px solid rgba(34,197,94,0.3)!important;border-radius:14px!important;backdrop-filter:blur(8px)!important}',
    
    /* BILL HISTORY - FIXED (no backdrop-blur, solid background for readability) */
    '.bill-item,.cust-item,.cust-item-req,.mgmt-cust-item{background:#ffffff!important;border:2px solid rgba(148,163,184,0.2)!important;border-radius:14px!important;box-shadow:0 2px 8px rgba(31,38,135,0.08)!important;transition:all 0.3s ease!important;padding:14px!important;margin-bottom:10px!important}',
    '.bill-item:hover,.cust-item:hover,.cust-item-req:hover,.mgmt-cust-item:hover{background:#f8fafc!important;transform:translateY(-2px)!important;box-shadow:0 6px 16px rgba(31,38,135,0.12)!important;border-color:rgba(99,102,241,0.4)!important}',
    '.bill-item strong,.cust-item strong,.cust-item-req strong,.mgmt-cust-item strong{color:var(--ink)!important;font-weight:800!important}',
    '.bill-item small,.cust-item small,.cust-item-req small,.mgmt-cust-item small{color:var(--muted)!important}',
    '.bill-item div,.cust-item div,.cust-item-req div,.mgmt-cust-item div{color:var(--ink)!important}',
    
    /* Month cards glass */
    '.month-card{background:rgba(99,102,241,0.1)!important;border:1.5px solid rgba(99,102,241,0.3)!important;backdrop-filter:blur(6px)!important;transition:all 0.3s ease!important}',
    '.month-card:hover{background:rgba(99,102,241,0.15)!important;transform:translateY(-2px)!important;box-shadow:0 4px 12px rgba(99,102,241,0.2)!important}',
    '.month-card .m-val{color:#4338ca!important;text-shadow:0 1px 2px rgba(0,0,0,0.05)!important}',
    
    /* Login overlay glass */
    '#login-overlay{background:linear-gradient(135deg,rgba(15,23,42,0.95),rgba(30,41,59,0.9))!important;backdrop-filter:blur(12px)!important}',
    
    /* Scrollbar glass */
    '::-webkit-scrollbar{width:10px;height:10px}',
    '::-webkit-scrollbar-track{background:rgba(255,255,255,0.1);border-radius:10px}',
    '::-webkit-scrollbar-thumb{background:rgba(99,102,241,0.3);border-radius:10px;border:2px solid transparent;background-clip:padding-box}',
    '::-webkit-scrollbar-thumb:hover{background:rgba(99,102,241,0.5);background-clip:padding-box}',
    
    /* Monthly filter - better visibility */
    '.monthly-filter{background:#ffffff!important;border:2px solid rgba(99,102,241,0.3)!important;font-weight:700!important;color:var(--ink)!important}',
    '.monthly-filter:focus{border-color:#6366f1!important;box-shadow:0 0 0 4px rgba(99,102,241,0.15)!important}',
    
    /* Bill actions - ensure buttons are visible */
    '.bill-actions{margin-top:10px!important}',
    '.bill-actions .btn-small{font-size:0.8rem!important;font-weight:700!important}'
  ].join('');
  document.head.appendChild(st);
})();

/* ==== V16: TABLE HORIZONTAL SCROLL — restore for ALL tables ==== */
(function(){
  var st = document.createElement('style');
  st.id = 'ska-table-fix';
  st.textContent = [
    /* Force ALL table wrappers to scroll horizontally */
    '.table-wrap{overflow-x:auto!important;overflow-y:visible!important;-webkit-overflow-scrolling:touch!important;max-width:100%!important}',
    
    /* Tables need min-width so they can scroll */
    'table{min-width:600px!important;width:100%!important;border-collapse:collapse!important}',
    
    /* Billing cart table */
    '#billing .table-wrap{overflow-x:auto!important}',
    '#billing table{min-width:700px!important}',
    
    /* History bill detail view table */
    '.view-bill-items{overflow-x:auto!important;-webkit-overflow-scrolling:touch!important}',
    '.view-bill-items table{min-width:600px!important;width:100%!important}',
    
    /* Requirement table */
    '#requirement .table-wrap{overflow-x:auto!important}',
    '#requirement table{min-width:400px!important}',
    
    /* Edit modal table */
    '#edit-items-list{overflow-x:auto!important}',
    '.edit-item-row{min-width:300px!important}',
    
    /* Ensure no parent is clipping the scroll */
    '.card{overflow:visible!important}',
    '.tab-content{overflow:visible!important}',
    
    /* Mobile touch scrolling */
    '*{-webkit-tap-highlight-color:transparent}',
    '.table-wrap::-webkit-scrollbar{height:8px}',
    '.table-wrap::-webkit-scrollbar-track{background:#f1f5f9;border-radius:4px}',
    '.table-wrap::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}',
    '.table-wrap::-webkit-scrollbar-thumb:hover{background:#94a3b8}'
  ].join('');
  document.head.appendChild(st);
})();
