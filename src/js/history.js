async function loadHistoryCustomers(){const s=document.getElementById('search-history').value.toLowerCase(),bills=await DB.query('bills'),cm={};bills.forEach(b=>{const name=(b.cust_name||'Unknown').toLowerCase(),mobile=(b.cust_mobile||'').replace(/\D/g,''),k=name+'_'+mobile;if(!cm[k])cm[k]={name:b.cust_name||'Unknown',mobile:b.cust_mobile||'',customer_type:b.customer_type||'customer',total_bp:0,bill_count:0,latestDate:b.date};cm[k].total_bp+=(b.total_bp||0);cm[k].bill_count++;if(new Date(b.date)>new Date(cm[k].latestDate)){cm[k].customer_type=b.customer_type||'customer';cm[k].latestDate=b.date;cm[k].mobile=b.cust_mobile||cm[k].mobile}});let ca=Object.values(cm);if(s)ca=ca.filter(c=>c.name.toLowerCase().includes(s)||(c.mobile||'').includes(s));ca.sort((a,b)=>a.name.localeCompare(b.name));document.getElementById('customer-list').innerHTML=ca.map(c=>{const tc=`type-${c.customer_type||'customer'}`,tl=(c.customer_type||'customer').toUpperCase();return`<div class="cust-item" onclick="showCustomerHistory('${c.name.replace(/'/g,"\\'")}','${(c.mobile||'').replace(/'/g,"\\'")}')"><strong>${c.name}</strong><span class="phone-badge">📱 ${c.mobile||'No Mobile'}</span><span class="customer-type-badge ${tc}" style="font-size:0.65rem;padding:2px 8px;margin-left:5px;">${tl}</span><div style="color:#666;font-size:0.82rem;margin-top:4px;">📋 ${c.bill_count} Bill(s) | Tap to view</div></div>`}).join('')||'<p style="text-align:center;color:#888;padding:20px;">No customers found.</p>'}

function updateMonthlySummary(){
const filter=document.getElementById('monthly-filter')?document.getElementById('monthly-filter').value:'all';
const now=new Date();
let filtered=currentCustomerBills;
if(filter==='current'){
const y=now.getFullYear(),m=now.getMonth();
filtered=currentCustomerBills.filter(b=>{const d=new Date(b.date);return d.getFullYear()===y&&d.getMonth()===m})
}else if(filter==='previous'){
const d=new Date(now.getFullYear(),now.getMonth()-1,1);
const y=d.getFullYear(),m=d.getMonth();
filtered=currentCustomerBills.filter(b=>{const bd=new Date(b.date);return bd.getFullYear()===y&&bd.getMonth()===m})
}else if(filter==='last3'){
const cutoff=new Date(now.getFullYear(),now.getMonth()-2,1);
filtered=currentCustomerBills.filter(b=>new Date(b.date)>=cutoff)
}else if(filter==='last6'){
const cutoff=new Date(now.getFullYear(),now.getMonth()-5,1);
filtered=currentCustomerBills.filter(b=>new Date(b.date)>=cutoff)
}else if(filter==='lastyear'){
const y=now.getFullYear()-1;
filtered=currentCustomerBills.filter(b=>new Date(b.date).getFullYear()===y)
}else if(filter==='thisyear'){
const y=now.getFullYear();
filtered=currentCustomerBills.filter(b=>new Date(b.date).getFullYear()===y)
}
const leftTotal=filtered.reduce((sum,b)=>sum+(b.total_bp||0),0);
document.getElementById('left-box-value').textContent=leftTotal.toFixed(2);
const labels={'current':'Current Month','previous':'Previous Month','last3':'Last 3 Months','last6':'Last 6 Months','lastyear':'Last Year','thisyear':'This Year','all':'All Time'};
document.getElementById('left-box-label').textContent=labels[filter]||'Selected Period';
const thisMonthBills=currentCustomerBills.filter(b=>{const d=new Date(b.date);return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()});
const rightTotal=thisMonthBills.reduce((sum,b)=>sum+(b.total_bp||0),0);
document.getElementById('right-box-value').textContent=rightTotal.toFixed(2);
const mt={};
filtered.forEach(b=>{const d=new Date(b.date),mk=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;if(!mt[mk])mt[mk]=0;mt[mk]+=(b.total_bp||0)});
const mn=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
document.getElementById('monthly-summary').innerHTML=Object.keys(mt).sort().reverse().map(k=>{const[y,m]=k.split('-');return`<div class="month-card"><div class="m-label">${mn[parseInt(m)-1]} ${y}</div><div class="m-val">${mt[k].toFixed(2)} BP</div></div>`}).join('')||'<p style="text-align:center;color:#888;padding:10px;">No data for selected period</p>'
}

async function showCustomerHistory(name,mobile){document.getElementById('history-main-view').style.display='none';document.getElementById('history-detail-view').style.display='block';document.getElementById('detail-cust-name').innerHTML=`${name} <span class="phone-badge">📱 ${mobile||'No Mobile'}</span>`;const cm=(mobile||'').replace(/\D/g,'');let bills;try{bills=(await DB.query('bills')).filter(b=>(b.cust_name||'').toLowerCase()===name.toLowerCase()&&(b.cust_mobile||'').replace(/\D/g,'')===cm).sort((a,b)=>new Date(b.date)-new Date(a.date))}catch(e){console.error('Error loading bills:',e);bills=[]}
currentCustomerBills=bills;
if(document.getElementById('monthly-filter'))document.getElementById('monthly-filter').value='all';
updateMonthlySummary();
let billHtml='';if(bills.length===0){billHtml='<p style="text-align:center;color:#888;padding:20px;">No bills found.</p>'}else{billHtml=bills.map(b=>{const tc=`type-${b.customer_type||'customer'}`,tl=(b.customer_type||'customer').toUpperCase();const bpStatus=String(b.bp_status||'pending').toLowerCase();const billNum=getBillNum(b);const isDone=(bpStatus==='done'||bpStatus==='completed');const cls=isDone?'bill-item completed':'bill-item';const sid=b.stockist_id||'';const doneDate=b.bp_done_date||'';const remarks=b.bp_done_remarks||'';const bpColor=isDone?'#95a5a6':'#27ae60';let bpHtml='';if(isDone){bpHtml=`<span class="bp-status-badge bp-done">✅ BP DONE</span>`;if(doneDate)bpHtml+=`<div style="font-size:0.72rem;color:#155724;margin-top:2px;">📅 ${new Date(doneDate).toLocaleString()}</div>`;if(remarks)bpHtml+=`<div class="remarks-text">📝 ${remarks}</div>`}else{bpHtml=`<span class="bp-status-badge bp-pending">⏳ BP PENDING</span>`}let actionsHtml='';if(isDone){actionsHtml=`<button class="btn btn-edit btn-small btn-disabled" disabled><span class="btn-icon">✏️</span> Edit</button><button class="btn btn-danger btn-small btn-disabled" disabled><span class="btn-icon">🗑️</span> Delete</button>`}else{actionsHtml=`<button class="btn btn-edit btn-small" onclick="openEditModal(${b.id})"><span class="btn-icon">✏️</span> Edit</button><button class="btn btn-danger btn-small" onclick="deleteBill(${b.id},'${name.replace(/'/g,"\\'")}','${(mobile||'').replace(/'/g,"\\'")}')"><span class="btn-icon">🗑️</span> Delete</button><button class="btn btn-done btn-small" onclick="markBpDone(${b.id},'${name.replace(/'/g,"\\'")}','${(mobile||'').replace(/'/g,"\\'")}')"><span class="btn-icon">✅</span> BP Done</button>`}return`<div class="${cls}" style="cursor:default;"><div style="margin-bottom:6px;"><span class="bill-number-badge" onclick="viewBillDetails(${b.id})" title="Click to view">#${billNum}</span><span class="customer-type-badge ${tc}" style="font-size:0.65rem;padding:2px 8px;">${tl}</span>${(b.customer_type==='stockist'||sid)?`<span class="stockist-id-badge">🏪 ${sid||'NA'}</span>`:''}${bpHtml}</div><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;"><div><strong>📅 ${new Date(b.date).toLocaleDateString()}</strong><div style="color:#666;font-size:0.82rem;margin-top:4px;">💲 MRP: Rs. ${(b.total_mrp||0).toFixed(2)} | 💰 BP: ${(b.total_bp||0).toFixed(2)}</div></div><div style="font-weight:bold;color:${bpColor};font-size:1.1rem;">${(b.total_bp||0).toFixed(2)} BP</div></div><div class="bill-actions">${actionsHtml}<button class="btn btn-share btn-small" onclick="openShareModal(${b.id})"><span class="btn-icon">📤</span> Share</button></div></div>`}).join('')}document.getElementById('detail-bill-list').innerHTML=billHtml}

async function markBpDone(billId,custName,custMobile){if(!confirm('⚠️ Mark BP as DONE?\n\nThis will PERMANENTLY disable Edit and Delete for this bill.'))return;const remarks=prompt('📝 Enter remarks for BP Done:\n\n(e.g., "Payment received via UPI", "Cash settled")');if(remarks===null)return;const now=new Date().toISOString();try{await DB.update('bills',billId,{bp_status:'done',bp_done_date:now,bp_done_remarks:remarks||''});alert('✅ BP marked as DONE!\n\n📅 '+new Date(now).toLocaleString()+'\n📝 '+(remarks||'No remarks'));await refreshDropdownCache();await showCustomerHistory(custName,custMobile);await loadHistoryCustomers()}catch(err){alert('❌ Error: '+err.message)}}

function goBackToCustomers(){document.getElementById('history-main-view').style.display='block';document.getElementById('history-detail-view').style.display='none';if(document.getElementById('monthly-filter'))document.getElementById('monthly-filter').value='all'}

async function deleteBill(billId,custName,custMobile){if(!confirm('⚠️ DELETE BILL\n\nAre you sure?\n\nThis cannot be undone!'))return;try{const items=await DB.query('bill_items'),bi=items.filter(i=>i.bill_id==billId);for(let i of bi)await DB.delete('bill_items',i.id);await DB.delete('bills',billId);alert('✅ Bill deleted!');showCustomerHistory(custName,custMobile);loadHistoryCustomers();await refreshDropdownCache()}catch(err){alert('❌ Error: '+err.message)}}

async function openEditModal(billId){try{const bills=await DB.query('bills'),bill=bills.find(b=>String(b.id)===String(billId));if(!bill){alert('❌ Bill not found');return}if(bill.bp_status==='done'){alert('⚠️ This bill is marked as BP DONE.\n\nEdit is permanently disabled.');return}const allItems=await DB.query('bill_items');editingItems=allItems.filter(i=>String(i.bill_id)===String(billId)).map(i=>({...i}));editingBillId=billId;const billNum=getBillNum(bill),isStockist=bill.customer_type==='stockist';let html=`<div style="background:#f8f9fa;padding:12px;border-radius:8px;margin-bottom:12px;"><label style="font-weight:600;font-size:0.85rem;">🎫 Bill Number</label><input type="text" value="${billNum}" disabled style="background:#e8e8e8;font-weight:bold;"><label style="font-weight:600;font-size:0.85rem;">👤 Customer Name</label><input type="text" id="edit-cust-name" value="${bill.cust_name||''}"><label style="font-weight:600;font-size:0.85rem;">📱 Mobile</label><input type="tel" id="edit-cust-mobile" value="${bill.cust_mobile||''}" maxlength="10" oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,10)"><label style="font-weight:600;font-size:0.85rem;">👤 Customer Type</label><select id="edit-cust-type"><option value="stockist" ${bill.customer_type==='stockist'?'selected':''}>🟢 Stockist</option><option value="distributor" ${bill.customer_type==='distributor'?'selected':''}>🟠 Distributor</option><option value="customer" ${bill.customer_type==='customer'?'selected':''}>🔵 Customer</option></select>${isStockist?`<label style="font-weight:600;font-size:0.85rem;">🏪 Stockist ID</label><input type="text" id="edit-stockist-id" value="${bill.stockist_id||''}">`:''}</div><div class="add-product-section"><h4>➕ Add New Product to Bill</h4><div class="search-dropdown" id="edit-prod-dropdown"><input type="text" id="edit-prod-search" placeholder="🔍 Search product to add..." autocomplete="off"><div class="dropdown-list" id="edit-prod-list"></div></div></div><h4 style="margin-bottom:10px;">🛒 Bill Items (${editingItems.length})</h4><div id="edit-items-list"></div><div style="display:flex;gap:8px;margin-top:15px;"><button class="btn btn-primary" onclick="saveEditedBill()" style="flex:1;"><span class="btn-icon">💾</span> Save Changes</button><button class="btn btn-back" onclick="closeEditModal()" style="flex:1;"><span class="btn-icon">❌</span> Cancel</button></div>`;document.getElementById('edit-bill-content').innerHTML=html;document.getElementById('edit-modal').style.display='block';renderEditItemsList();setupEditProductSearch()}catch(err){alert('❌ Error: '+err.message)}}

function closeEditModal(){document.getElementById('edit-modal').style.display='none';editingBillId=null;editingItems=[]}

async function saveEditedBill(){if(!editingBillId||editingItems.length===0){alert('No items to save');return}const nn=document.getElementById('edit-cust-name').value.trim(),nm=document.getElementById('edit-cust-mobile').value.trim(),nt=document.getElementById('edit-cust-type').value,nsEl=document.getElementById('edit-stockist-id'),ns=nsEl?nsEl.value.trim():'';if(!nn){alert('⚠️ Customer name required');return}try{let tM=0,tS=0,tB=0;editingItems.forEach(i=>{tM+=(i.mrp||0)*(i.qty||0);tS+=(i.sp||0)*(i.qty||0);tB+=(i.bp||0)*(i.qty||0)});await DB.update('bills',editingBillId,{cust_name:nn,cust_mobile:nm,customer_type:nt,total_mrp:tM,total_sp:tS,total_bp:tB,stockist_id:ns});const bills=await DB.query('bills'),bill=bills.find(b=>String(b.id)===String(editingBillId)),customers=await DB.query('customers'),cust=customers.find(c=>c.id==bill.customer_id);if(cust)await DB.update('customers',cust.id,{name:nn,mobile:nm,customer_type:nt});const oi=await DB.query('bill_items'),bi=oi.filter(i=>String(i.bill_id)===String(editingBillId));for(let i of bi)await DB.delete('bill_items',i.id);for(let i of editingItems)await DB.run('bill_items',{bill_id:editingBillId,item_name:i.item_name,mrp:i.mrp,sp:i.sp,bp:i.bp,qty:i.qty,tot_mrp:(i.mrp||0)*(i.qty||0),tot_sp:(i.sp||0)*(i.qty||0),tot_bp:(i.bp||0)*(i.qty||0)});alert('✅ Bill updated!');closeEditModal();showCustomerHistory(nn,nm);loadHistoryCustomers();await refreshDropdownCache()}catch(err){alert('❌ Error: '+err.message)}}

function setupEditProductSearch(){const input=document.getElementById('edit-prod-search'),list=document.getElementById('edit-prod-list');if(!input||!list)return;let dt;function rwd(){clearTimeout(dt);dt=setTimeout(()=>renderEditDD(),50)}input.addEventListener('focus',rwd);input.addEventListener('input',rwd);input.addEventListener('blur',()=>{setTimeout(()=>list.classList.remove('show'),200)});function renderEditDD(){const data=dropdownCache.products,f=input.value.toLowerCase(),filtered=data.filter(i=>i.name.toLowerCase().includes(f)||(i.detail&&i.detail.toLowerCase().includes(f)));list.innerHTML=filtered.length>0?filtered.slice(0,30).map(i=>`<div class="dropdown-item" onclick="addProductToEditBill('${i.name.replace(/'/g,"\\'")}')"><div class="item-name">${i.name}${i.source==='manual'?'<span class="manual-badge">⭐ MANUAL</span>':''}</div><div class="item-detail">${i.detail}</div></div>`).join(''):'<div class="dropdown-item" style="color:#999;">No matches found</div>';list.classList.add('show')}}

function addProductToEditBill(name){const p=dropdownCache.products.find(x=>x.name===name);if(!p)return;const ex=editingItems.find(i=>i.item_name===p.name);if(ex)ex.qty=(ex.qty||0)+1;else{const mrp=parseFloat(p.detail.match(/MRP: ([\d.]+)/)[1])||0,sp=parseFloat(p.detail.match(/SP: ([\d.]+)/)[1])||0,bp=parseFloat(p.detail.match(/BP: ([\d.]+)/)[1])||0;editingItems.push({item_name:p.name,mrp,sp,bp,qty:1,isNew:true})}document.getElementById('edit-prod-search').value='';document.getElementById('edit-prod-list').classList.remove('show');renderEditItemsList()}

function removeProductFromEdit(idx){if(confirm('Remove this product?')){editingItems.splice(idx,1);renderEditItemsList()}}

function renderEditItemsList(){const el=document.getElementById('edit-items-list');if(!el)return;let h='';editingItems.forEach((item,idx)=>{const isNew=item.isNew?'<span class="manual-badge" style="background:#9b59b6;">NEW</span>':'';h+=`<div class="edit-item-row"><div><div class="item-name">${item.item_name||'Unknown'} ${isNew}</div><div style="font-size:0.75rem;color:#666;">MRP: ${item.mrp||0} | SP: ${item.sp||0} | BP: ${item.bp||0}</div></div><input type="number" value="${item.qty||1}" min="1" onchange="editingItems[${idx}].qty=parseInt(this.value)||1" style="width:70px;"><button class="remove-btn" onclick="removeProductFromEdit(${idx})">✕</button></div>`});el.innerHTML=h||'<p style="text-align:center;color:#888;padding:10px;">No items in bill</p>'}

async function viewBillDetails(billId){try{const bills=await DB.query('bills'),bill=bills.find(b=>String(b.id)===String(billId));if(!bill){alert('❌ Bill not found');return}const allItems=await DB.query('bill_items'),items=allItems.filter(i=>String(i.bill_id)===String(billId)),billNum=getBillNum(bill),ct=bill.customer_type||'customer',pc=bill.price_columns?bill.price_columns.split(','):['mrp','sp','bp'],isDone=String(bill.bp_status||'pending').toLowerCase()==='done',sid=bill.stockist_id||'',doneDate=bill.bp_done_date||'',remarks=bill.bp_done_remarks||'';let h=`<div class="view-bill-header"><div class="company-name">🕉️ SK AAYURVEDA</div><div class="company-sub">KEVA SUPER STOCK POINT</div><div class="bill-no">🎫 Bill No: ${billNum}</div></div><div class="view-bill-info"><div class="view-bill-info-row"><span class="label">📅 Date:</span><span class="value">${new Date(bill.date).toLocaleString()}</span></div><div class="view-bill-info-row"><span class="label">👤 Customer:</span><span class="value">${bill.cust_name||'N/A'}</span></div><div class="view-bill-info-row"><span class="label">📱 Mobile:</span><span class="value">${bill.cust_mobile||'N/A'}</span></div><div class="view-bill-info-row"><span class="label">🏷️ Type:</span><span class="value"><span class="customer-type-badge type-${ct}" style="font-size:0.7rem;padding:2px 10px;margin:0;">${ct.toUpperCase()}</span></span></div>${sid?`<div class="view-bill-info-row"><span class="label">🏪 Stockist ID:</span><span class="value"><span class="stockist-id-badge">${sid}</span></span></div>`:''}<div class="view-bill-info-row"><span class="label">💰 BP Status:</span><span class="value"><span class="bp-status-badge ${isDone?'bp-done':'bp-pending'}">${isDone?'✅ DONE':'⏳ PENDING'}</span>${isDone&&doneDate?`<div style="font-size:0.75rem;color:#155724;margin-top:4px;">📅 ${new Date(doneDate).toLocaleString()}</div>`:''}${isDone&&remarks?`<div style="font-size:0.75rem;color:#555;margin-top:2px;">📝 ${remarks}</div>`:''}</span></div></div><div class="view-bill-items"><h4 style="margin-bottom:8px;color:#1a1a2e;">🛒 Items (${items.length})</h4><div class="table-wrap"><table><thead><tr><th>#</th><th>Item</th><th>Qty</th>${pc.includes('mrp')?'<th>MRP</th><th>Total</th>':''}${pc.includes('sp')?'<th>SP</th><th>Total</th>':''}${pc.includes('bp')?'<th>BP</th><th>Total</th>':''}</tr></thead><tbody>`;items.forEach((item,idx)=>{const dn=ct==='stockist'?(item.item_name||'Unknown'):cleanProductName(item.item_name||'Unknown',ct);h+=`<tr><td>${idx+1}</td><td>${dn}</td><td>${item.qty||0}</td>`;if(pc.includes('mrp'))h+=`<td>${(item.mrp||0).toFixed(2)}</td><td>${((item.mrp||0)*(item.qty||0)).toFixed(2)}</td>`;if(pc.includes('sp'))h+=`<td>${(item.sp||0).toFixed(2)}</td><td>${((item.sp||0)*(item.qty||0)).toFixed(2)}</td>`;if(pc.includes('bp'))h+=`<td>${(item.bp||0).toFixed(2)}</td><td>${((item.bp||0)*(item.qty||0)).toFixed(2)}</td>`;h+=`</tr>`});h+=`</tbody></table></div></div><div class="view-bill-total">`;if(pc.includes('mrp'))h+=`<div class="view-bill-total-row"><span>💲 Total MRP:</span><span>Rs. ${(bill.total_mrp||0).toFixed(2)}</span></div>`;if(pc.includes('sp'))h+=`<div class="view-bill-total-row"><span>🏷️ Total SP:</span><span>Rs. ${(bill.total_sp||0).toFixed(2)}</span></div>`;if(pc.includes('bp'))h+=`<div class="view-bill-total-row main"><span>💰 Total BP:</span><span>${(bill.total_bp||0).toFixed(2)}</span></div>`;else h+=`<div class="view-bill-total-row main"><span>💲 Total MRP:</span><span>Rs. ${(bill.total_mrp||0).toFixed(2)}</span></div>`;h+=`</div><div class="view-bill-footer"><div class="thank-you">Thank you! 🙏</div><div class="visit-again">✨ Please visit again! ✨</div></div><div style="display:flex;gap:8px;margin-top:15px;"><button class="btn btn-share" onclick="closeViewBillModal();openShareModal(${bill.id})" style="flex:1;"><span class="btn-icon">📤</span> Share This Bill</button><button class="btn btn-back" onclick="closeViewBillModal()" style="flex:1;"><span class="btn-icon">❌</span> Close</button></div>`;document.getElementById('view-bill-content').innerHTML=h;document.getElementById('view-bill-modal').style.display='block'}catch(err){alert('❌ Error: '+err.message)}}

function closeViewBillModal(){document.getElementById('view-bill-modal').style.display='none'}

async function showCustomerManagement(){document.getElementById('history-main-view').style.display='none';document.getElementById('history-detail-view').style.display='none';document.getElementById('customer-mgmt-view').style.display='block';document.getElementById('mgmt-search').value='';renderCustomerManagement()}

function hideCustomerManagement(){document.getElementById('customer-mgmt-view').style.display='none';document.getElementById('history-main-view').style.display='block'}

async function renderCustomerManagement(){const s=(document.getElementById('mgmt-search').value||'').toLowerCase();const cs=await DB.query('customers');const filtered=cs.filter(c=>!s||c.name.toLowerCase().includes(s)||(c.mobile||'').includes(s));const bills=await DB.query('bills');const html=filtered.sort((a,b)=>a.name.localeCompare(b.name)).map(c=>{const tc=`type-${c.customer_type||'customer'}`,tl=(c.customer_type||'customer').toUpperCase();const billCount=bills.filter(b=>String(b.customer_id)===String(c.id)).length;const totalBP=bills.filter(b=>String(b.customer_id)===String(c.id)).reduce((s,b)=>s+(b.total_bp||0),0);return`<div class="mgmt-cust-item"><div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;"><div><strong style="font-size:1rem;">${c.name}</strong><span class="customer-type-badge ${tc}" style="font-size:0.65rem;padding:2px 8px;margin-left:5px;">${tl}</span><div style="color:#666;font-size:0.82rem;margin-top:4px;">📱 ${c.mobile||'No Mobile'} | 📋 ${billCount} Bill(s) | 💰 ${totalBP.toFixed(2)} BP</div></div></div><div class="mgmt-cust-actions"><button class="btn btn-edit btn-small" onclick="openCustEditModal(${c.id})"><span class="btn-icon">✏️</span> Edit</button><button class="btn btn-danger btn-small" onclick="deleteCustomer(${c.id},'${c.name.replace(/'/g,"\\'")}')"><span class="btn-icon">🗑️</span> Delete</button></div></div>`}).join('');document.getElementById('mgmt-customer-list').innerHTML=html||'<p style="text-align:center;color:#888;padding:20px;">No customers found.</p>'}

async function openCustEditModal(custId){try{const cs=await DB.query('customers');const c=cs.find(x=>String(x.id)===String(custId));if(!c){alert('❌ Customer not found');return}editingCustId=custId;const html=`<div style="background:#f8f9fa;padding:12px;border-radius:8px;margin-bottom:12px;"><label style="font-weight:600;font-size:0.85rem;">👤 Customer Name</label><input type="text" id="edit-cust-name-input" value="${c.name||''}"><label style="font-weight:600;font-size:0.85rem;">📱 Mobile Number</label><input type="tel" id="edit-cust-mobile-input" value="${c.mobile||''}" maxlength="10" oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,10)"><label style="font-weight:600;font-size:0.85rem;">🏷️ Customer Type</label><select id="edit-cust-type-input"><option value="customer" ${c.customer_type==='customer'?'selected':''}>🔵 Customer (MRP only)</option><option value="distributor" ${c.customer_type==='distributor'?'selected':''}>🟠 Distributor (MRP + BP)</option><option value="stockist" ${c.customer_type==='stockist'?'selected':''}>🟢 Stockist (MRP + SP + BP)</option></select></div><div style="display:flex;gap:8px;"><button class="btn btn-primary" onclick="saveCustEdit()" style="flex:1;"><span class="btn-icon">💾</span> Save</button><button class="btn btn-back" onclick="closeCustEditModal()" style="flex:1;"><span class="btn-icon">❌</span> Cancel</button></div>`;document.getElementById('cust-edit-content').innerHTML=html;document.getElementById('cust-edit-modal').style.display='block'}catch(err){alert('❌ Error: '+err.message)}}

function closeCustEditModal(){document.getElementById('cust-edit-modal').style.display='none';editingCustId=null}

async function saveCustEdit(){if(!editingCustId)return;const nn=document.getElementById('edit-cust-name-input').value.trim();const nm=document.getElementById('edit-cust-mobile-input').value.trim();const nt=document.getElementById('edit-cust-type-input').value;if(!nn){alert('⚠️ Name required');return}try{await DB.update('customers',editingCustId,{name:nn,mobile:nm,customer_type:nt});const bills=await DB.query('bills');const cb=bills.filter(b=>String(b.customer_id)===String(editingCustId));for(let b of cb){await DB.update('bills',b.id,{cust_name:nn,cust_mobile:nm,customer_type:nt})}alert('✅ Customer updated!\n\n👤 '+nn+'\n🏷️ '+nt.toUpperCase()+'\n📋 '+cb.length+' bill(s) updated');closeCustEditModal();renderCustomerManagement();await refreshDropdownCache()}catch(err){alert('❌ Error: '+err.message)}}

async function deleteCustomer(custId,custName){const bills=await DB.query('bills');const billCount=bills.filter(b=>String(b.customer_id)===String(custId)).length;const msg=billCount>0?`⚠️ DELETE CUSTOMER\n\n"${custName}"\n\nThis customer has ${billCount} bill(s).\n\nChoose action:`:`⚠️ DELETE CUSTOMER\n\n"${custName}"\n\nDelete this customer?`;if(billCount>0){if(!confirm(msg+'\n\n🗑️ OK = Delete customer + ALL bills\n❌ Cancel = Keep everything'))return;try{const cb=bills.filter(b=>String(b.customer_id)===String(custId));for(let b of cb){const bi=await DB.query('bill_items');const items=bi.filter(i=>String(i.bill_id)===String(b.id));for(let i of items)await DB.delete('bill_items',i.id);await DB.delete('bills',b.id)}await DB.delete('customers',custId);alert('✅ Customer and '+billCount+' bill(s) deleted!');renderCustomerManagement();loadHistoryCustomers();await refreshDropdownCache()}catch(err){alert('❌ Error: '+err.message)}}else{if(!confirm(msg))return;try{await DB.delete('customers',custId);alert('✅ Customer deleted!');renderCustomerManagement();loadHistoryCustomers();await refreshDropdownCache()}catch(err){alert('❌ Error: '+err.message)}}}

async function openAddCustomerModal(){const html=`<div style="background:#f8f9fa;padding:12px;border-radius:8px;margin-bottom:12px;"><label style="font-weight:600;font-size:0.85rem;">👤 Customer Name *</label><input type="text" id="new-cust-name" placeholder="Enter customer name"><label style="font-weight:600;font-size:0.85rem;">📱 Mobile Number</label><input type="tel" id="new-cust-mobile" placeholder="10-digit mobile" maxlength="10" oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,10)"><label style="font-weight:600;font-size:0.85rem;">🏷️ Customer Type *</label><select id="new-cust-type"><option value="customer" selected>🔵 Customer (MRP only)</option><option value="distributor">🟠 Distributor (MRP + BP)</option><option value="stockist">🟢 Stockist (MRP + SP + BP)</option></select><label style="font-weight:600;font-size:0.85rem;">🏪 Stockist ID (only for Stockist)</label><input type="text" id="new-cust-stockist-id" placeholder="e.g., STK001" disabled></div><div style="display:flex;gap:8px;"><button class="btn btn-primary" onclick="saveNewCustomer()" style="flex:1;"><span class="btn-icon">💾</span> Save</button><button class="btn btn-back" onclick="closeAddCustomerModal()" style="flex:1;"><span class="btn-icon">❌</span> Cancel</button></div>`;document.getElementById('add-cust-content').innerHTML=html;document.getElementById('new-cust-type').addEventListener('change',function(){const sid=document.getElementById('new-cust-stockist-id');if(this.value==='stockist'){sid.disabled=false;sid.placeholder='e.g., STK001'}else{sid.disabled=true;sid.value='';sid.placeholder='Only for Stockist'}});document.getElementById('add-cust-modal').style.display='block'}

function closeAddCustomerModal(){document.getElementById('add-cust-modal').style.display='none'}

async function saveNewCustomer(){const name=document.getElementById('new-cust-name').value.trim();const mobile=document.getElementById('new-cust-mobile').value.trim();const type=document.getElementById('new-cust-type').value;const sid=document.getElementById('new-cust-stockist-id').value.trim();if(!name){alert('⚠️ Customer name required');return}if(type==='stockist'&&!sid){if(!confirm('⚠️ Stockist ID is empty.\n\nContinue without Stockist ID?'))return}try{const cs=await DB.query('customers');const existing=cs.find(c=>c.name.toLowerCase()===name.toLowerCase()&&(c.mobile||'').replace(/\D/g,'')===mobile.replace(/\D/g,''));if(existing){alert('⚠️ Customer already exists!\n\nUse Edit button to modify.');return}await DB.run('customers',{name,mobile,customer_type:type});if(type==='stockist'&&sid){const newCust=(await DB.query('customers')).find(c=>c.name===name&&(c.mobile||'')===mobile);if(newCust){const bn=await generateBillNumber();await DB.run('bills',{bill_number:bn,customer_id:newCust.id,cust_name:name,cust_mobile:mobile,customer_type:type,date:new Date().toISOString(),total_mrp:0,total_sp:0,total_bp:0,price_columns:'mrp,sp,bp',bp_status:'done',stockist_id:sid,bp_done_date:new Date().toISOString(),bp_done_remarks:'Customer created with Stockist ID'})}}alert('✅ Customer added!\n\n👤 '+name+'\n🏷️ '+type.toUpperCase()+(sid?'\n🏪 '+sid:''));closeAddCustomerModal();renderCustomerManagement();await refreshDropdownCache()}catch(err){alert('❌ Error: '+err.message)}}



// ==========================================================
// BL-FULL-V1 : Bill List + Edit Modal + History Toggle/Pagination
// (self-contained; uses only original app globals)
// ==========================================================
var BL = { page:1, per:10, items:[], billId:null, prods:[], bill:null };
var HP = { page:1, per:10 };

function blToggle(){
    var s=document.getElementById('blx-sec'), b=document.getElementById('blx-btn');
    if(!s||!b) return;
    var hidden = (s.style.display==='none'||s.style.display==='');
    s.style.display = hidden?'block':'none';
    b.innerHTML = hidden?'&#128281; Hide Bill List':'&#128203; Show Bill List';
    if(hidden) blRender();
}
function blChangePer(v){ BL.per=parseInt(v)||10; BL.page=1; blRender(); }
function blPrev(){ if(BL.page>1){BL.page--; blRender();} }
function blNext(){ BL.page++; blRender(); }

async function blRender(){
    var c=document.getElementById('blx-cards'); if(!c) return;
    try{
        var bills = await DB.query('bills');
        bills.sort(function(a,b){return b.id-a.id;});
        var pages = Math.max(1, Math.ceil(bills.length/BL.per));
        if(BL.page>pages) BL.page=pages;
        var slice = bills.slice((BL.page-1)*BL.per, BL.page*BL.per);
        var allIt = await DB.query('bill_items');
        var cnt = {};
        allIt.forEach(function(i){ cnt[i.bill_id]=(cnt[i.bill_id]||0)+1; });
        var html = '';
        for(var x=0;x<slice.length;x++){
            var b = slice[x];
            var t = b.customer_type||'customer';
            var bp = (b.total_bp||0).toFixed(2);
            var st = String(b.bp_status||'pending').toLowerCase();
            var done = (st==='done'||st==='completed');
            var sid = (b.stockist_id||'').trim();
            html += '<div class="bill-item" onclick="openBLModal('+b.id+')" style="cursor:pointer;margin-bottom:12px;">';
            html += '<div style="margin-bottom:6px;">';
            html += '<span class="bill-number-badge">#'+getBillNum(b)+'</span> ';
            html += '<span class="customer-type-badge type-'+t+'" style="font-size:0.65rem;padding:2px 8px;">'+t.toUpperCase()+'</span> ';
            if(t==='stockist'){ html += '<span class="stockist-id-badge">🏪 '+(sid||'NA')+'</span> '; }
            html += done ? '<span class="bp-status-badge bp-done">BP DONE</span>' : '<span class="bp-status-badge bp-pending">BP PENDING</span>';
            html += '</div>';
            html += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;">';
            html += '<div><strong>'+new Date(b.date).toLocaleDateString()+'</strong>';
            html += '<div style="color:#666;font-size:0.82rem;margin-top:4px;">MRP: Rs. '+(b.total_mrp||0).toFixed(2)+' | BP: '+bp+'</div>';
            html += '<div style="color:#333;font-size:0.9rem;margin-top:4px;">'+(b.cust_name||'Unknown')+'</div></div>';
            html += '<div style="font-weight:bold;color:'+(done?'#95a5a6':'#27ae60')+';font-size:1.1rem;">'+bp+' BP</div>';
            html += '</div>';
            html += '<div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;">';
            html += '<span style="color:#888;font-size:0.8rem;">🛒 '+(cnt[b.id]||0)+' items</span>';
            html += '<button onclick="event.stopPropagation();openShareModal('+b.id+')" style="padding:6px 14px;background:#3498db;color:#fff;border:none;border-radius:6px;font-size:0.8rem;font-weight:600;cursor:pointer;">📤 Share</button>';
            html += '</div></div>';
        }
        c.innerHTML = html || '<p style="text-align:center;color:#888;padding:15px;">No bills found.</p>';
        document.getElementById('blx-info').innerText='Page '+BL.page+' of '+pages;
        document.getElementById('blx-prev').disabled = (BL.page===1);
        document.getElementById('blx-next').disabled = (BL.page===pages);
    }catch(e){ console.error('blRender', e); }
}

async function blGetProducts(){
    if(BL.prods && BL.prods.length) return BL.prods;
    try{ if(typeof dropdownCache!=='undefined' && dropdownCache.products && dropdownCache.products.length){ BL.prods=dropdownCache.products; return BL.prods; } }catch(e){}
    try{ if(typeof refreshDropdownCache==='function'){ await refreshDropdownCache(); if(dropdownCache && dropdownCache.products && dropdownCache.products.length){ BL.prods=dropdownCache.products; return BL.prods; } } }catch(e){}
    try{ BL.prods = (await DB.query('products'))||[]; }catch(e){ BL.prods=[]; }
    return BL.prods;
}

async function openBLModal(id){
    BL.billId=id;
    var bills=await DB.query('bills');
    BL.bill=bills.find(function(b){return b.id===id;});
    var items=await DB.query('bill_items');
    BL.items=items.filter(function(i){return i.bill_id===id;}).map(function(i){return {id:i.id,item_name:i.item_name,qty:i.qty,mrp:i.mrp,sp:i.sp,bp:i.bp};});
    blGetProducts();
    blRenderModal();
    document.getElementById('blx-modal').style.display='block';
}
function blClose(){ document.getElementById('blx-modal').style.display='none'; }

function blRenderModal(){
    var b=BL.bill; if(!b) return;
    var rows = BL.items.map(function(it,idx){
        return '<div class="blx-item"><div style="display:flex;justify-content:space-between;margin-bottom:8px;">'+
          '<strong>'+it.item_name+'</strong>'+
          '<button onclick="blRemoveItem('+idx+')" style="background:#ffebee;color:#dc3545;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;">X</button></div>'+
          '<div class="blx-grid">'+
          '<div><label>Qty</label><input class="blx-in" type="number" value="'+(it.qty||0)+'" onchange="blSetField('+idx+',\'qty\',this.value)"></div>'+
          '<div><label>MRP</label><input class="blx-in" type="number" value="'+(it.mrp||0)+'" onchange="blSetField('+idx+',\'mrp\',this.value)"></div>'+
          '<div><label>SP</label><input class="blx-in" type="number" value="'+(it.sp||0)+'" onchange="blSetField('+idx+',\'sp\',this.value)"></div>'+
          '<div><label>BP</label><input class="blx-in" type="number" value="'+(it.bp||0)+'" onchange="blSetField('+idx+',\'bp\',this.value)"></div>'+
          '</div></div>';
    }).join('');
    document.getElementById('blx-modal-body').innerHTML =
      '<div style="display:flex;justify-content:space-between;border-bottom:2px solid #007bff;padding-bottom:10px;margin-bottom:15px;">'+
      '<h3 style="margin:0;">Edit Bill: #'+getBillNum(b)+'</h3>'+
      '<button onclick="blClose()" style="background:none;border:none;font-size:1.8rem;cursor:pointer;">&times;</button></div>'+
      '<div style="background:#f8f9fa;padding:12px;border-radius:8px;margin-bottom:15px;border-left:4px solid #007bff;">'+
      '<p style="margin:0 0 5px 0;"><strong>'+(b.cust_name||'')+'</strong> <span class="customer-type-badge type-'+(b.customer_type||'customer')+'" style="font-size:0.65rem;padding:2px 8px;">'+(b.customer_type||'customer').toUpperCase()+'</span></p>'+
      '<p style="margin:0;color:#666;font-size:0.85rem;">'+new Date(b.date).toLocaleDateString()+'</p></div>'+
      '<div style="background:#f8f9fa;padding:12px;border-radius:8px;margin-bottom:15px;border:1px solid #e9ecef;">'+
      '<h4 style="margin:0 0 10px 0;">Add New Product</h4>'+
      '<input id="bl-search" placeholder="Search product to add..." autocomplete="off" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;">'+
      '<div id="bl-dd" class="blx-dd"></div></div>'+
      '<h4 style="margin-bottom:10px;">Bill Items ('+BL.items.length+')</h4>'+
      (rows || '<p style="text-align:center;color:#888;padding:15px;">No items yet. Search above to add.</p>')+
      '<div class="blx-tot"><div><div style="font-size:.7rem;color:#666;">TOTAL MRP</div><div style="font-size:1.1rem;font-weight:800;">Rs. <span id="bl-t-mrp">0.00</span></div></div>'+
      '<div><div style="font-size:.7rem;color:#666;">TOTAL SP</div><div style="font-size:1.1rem;font-weight:800;">Rs. <span id="bl-t-sp">0.00</span></div></div>'+
      '<div><div style="font-size:.7rem;color:#28a745;">TOTAL BP</div><div style="font-size:1.1rem;font-weight:800;color:#28a745;">Rs. <span id="bl-t-bp">0.00</span></div></div></div>'+
      '<div style="display:flex;gap:10px;margin-top:15px;">'+
      '<button onclick="blClose()" style="flex:1;padding:12px;background:#e9ecef;border:none;border-radius:8px;font-weight:700;cursor:pointer;">Cancel</button>'+
      '<button onclick="blClose();openShareModal('+b.id+')" style="flex:1;padding:12px;background:#3498db;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">📤 Share</button>'+
      '<button onclick="blSave()" style="flex:1;padding:12px;background:#28a745;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">Save Changes</button></div>';
    blTotals();
    var dd=document.getElementById('bl-dd'); if(dd) dd.style.display='none';
}

function blSetField(idx,field,val){ if(BL.items[idx]){ BL.items[idx][field]=parseFloat(val)||0; blTotals(); } }
function blRemoveItem(idx){ BL.items.splice(idx,1); blRenderModal(); }
function blTotals(){
    var m=0,s=0,bp=0;
    BL.items.forEach(function(i){ m+=(i.mrp||0)*(i.qty||0); s+=(i.sp||0)*(i.qty||0); bp+=(i.bp||0)*(i.qty||0); });
    var e1=document.getElementById('bl-t-mrp'); if(e1)e1.innerText=m.toFixed(2);
    var e2=document.getElementById('bl-t-sp'); if(e2)e2.innerText=s.toFixed(2);
    var e3=document.getElementById('bl-t-bp'); if(e3)e3.innerText=bp.toFixed(2);
}

async function blSearch(val){
    var dd=document.getElementById('bl-dd'); if(!dd) return;
    if(!val){ dd.style.display='none'; return; }
    var prods = await blGetProducts();
    var f=val.toLowerCase();
    var matched=prods.filter(function(p){
        return (p.name||'').toLowerCase().indexOf(f)!==-1 || (p.detail||'').toLowerCase().indexOf(f)!==-1;
    });
    console.log('[blSearch] loaded:',prods.length,'matched:',matched.length);
    if(!matched.length){
        dd.innerHTML='<div style="padding:10px 15px;color:#999;">No matches ('+prods.length+' products loaded)</div>';
    }else{
        dd.innerHTML=matched.slice(0,30).map(function(p){
            return '<div class="blx-dd-row" data-bl-prod="'+String(p.name||'').replace(/"/g,'&quot;')+'">'+
              '<div style="font-weight:600;color:#333;">'+(p.name||'')+'</div>'+
              '<div style="font-size:0.8rem;color:#666;margin-top:2px;">'+(p.detail||'')+'</div></div>';
        }).join('');
    }
    dd.style.display='block';
}

function blAddProd(name){
    var p=null;
    for(var i=0;i<BL.prods.length;i++){ if(BL.prods[i].name===name){ p=BL.prods[i]; break; } }
    if(!p) return;
    var d=p.detail||'';
    var m1=d.match(/MRP: ([0-9.]+)/); var m2=d.match(/SP: ([0-9.]+)/); var m3=d.match(/BP: ([0-9.]+)/);
    var mrp=m1?parseFloat(m1[1]):0, sp=m2?parseFloat(m2[1]):0, bp=m3?parseFloat(m3[1]):0;
    var ex=null;
    for(var j=0;j<BL.items.length;j++){ if(BL.items[j].item_name===name){ ex=BL.items[j]; break; } }
    if(ex){ ex.qty=(ex.qty||0)+1; } else { BL.items.push({item_name:name,qty:1,mrp:mrp,sp:sp,bp:bp}); }
    var inp=document.getElementById('bl-search'); if(inp) inp.value='';
    var dd=document.getElementById('bl-dd'); if(dd) dd.style.display='none';
    blRenderModal();
}

async function blSave(){
    if(!BL.billId) return;
    try{
        var old=await DB.query('bill_items');
        for(var i=0;i<old.length;i++){ if(old[i].bill_id===BL.billId) await DB.delete('bill_items', old[i].id); }
        var tM=0,tS=0,tB=0;
        for(var k=0;k<BL.items.length;k++){
            var it=BL.items[k], q=it.qty||0, m=it.mrp||0, s=it.sp||0, b=it.bp||0;
            await DB.run('bill_items',{bill_id:BL.billId,item_name:it.item_name,mrp:m,sp:s,bp:b,qty:q,tot_mrp:m*q,tot_sp:s*q,tot_bp:b*q});
            tM+=m*q; tS+=s*q; tB+=b*q;
        }
        await DB.update('bills', BL.billId, {total_mrp:tM, total_sp:tS, total_bp:tB});
        alert('Bill updated successfully!');
        blClose(); blRender();
        if(typeof loadHistoryCustomers==='function') loadHistoryCustomers();
    }catch(e){ alert('Error: '+e.message); }
}

// ---- delegated events (no inline onclick with quotes) ----
document.addEventListener('input', function(e){
    if(e.target && e.target.id==='bl-search'){ e.stopImmediatePropagation(); blSearch(e.target.value); }
}, true);
document.addEventListener('click', function(e){
    var row=e.target.closest ? e.target.closest('[data-bl-prod]') : null;
    if(row){ blAddProd(row.getAttribute('data-bl-prod')); return; }
    var dd=document.getElementById('bl-dd'), inp=document.getElementById('bl-search');
    if(dd && inp && e.target!==inp && !dd.contains(e.target)){ setTimeout(function(){ dd.style.display='none'; },150); }
}, true);

// ---- original history toggle + pagination ----
function histToggle(){
    var m=document.getElementById('history-main-view'), b=document.getElementById('histx-btn');
    if(!m||!b) return;
    var hidden=(m.style.display==='none');
    m.style.display = hidden?'block':'none';
    b.innerHTML = hidden?'&#128281; Hide Billing History':'&#128203; Show Billing History';
}
function histPag(){
    var list=document.getElementById('customer-list'); if(!list) return;
    var items=list.querySelectorAll('.cust-item'); if(!items.length) return;
    var pages=Math.max(1, Math.ceil(items.length/HP.per));
    if(HP.page>pages) HP.page=pages;
    var start=(HP.page-1)*HP.per;
    for(var i=0;i<items.length;i++){ items[i].style.display=(i>=start&&i<start+HP.per)?'':'none'; }
    var pag=document.getElementById('histx-pag');
    if(!pag){ pag=document.createElement('div'); pag.id='histx-pag'; pag.className='blx-pag'; list.parentNode.insertBefore(pag, list.nextSibling); }
    pag.innerHTML='<select onchange="HP.per=parseInt(this.value)||10;HP.page=1;histPag();" style="padding:6px 10px;border-radius:6px;border:1px solid #ddd;">'+
      '<option value="10"'+(HP.per===10?' selected':'')+'>10</option><option value="20"'+(HP.per===20?' selected':'')+'>20</option><option value="50"'+(HP.per===50?' selected':'')+'>50</option></select>'+
      '<button onclick="HP.page--;histPag();"'+(HP.page===1?' disabled':'')+'>Previous</button>'+
      '<span style="font-weight:700;">Page '+HP.page+' of '+pages+'</span>'+
      '<button onclick="HP.page++;histPag();"'+(HP.page===pages?' disabled':'')+'>Next</button>';
}

// ---- build UI once ----
window.addEventListener('load', function(){
    setTimeout(function(){
        var hmv=document.getElementById('history-main-view');
        if(!hmv || document.getElementById('blx-btn')) return;

        // history toggle button at top of history card
        var hb=document.createElement('button');
        hb.id='histx-btn'; hb.className='blx-toggle'; hb.innerHTML='&#128281; Hide Billing History';
        hb.onclick=histToggle;
        hmv.parentNode.insertBefore(hb, hmv);
        var cl=document.getElementById('customer-list');
        if(cl && window.MutationObserver){ new MutationObserver(function(){histPag();}).observe(cl,{childList:true,subtree:true}); }
        setTimeout(histPag,600);

        // bill list card: inside the container that holds both history views
        var T=hmv;
        while(T.parentElement && !T.contains(document.getElementById('history-detail-view'))){ T=T.parentElement; }
        var card=document.createElement('div');
        card.className='blx-card';
        card.innerHTML='<button id="blx-btn" class="blx-show" onclick="blToggle()">&#128203; Show Bill List</button>'+
          '<div id="blx-sec" style="display:none;margin-top:15px;">'+
          '<div id="blx-cards"></div>'+
          '<div class="blx-pag"><button id="blx-prev" onclick="blPrev()">Previous</button>'+
          '<span id="blx-info" style="font-weight:700;">Page 1</span>'+
          '<button id="blx-next" onclick="blNext()">Next</button></div></div>';
        T.parentNode.insertBefore(card, T.nextSibling);

        // modal
        var md=document.createElement('div');
        md.id='blx-modal'; md.className='blx-modal';
        md.innerHTML='<div class="blx-modal-box"><div id="blx-modal-body"></div></div>';
        document.body.appendChild(md);
    }, 1200);
});


// ==========================================================
// BL-SHARE-V1 : Share button on BP-done history cards
// ==========================================================
(function(){
    function fixDoneCards(){
        var cards = document.querySelectorAll('.bill-item.completed');
        for(var i=0;i<cards.length;i++){
            var card = cards[i];
            if(card.getAttribute('data-sharefix')) continue;
            card.setAttribute('data-sharefix','1');
            var m = card.innerHTML.match(/viewBillDetails\((\d+)\)/);
            if(!m) continue;
            if(card.innerHTML.indexOf('openShareModal') !== -1) continue;
            var btn = document.createElement('button');
            btn.style.cssText = 'width:100%;margin-top:8px;padding:10px;background:#3498db;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;';
            btn.innerHTML = '📤 Share';
            btn.onclick = (function(theId){
                return function(ev){ ev.stopPropagation(); openShareModal(parseInt(theId,10)); };
            })(m[1]);
            card.appendChild(btn);
        }
    }
    setInterval(fixDoneCards, 1000);
})();
