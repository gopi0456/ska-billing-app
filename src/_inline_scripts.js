
const DB={isCapacitor:window.Capacitor!==undefined,sqlite:null,conn:null,data:JSON.parse(localStorage.getItem('ska_db')||'{"customers":[],"products":[],"bills":[],"bill_items":[],"requirements":[],"manual_products":[]}'),async init(){if(this.isCapacitor&&window.CapacitorSQLite){try{this.sqlite=new window.CapacitorSQLite.SQLiteConnection(window.CapacitorSQLite);this.conn=await this.sqlite.createConnection("ska_db",false,"no-encryption",1,false);await this.conn.open();await this.conn.execute(`CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, mobile TEXT, customer_type TEXT)`);await this.conn.execute(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, item_name TEXT, mrp REAL, sp REAL, bp REAL)`);await this.conn.execute(`CREATE TABLE IF NOT EXISTS bills (id INTEGER PRIMARY KEY AUTOINCREMENT, bill_number TEXT, customer_id INTEGER, cust_name TEXT, cust_mobile TEXT, customer_type TEXT, date TEXT, total_mrp REAL, total_sp REAL, total_bp REAL, price_columns TEXT, bp_status TEXT, stockist_id TEXT, bp_done_date TEXT, bp_done_remarks TEXT)`);await this.conn.execute(`CREATE TABLE IF NOT EXISTS bill_items (id INTEGER PRIMARY KEY AUTOINCREMENT, bill_id INTEGER, item_name TEXT, mrp REAL, sp REAL, bp REAL, qty INTEGER, tot_mrp REAL, tot_sp REAL, tot_bp REAL)`);await this.conn.execute(`CREATE TABLE IF NOT EXISTS requirements (id INTEGER PRIMARY KEY AUTOINCREMENT, customer TEXT, mobile TEXT, customer_type TEXT, item_name TEXT, qty INTEGER, date TEXT)`);await this.conn.execute(`CREATE TABLE IF NOT EXISTS manual_products (id INTEGER PRIMARY KEY AUTOINCREMENT, item_name TEXT, mrp REAL, sp REAL, bp REAL)`);try{await this.conn.execute(`ALTER TABLE requirements ADD COLUMN customer_type TEXT`)}catch(e){}try{await this.conn.execute(`ALTER TABLE customers ADD COLUMN customer_type TEXT`)}catch(e){}try{await this.conn.execute(`ALTER TABLE bills ADD COLUMN bill_number TEXT`)}catch(e){}try{await this.conn.execute(`ALTER TABLE bills ADD COLUMN bp_status TEXT`)}catch(e){}try{await this.conn.execute(`ALTER TABLE bills ADD COLUMN stockist_id TEXT`)}catch(e){}try{await this.conn.execute(`ALTER TABLE bills ADD COLUMN bp_done_date TEXT`)}catch(e){}try{await this.conn.execute(`ALTER TABLE bills ADD COLUMN bp_done_remarks TEXT`)}catch(e){}try{const eb=await this.conn.query(`SELECT id FROM bills WHERE bill_number IS NULL OR bill_number = ''`);if(eb.values&&eb.values.length>0){for(let i=0;i<eb.values.length;i++){await this.conn.execute(`UPDATE bills SET bill_number = ?, bp_status = COALESCE(bp_status, 'pending') WHERE id = ?`,['SKAA'+String(i+1).padStart(4,'0'),eb.values[i].id])}}await this.conn.execute(`UPDATE bills SET bp_status = 'pending' WHERE bp_status IS NULL OR bp_status = ''`)}catch(e){}}catch(err){this.isCapacitor=false}}else{if(this.data.bills){let c=1;this.data.bills.forEach(b=>{if(!b.bill_number)b.bill_number='SKAA'+String(c++).padStart(4,'0');if(!b.bp_status)b.bp_status='pending'});localStorage.setItem('ska_db',JSON.stringify(this.data))}}if(!this.data.manual_products){this.data.manual_products=[];localStorage.setItem('ska_db',JSON.stringify(this.data))}},async query(t){if(this.isCapacitor&&this.conn){const r=await this.conn.query(`SELECT * FROM ${t}`);return r.values||[]}return this.data[t]||[]},async run(t,item){if(this.isCapacitor&&this.conn){const c=Object.keys(item),v=Object.values(item);if(item.id){try{const check=await this.conn.query(`SELECT id FROM ${t} WHERE id=?`,[item.id]);if(check.values&&check.values.length>0)return item.id}catch(e){}}const r=await this.conn.execute(`INSERT INTO ${t} (${c.join(',')}) VALUES (${c.map(()=>'?').join(',')})`,v);return r.changes.lastId}if(!item.id) if(item.id && this.data[t].find(x => x.id == item.id)) return item.id; if(!item.id) item.id=Date.now()+Math.random();this.data[t].push(item);localStorage.setItem('ska_db',JSON.stringify(this.data));return item.id},async clear(t){if(this.isCapacitor&&this.conn)await this.conn.execute(`DELETE FROM ${t}`);else{this.data[t]=[];localStorage.setItem('ska_db',JSON.stringify(this.data))}},async update(t,id,u){if(this.isCapacitor&&this.conn){const s=Object.keys(u).map(k=>`${k}=?`).join(',');await this.conn.execute(`UPDATE ${t} SET ${s} WHERE id=?`,[...Object.values(u),id])}else{const i=this.data[t].find(i=>i.id==id);if(i)Object.assign(i,u);localStorage.setItem('ska_db',JSON.stringify(this.data))}},async delete(t,id){if(this.isCapacitor&&this.conn)await this.conn.execute(`DELETE FROM ${t} WHERE id=?`,[id]);else{this.data[t]=this.data[t].filter(r=>r.id.toString()!==id.toString());localStorage.setItem('ska_db',JSON.stringify(this.data))}}};

async function generateBillNumber(){const bills=await DB.query('bills');let m=0;bills.forEach(b=>{if(b.bill_number&&b.bill_number.startsWith('SKAA')){const n=parseInt(b.bill_number.substring(4));if(!isNaN(n)&&n>m)m=n}});return 'SKAA'+String(m+1).padStart(4,'0')}
function getBillNum(b){return b.bill_number||('SKAA'+String(b.id).padStart(4,'0'))}
function cleanProductName(n,t){if(t==='stockist')return n;let c=n;c=c.replace(/\s*\(\s*(?:buy|get|offer|free|combo|pack|\d+\s*\+\s*\d+)[^)]*\)\s*/gi,' ');c=c.replace(/\s*(?:buy\s+\d+\s+get\s+\d+(?:\s+free)?|offer|combo\s+pack|value\s+pack|\d+\s*\+\s*\d+\s*(?:offer|free|pack)?|free\s+gift|special\s+offer)\s*/gi,' ');c=c.replace(/\s*-\s*(?:offer|combo|pack|free|buy\s+\d+|get\s+\d+)[^-]*$/gi,' ');c=c.replace(/\s*\|\s*(?:offer|combo|pack|free|buy|get)[^|]*$/gi,' ');c=c.replace(/\s*\[\s*(?:offer|combo|pack|free|buy|get)[^\]]*\]\s*/gi,' ');c=c.replace(/\s+/g,' ').trim();return c||n}

let dropdownCache={customers:[],products:[],stockists:[],lastUpdate:0};
let currentCustomerBills=[];

async function refreshDropdownCache(){const cs=await DB.query('customers'),pp=await DB.query('products'),mp=await DB.query('manual_products'),bills=await DB.query('bills'),merged=new Map();pp.forEach(p=>merged.set(p.item_name.toLowerCase(),{...p,source:'pdf'}));mp.forEach(p=>merged.set(p.item_name.toLowerCase(),{...p,source:'manual'}));const sm=new Map();bills.forEach(b=>{if(b.stockist_id&&b.customer_type==='stockist'&&!sm.has(b.stockist_id))sm.set(b.stockist_id,{id:b.stockist_id,customer:b.cust_name,mobile:b.cust_mobile})});dropdownCache={customers:cs.map(c=>({name:c.name,mobile:c.mobile||'',type:c.customer_type||'customer',detail:c.mobile?`${c.mobile} | ${(c.customer_type||'customer').toUpperCase()}`:(c.customer_type||'customer').toUpperCase()})),products:Array.from(merged.values()).map(p=>({name:p.item_name,detail:`MRP: ${p.mrp} | SP: ${p.sp} | BP: ${p.bp}`,source:p.source||'pdf'})),stockists:Array.from(sm.values()),lastUpdate:Date.now()}}

function getCustomerType(m,s,b){if(m&&s&&b)return'stockist';if(m&&b&&!s)return'distributor';return'customer'}





let billFromDD=false,reqFromDD=false,stockistFromDD=false;
const dropdownInitialized={};
function setupSearchDropdown(inputId,listId,dataKey,onSelect){if(dropdownInitialized[inputId])return;dropdownInitialized[inputId]=true;const input=document.getElementById(inputId),list=document.getElementById(listId);let dt;function rwd(){clearTimeout(dt);dt=setTimeout(()=>renderDD(),50)}input.addEventListener('focus',rwd);input.addEventListener('input',rwd);input.addEventListener('blur',()=>{setTimeout(()=>list.classList.remove('show'),200)});function renderDD(){let data;if(dataKey==='customers')data=dropdownCache.customers;else if(dataKey==='products')data=dropdownCache.products;else if(dataKey==='stockists')data=dropdownCache.stockists;else data=[];const f=input.value.toLowerCase(),filtered=data.filter(i=>{if(dataKey==='stockists')return i.id.toLowerCase().includes(f)||(i.customer&&i.customer.toLowerCase().includes(f));return i.name.toLowerCase().includes(f)||(i.detail&&i.detail.toLowerCase().includes(f))});if(dataKey==='customers'){list.innerHTML=filtered.length>0?filtered.slice(0,50).map(i=>`<div class="dropdown-item" onclick="${onSelect}('${i.name.replace(/'/g,"\\'")}','${(i.mobile||'').replace(/'/g,"\\'")}','${(i.type||'').replace(/'/g,"\\'")}','${(i.detail||'').replace(/'/g,"\\'")}','')"><div class="item-name">${i.name}${i.mobile?`<span class="item-mobile">📱 ${i.mobile}</span>`:''}<span class="customer-type-badge type-${i.type||'customer'}" style="font-size:0.6rem;padding:1px 6px;margin-left:4px;margin-bottom:0;">${(i.type||'customer').toUpperCase()}</span></div></div>`).join(''):'<div class="dropdown-item" style="color:#999;">No matches found</div>'}else if(dataKey==='stockists'){list.innerHTML=filtered.length>0?filtered.slice(0,30).map(i=>`<div class="dropdown-item" onclick="selectStockistId('${i.id.replace(/'/g,"\\'")}','${(i.customer||'').replace(/'/g,"\\'")}')"><div class="item-name">🏪 ${i.id}</div><div class="item-detail">${i.customer||'Unknown'} ${i.mobile?'| 📱 '+i.mobile:''}</div></div>`).join(''):'<div class="dropdown-item" style="color:#999;">No stockist IDs found. Type a new one.</div>'}else{list.innerHTML=filtered.length>0?filtered.slice(0,50).map(i=>`<div class="dropdown-item" onclick="${onSelect}('${i.name.replace(/'/g,"\\'")}','${(i.mobile||'').replace(/'/g,"\\'")}','${(i.type||'').replace(/'/g,"\\'")}','${(i.detail||'').replace(/'/g,"\\'")}','${(i.source||'').replace(/'/g,"\\'")}')"><div class="item-name">${i.name}${i.source==='manual'?'<span class="manual-badge">⭐ MANUAL</span>':''}</div>${i.detail?`<div class="item-detail">${i.detail}</div>`:''}</div>`).join(''):'<div class="dropdown-item" style="color:#999;">No matches found</div>'}list.classList.add('show')}}

function selectStockistId(id){document.getElementById('stockist-id').value=id;document.getElementById('stockist-id-list').classList.remove('show');stockistFromDD=true;setTimeout(()=>{stockistFromDD=false},100)}







function selectProduct(name){document.getElementById('prod-search').value='';document.getElementById('prod-list').classList.remove('show');const p=dropdownCache.products.find(x=>x.name===name);if(p){const mrp=parseFloat(p.detail.match(/MRP: ([\d.]+)/)[1])||0,sp=parseFloat(p.detail.match(/SP: ([\d.]+)/)[1])||0,bp=parseFloat(p.detail.match(/BP: ([\d.]+)/)[1])||0;const ex=cart.find(i=>i.item_name===p.name);if(ex)ex.qty+=1;else cart.push({item_name:p.name,mrp,sp,bp,qty:1});renderCart()}}

function handleUpdateMobileCheck(prefix,cb){const wrap=document.getElementById(`${prefix}-update-wrap`),mi=document.getElementById(`${prefix}-mobile`),ni=document.getElementById(prefix==='bill'?'cust-name':'req-cust');if(cb.checked){if(!ni.value.trim()){alert('⚠️ Enter customer name first.');cb.checked=false;return}if(confirm(`⚠️ UPDATE MOBILE\n\nUpdate for "${ni.value.trim()}"?`)){cb.checked=true;wrap.classList.add('active');mi.classList.add('update-mode');mi.focus();mi.select()}else{cb.checked=false;wrap.classList.remove('active');mi.classList.remove('update-mode')}}else{wrap.classList.remove('active');mi.classList.remove('update-mode')}}
function toggleUpdateMobile(p){const c=document.getElementById(`${p}-update-mobile`);c.checked=!c.checked;handleUpdateMobileCheck(p,c)}
function resetUpdateMobile(p){document.getElementById(`${p}-update-mobile`).checked=false;document.getElementById(`${p}-update-wrap`).classList.remove('active');document.getElementById(`${p}-mobile`).classList.remove('update-mode')}
function findCustomer(cs,n,m){const cm=(m||'').replace(/\D/g,'');let c=cs.find(x=>x.name===n&&(x.mobile||'').replace(/\D/g,'')===cm);if(c)return c;if(!cm){c=cs.find(x=>x.name===n&&!(x.mobile&&x.mobile.trim()));if(c)return c}return null}

document.querySelectorAll('.tab-btn').forEach(btn=>{btn.addEventListener('click',function(){const t=this.getAttribute('data-tab');document.querySelectorAll('.tab-content').forEach(e=>e.classList.remove('active'));document.querySelectorAll('.tab-btn').forEach(e=>e.classList.remove('active'));document.getElementById(t).classList.add('active');this.classList.add('active');requestAnimationFrame(()=>{if(t==='history'){goBackToCustomers();loadHistoryCustomers()}else if(t==='requirement'){goBackToReqCustomers();loadRequirementCustomers()}else if(t==='settings')loadManualProducts()})})});

async function setupAutoClear(inputId,mobileId,flag){let dt;document.getElementById(inputId).addEventListener('input',function(){clearTimeout(dt);dt=setTimeout(async()=>{const typed=this.value.trim().toLowerCase(),tm=document.getElementById(mobileId).value.trim();if(flag==='bill'){if(!billFromDD){const m=dropdownCache.customers.find(c=>c.name.toLowerCase()===typed&&(c.mobile||'').replace(/\D/g,'')===tm.replace(/\D/g,''));if(m){document.getElementById(mobileId).value=m.mobile||'';if(m.type){if(m.type==='stockist'){document.getElementById('show-mrp').checked=true;document.getElementById('show-sp').checked=true;document.getElementById('show-bp').checked=true}else if(m.type==='distributor'){document.getElementById('show-mrp').checked=true;document.getElementById('show-sp').checked=false;document.getElementById('show-bp').checked=true}else{document.getElementById('show-mrp').checked=true;document.getElementById('show-sp').checked=false;document.getElementById('show-bp').checked=false}updatePriceDisplay()}const si=document.getElementById('stockist-id');
const currentType=getCustomerType(document.getElementById('show-mrp').checked,document.getElementById('show-sp').checked,document.getElementById('show-bp').checked);
if(currentType==='stockist'){
si.disabled=false;
si.placeholder='🏪 Stockist ID';
const fetchedId=await autoFetchStockistId(m.name,m.mobile);
if(fetchedId){si.value=fetchedId}else{si.value=''}
}else{
si.disabled=true;
si.value='';
si.placeholder='🏪 Stockist ID (Disabled)'
}}else{document.getElementById(mobileId).value='';document.getElementById('show-mrp').checked=true;document.getElementById('show-sp').checked=true;document.getElementById('show-bp').checked=true;document.getElementById('stockist-id').value='';updatePriceDisplay()}}setTimeout(()=>{billFromDD=false},100)}else{if(!reqFromDD){const m=dropdownCache.customers.find(c=>c.name.toLowerCase()===typed&&(c.mobile||'').replace(/\D/g,'')===tm.replace(/\D/g,''));if(m){document.getElementById(mobileId).value=m.mobile||'';if(m.type)document.getElementById('req-customer-type').value=m.type;else findCustTypeReq(m.name,m.mobile)}else{document.getElementById(mobileId).value='';document.getElementById('req-customer-type').value='customer'}}setTimeout(()=>{reqFromDD=false},100)}},150)})}












let editingBillId=null,editingItems=[];

















let csb=null,csbi=null,csbill=null;









document.addEventListener('click',function(e){if(e.target===document.getElementById('share-modal'))closeShareModal();if(e.target===document.getElementById('edit-modal'))closeEditModal();if(e.target===document.getElementById('view-bill-modal'))closeViewBillModal();if(e.target===document.getElementById('cust-edit-modal'))closeCustEditModal();if(e.target===document.getElementById('add-cust-modal'))closeAddCustomerModal()});
async function loadDatalists(){await refreshDropdownCache();setupSearchDropdown('cust-name','cust-list','customers','selectCustomer');setupSearchDropdown('req-cust','cust-list-req','customers','selectReqCustomer');setupSearchDropdown('prod-search','prod-list','products','selectProduct');setupSearchDropdown('req-prod','prod-list-req','products','selectReqProduct');setupSearchDropdown('stockist-id','stockist-id-list','stockists','selectStockistId')}

let cart=[];
function renderCart(){const m=document.getElementById('show-mrp').checked,s=document.getElementById('show-sp').checked,b=document.getElementById('show-bp').checked;document.getElementById('cart-body').innerHTML=cart.map((i,x)=>{let r=`<tr><td>${i.item_name}${i.qty>1?`<span class="qty-badge">x${i.qty}</span>`:''}</td>`;if(m)r+=`<td>${i.mrp.toFixed(2)}</td>`;if(s)r+=`<td>${i.sp.toFixed(2)}</td>`;if(b)r+=`<td>${i.bp.toFixed(2)}</td>`;r+=`<td><input type="number" value="${i.qty}" min="1" onchange="cart[${x}].qty=parseInt(this.value)||1;renderCart()" style="width:50px"></td>`;if(m)r+=`<td>${(i.mrp*i.qty).toFixed(2)}</td>`;if(s)r+=`<td>${(i.sp*i.qty).toFixed(2)}</td>`;if(b)r+=`<td>${(i.bp*i.qty).toFixed(2)}</td>`;r+=`<td><button class="btn btn-danger" style="width:auto;padding:5px" onclick="cart.splice(${x},1);renderCart()">✕</button></td></tr>`;return r}).join('');let tm=0,ts=0,tb=0;cart.forEach(i=>{tm+=i.mrp*i.qty;ts+=i.sp*i.qty;tb+=i.bp*i.qty});const sg=document.getElementById('summary-grid');sg.innerHTML='';if(m)sg.innerHTML+=`<div class="col-mrp">💲 Total MRP<span>Rs. <span id="tot-mrp">${tm.toFixed(2)}</span></span></div>`;if(s)sg.innerHTML+=`<div class="col-sp">🏷️ Total SP<span>Rs. <span id="tot-sp">${ts.toFixed(2)}</span></span></div>`;if(b)sg.innerHTML+=`<div class="col-bp">💰 Total BP<span><span id="tot-bp">${tb.toFixed(2)}</span> BP</span></div>`}



let reqList=[];
function renderReq(){document.getElementById('req-body').innerHTML=reqList.map((i,x)=>`<tr><td>${i.item_name}${i.qty>1?`<span class="qty-badge">x${i.qty}</span>`:''}</td><td><input type="number" value="${i.qty}" min="1" onchange="reqList[${x}].qty=parseInt(this.value)||1" style="width:50px"></td><td><button class="btn btn-danger" style="width:auto;padding:5px" onclick="reqList.splice(${x},1);renderReq()">✕</button></td></tr>`).join('')}







async function setupBackButton(){if(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App){try{const App=window.Capacitor.Plugins.App;await App.addListener('backButton',()=>{if(document.getElementById('share-modal').style.display==='block'){closeShareModal();return}if(document.getElementById('edit-modal').style.display==='block'){closeEditModal();return}if(document.getElementById('view-bill-modal').style.display==='block'){closeViewBillModal();return}if(document.getElementById('customer-mgmt-view').style.display==='block'){hideCustomerManagement();return}if(document.getElementById('history-detail-view').style.display==='block'){goBackToCustomers();return}if(document.getElementById('req-detail-view').style.display==='block'){goBackToReqCustomers();return}if(confirm('⚠️ Exit SK Aayurveda app?'))App.exitApp()})}catch(e){console.error(e)}}}








let editingCustId=null;
















DB.init().then(async()=>{await refreshDropdownCache();loadDatalists();loadHistoryCustomers();loadRequirementCustomers();setupBackButton();setupAutoClear('cust-name','cust-mobile','bill');setupAutoClear('req-cust','req-mobile','req');loadManualProducts()});


/* ===== BLOCK SEPARATOR ===== */


(function() {
    // The Core Rules Logic
    function enforceRules(type) {
        const mrp = document.getElementById('show-mrp');
        const sp = document.getElementById('show-sp');
        const bp = document.getElementById('show-bp');
        const si = document.getElementById('stockist-id');
        const name = document.getElementById('cust-name').value.trim();
        const mobile = document.getElementById('cust-mobile').value.trim();

        // If type is unknown, read from the badge
        if (!type || type === 'undefined') {
            const badge = document.getElementById('customer-type-badge');
            type = badge ? badge.innerText.trim().toLowerCase() : 'customer';
        }

        // STRICT RULES
        if (type === 'stockist') {
            mrp.checked = true; sp.checked = true; bp.checked = true;
            si.disabled = false;
            // SILENT AUTO-FILL (Only for Stockists)
            if (name && typeof autoFetchStockistId === 'function' && si.value === '') {
                autoFetchStockistId(name, mobile).then(id => { 
                    if(id) { si.value = id; console.log('✅ Silent Auto-Fill: Stockist ID filled.'); }
                });
            }
        } else if (type === 'distributor') {
            mrp.checked = true; sp.checked = false; bp.checked = true;
            si.disabled = true; si.value = '';
        } else {
            // CUSTOMER or NEW/UNKNOWN
            mrp.checked = true; sp.checked = false; bp.checked = false;
            si.disabled = true; si.value = '';
        }

        if (typeof updatePriceDisplay === 'function') updatePriceDisplay();
    }

    window.addEventListener('load', () => {
        setTimeout(() => {
            // 1. Wrap selectCustomer (For Dropdown Clicks)
            if (typeof window.selectCustomer === 'function') {
                const origSelect = window.selectCustomer;
                window.selectCustomer = function(name, mobile, type) {
                    // Let the app do its job first (Name/Mobile fill, search)
                    origSelect(name, mobile, type);
                    // Apply our rules 150ms later
                    setTimeout(() => enforceRules(type), 150);
                };
                console.log('✅ Wrapped selectCustomer safely.');
            }

            // 2. Listen for Typing (Debounced)
            const nameInput = document.getElementById('cust-name');
            if (nameInput) {
                let timer;
                nameInput.addEventListener('input', () => {
                    clearTimeout(timer);
                    timer = setTimeout(() => {
                        // Wait for app to update badge, then enforce rules
                        const badge = document.getElementById('customer-type-badge');
                        if (badge) enforceRules(badge.innerText.trim().toLowerCase());
                    }, 800);
                });
                console.log('✅ Added safe typing listener.');
            }
        }, 1000);
    });
})();


/* ===== BLOCK SEPARATOR ===== */


// Toggle Stockist ID field visibility
function toggleStockistField(type) {
    const group = document.getElementById('new-stockist-id-group');
    if (group) {
        group.style.display = (type === 'stockist') ? 'block' : 'none';
        if (type !== 'stockist') {
            const input = document.getElementById('new-cust-stockist-id');
            if (input) input.value = '';
        }
    }
}

// Wait for app to load, then wrap the DB save function to capture Stockist ID
window.addEventListener('load', () => {
    setTimeout(() => {
        if (typeof DB !== 'undefined' && DB.run) {
            const origRun = DB.run;
            DB.run = function(table, data) {
                // If saving a customer, attach the Stockist ID from our new field
                if (table === 'customers' && data) {
                    const sidInput = document.getElementById('new-cust-stockist-id');
                    if (sidInput && sidInput.value.trim() !== '') {
                        data.stockist_id = sidInput.value.trim();
                        console.log('✅ Attached Stockist ID to new customer:', data.stockist_id);
                    }
                }
                return origRun.call(this, table, data);
            };
            console.log('✅ Wrapped DB.run to save Stockist ID.');
        }
    }, 1000);
});
