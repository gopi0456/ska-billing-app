function updatePriceDisplay(){const m=document.getElementById('show-mrp').checked,s=document.getElementById('show-sp').checked,b=document.getElementById('show-bp').checked;document.querySelectorAll('.col-mrp').forEach(el=>el.style.display=m?'':'none');document.querySelectorAll('.col-sp').forEach(el=>el.style.display=s?'':'none');document.querySelectorAll('.col-bp').forEach(el=>el.style.display=b?'':'none');const badge=document.getElementById('customer-type-badge'),display=document.getElementById('customer-type-display'),si=document.getElementById('stockist-id');if(document.getElementById('cust-name').value.trim()){const t=getCustomerType(m,s,b);badge.className=`customer-type-badge type-${t}`;badge.innerText=t.toUpperCase();display.style.display='block';if(t==='stockist'){si.disabled=false;si.placeholder='🏪 Stockist ID'}else{si.disabled=true;si.value='';si.placeholder='🏪 Stockist ID (Disabled)'}}else{display.style.display='none';si.disabled=true;si.value='';si.placeholder='🏪 Stockist ID (Disabled)'}renderCart()}

async function selectCustomer(name,mobile,type){document.getElementById('cust-name').value=name;document.getElementById('cust-mobile').value=mobile||'';document.getElementById('cust-list').classList.remove('show');resetUpdateMobile('bill');billFromDD=true;if(type){if(type==='stockist'){document.getElementById('show-mrp').checked=true;document.getElementById('show-sp').checked=true;document.getElementById('show-bp').checked=true}else if(type==='distributor'){document.getElementById('show-mrp').checked=true;document.getElementById('show-sp').checked=false;document.getElementById('show-bp').checked=true}else{document.getElementById('show-mrp').checked=true;document.getElementById('show-sp').checked=false;document.getElementById('show-bp').checked=false}}else{await determineCustomerType(name,mobile)}updatePriceDisplay();
const t=getCustomerType(document.getElementById('show-mrp').checked,document.getElementById('show-sp').checked,document.getElementById('show-bp').checked);
const si=document.getElementById('stockist-id');
if(t==='stockist'){
si.disabled=false;
si.placeholder='🏪 Stockist ID';
const fetchedId=await autoFetchStockistId(name,mobile);
if(fetchedId){si.value=fetchedId}
}else{
si.disabled=true;
si.value='';
si.placeholder='🏪 Stockist ID (Disabled)'
}
}

async function determineCustomerType(n,m){const bills=await DB.query('bills'),cm=(m||'').replace(/\D/g,''),cb=bills.filter(b=>b.cust_name===n&&(b.cust_mobile||'').replace(/\D/g,'')===cm);if(cb.length>0){const l=cb.sort((a,b)=>new Date(b.date)-new Date(a.date))[0];if(l.price_columns){const c=l.price_columns.split(',');document.getElementById('show-mrp').checked=c.includes('mrp');document.getElementById('show-sp').checked=c.includes('sp');document.getElementById('show-bp').checked=c.includes('bp')}}else{document.getElementById('show-mrp').checked=true;document.getElementById('show-sp').checked=true;document.getElementById('show-bp').checked=true}updatePriceDisplay()}

async function saveBill(){const n=document.getElementById('cust-name').value.trim(),mo=document.getElementById('cust-mobile').value.trim(),uc=document.getElementById('bill-update-mobile').checked,sm=document.getElementById('show-mrp').checked,ss=document.getElementById('show-sp').checked,sb=document.getElementById('show-bp').checked,si=document.getElementById('stockist-id'),sid=(sm&&ss&&sb&&si&&!si.disabled)?si.value.trim():'';if(!n||cart.length===0)return alert('Enter customer and items');if(sm&&ss&&sb&&!sid){if(!confirm('⚠️ Stockist ID is empty.\n\nContinue without Stockist ID?'))return}const ct=getCustomerType(sm,ss,sb),pc=[];if(sm)pc.push('mrp');if(ss)pc.push('sp');if(sb)pc.push('bp');const bn=await generateBillNumber(),cs=await DB.query('customers');let c=findCustomer(cs,n,mo);if(!c){const id=await DB.run('customers',{name:n,mobile:mo,customer_type:ct});c={id,name:n,mobile:mo,customer_type:ct}}else{if(uc&&mo&&c.mobile!==mo){await DB.update('customers',c.id,{mobile});c.mobile=mo}await DB.update('customers',c.id,{customer_type:ct});c.customer_type=ct}const tM=cart.reduce((s,i)=>s+i.mrp*i.qty,0),tS=cart.reduce((s,i)=>s+i.sp*i.qty,0),tB=cart.reduce((s,i)=>s+i.bp*i.qty,0),bid=await DB.run('bills',{bill_number:bn,customer_id:c.id,cust_name:n,cust_mobile:mo,customer_type:ct,date:new Date().toISOString(),total_mrp:tM,total_sp:tS,total_bp:tB,price_columns:pc.join(','),bp_status:'pending',stockist_id:sid,bp_done_date:null,bp_done_remarks:null});for(let i of cart)await DB.run('bill_items',{bill_id:bid,item_name:i.item_name,mrp:i.mrp,sp:i.sp,bp:i.bp,qty:i.qty,tot_mrp:i.mrp*i.qty,tot_sp:i.sp*i.qty,tot_bp:i.bp*i.qty});let msg=`✅ Bill Saved!\n\n🎫 Bill No: ${bn}\n👤 Type: ${ct.toUpperCase()}\n💰 BP: ${tB.toFixed(2)}`;if(sid)msg+=`\n🏪 Stockist ID: ${sid}`;alert(msg);cart=[];renderCart();document.getElementById('cust-name').value='';document.getElementById('cust-mobile').value='';document.getElementById('stockist-id').value='';document.getElementById('customer-type-display').style.display='none';resetUpdateMobile('bill');await refreshDropdownCache()}

async function autoFetchStockistId(name,mobile){
if(!name||!name.trim())return '';
const bills=await DB.query('bills');
const cm=(mobile||'').replace(/\D/g,'');
const nameLower=name.toLowerCase().trim();

// 1. Search bills by name and mobile (RELAXED: just check if stockist_id exists)
let matching=bills.filter(b=>{
const bn=(b.cust_name||'').toLowerCase().trim();
const bm=(b.cust_mobile||'').replace(/\D/g,'');
return bn===nameLower&&bm===cm&&b.stockist_id&&b.stockist_id.trim()!==''
});

if(matching.length>0){
const latest=matching.sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
return latest.stockist_id
}

// 2. Fallback: Search by Customer ID (in case mobile number formatting is slightly different)
const cs=await DB.query('customers');
const cust=cs.find(c=>c.name.toLowerCase().trim()===nameLower);
if(cust){
const custBills=bills.filter(b=>String(b.customer_id)===String(cust.id)&&b.stockist_id&&b.stockist_id.trim()!=='');
if(custBills.length>0){
return custBills.sort((a,b)=>new Date(b.date)-new Date(a.date))[0].stockist_id
}
}
return ''
}

async function manualFetchStockistId(){
const name=document.getElementById('cust-name').value.trim();
const mobile=document.getElementById('cust-mobile').value.trim();
if(!name){alert('⚠️ Enter customer name first');return}
const si=document.getElementById('stockist-id');
const t=getCustomerType(document.getElementById('show-mrp').checked,document.getElementById('show-sp').checked,document.getElementById('show-bp').checked);
if(t!=='stockist'){alert('⚠️ Stockist ID only available for Stockist customers.\n\nSelect MRP + SP + BP checkboxes.');return}
si.disabled=false;
const fetchedId=await autoFetchStockistId(name,mobile);
if(fetchedId){
si.value=fetchedId;
alert('✅ Stockist ID fetched: '+fetchedId)
}else{
si.value='';
alert('ℹ️ No previous Stockist ID found for this customer.\n\nYou can type a new one.')
}
}

