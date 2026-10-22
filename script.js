(() => {
  "use strict";
  const STORAGE_KEY = "kaskelas_v2_data";
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const makeId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const money = (value) => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(value)||0);
  const prettyDate = (value) => {
    if (!value) return "—";
    const [y,m,d] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(y,m-1,d));
  };
  const monthKey = (date) => (date || "").slice(0,7);
  const monthName = (key) => {
    if (!key) return "Tanpa tanggal";
    const [y,m] = key.split("-").map(Number);
    return new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric"}).format(new Date(y,m-1,1));
  };
  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const emptyRow = (cols, message) => `<tr><td colspan="${cols}" class="empty">${escapeHTML(message)}</td></tr>`;
  const blankData = () => ({members:[],dues:[],transactions:[]});
  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return blankData();
      const data = JSON.parse(raw);
      return {members:Array.isArray(data.members)?data.members:[],dues:Array.isArray(data.dues)?data.dues:[],transactions:Array.isArray(data.transactions)?data.transactions:[]};
    } catch (err) { console.warn("Data KasKelas tidak dapat dibaca:",err); return blankData(); }
  }
  let data = loadData();
  function saveData() {
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify(data)); }
    catch (err) { notify("Data gagal disimpan. Periksa ruang penyimpanan browser."); }
  }
  function notify(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => toast.classList.remove("show"),2800);
  }
  function memberById(id) { return data.members.find(m=>m.id===id); }
  function dueById(id) { return data.dues.find(d=>d.id===id); }
  function incomeTransactions() { return data.transactions.filter(t=>t.kind==="income"); }
  function totalFor(list, kind) { return list.filter(t=>!kind||t.kind===kind).reduce((sum,t)=>sum+Number(t.amount||0),0); }
  function filteredByDates(list, from, to) {
    return list.filter(t=>(!from||t.date>=from)&&(!to||t.date<=to));
  }
  function transactionType(t) { return t.kind==="income" ? (t.dueName || "Pembayaran iuran") : (t.category || "Pengeluaran"); }
  function transactionMember(t) { return t.memberName || (t.memberId ? memberById(t.memberId)?.name : "") || "—"; }

  function navigate(page) {
    if (!$(`#${page}`)) return;
    $$(".page").forEach(el=>el.classList.toggle("active",el.id===page));
    $$(".nav").forEach(el=>el.classList.toggle("active",el.dataset.page===page));
    const active = $(`.nav[data-page="${page}"] span`);
    $("#pageTitle").textContent = active ? active.textContent.trim() : ({dashboard:"Dashboard",members:"Anggota kelas",dues:"Jenis iuran",payments:"Pembayaran iuran",expenses:"Pengeluaran kas",transactions:"Semua transaksi",reports:"Rekap & buku kas"}[page]||"KasKelas");
    $("#sidebar").classList.remove("open");
    if (page==="reports") renderReports();
  }
  $$(".nav").forEach(btn=>btn.addEventListener("click",()=>navigate(btn.dataset.page)));
  $$("[data-goto]").forEach(btn=>btn.addEventListener("click",()=>navigate(btn.dataset.goto)));
  $("#menuBtn").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
  document.addEventListener("click",e=>{
    if (window.innerWidth<=800 && $("#sidebar").classList.contains("open") && !$("#sidebar").contains(e.target) && !$("#menuBtn").contains(e.target)) $("#sidebar").classList.remove("open");
  });

  function resetMemberForm() {
    $("#memberForm").reset(); $("#memberId").value="";
    $("#memberFormTitle").textContent="Tambah anggota kelas";
    $("#memberSubmit").textContent="＋ Tambah anggota"; $("#memberCancel").classList.add("hidden");
  }
  $("#memberCancel").addEventListener("click",resetMemberForm);
  $("#memberForm").addEventListener("submit",e=>{
    e.preventDefault();
    const id=$("#memberId").value, name=$("#memberName").value.trim(), number=$("#memberNo").value.trim();
    if(!name||!number) return notify("Nama dan NIS wajib diisi.");
    if(data.members.some(m=>m.number.toLowerCase()===number.toLowerCase()&&m.id!==id)) return notify("NIS/nomor anggota sudah digunakan.");
    if(id) { const m=memberById(id); if(m){m.name=name;m.number=number;} notify("Data anggota berhasil diperbarui."); }
    else { data.members.push({id:makeId(),name,number,createdAt:todayISO()}); notify("Anggota berhasil ditambahkan."); }
    saveData(); resetMemberForm(); renderAll();
  });
  $("#memberSearch").addEventListener("input",renderMembers);
  function editMember(id) {
    const m=memberById(id); if(!m)return;
    $("#memberId").value=m.id; $("#memberName").value=m.name; $("#memberNo").value=m.number;
    $("#memberFormTitle").textContent="Edit anggota kelas"; $("#memberSubmit").textContent="Simpan perubahan"; $("#memberCancel").classList.remove("hidden");
    $("#memberName").focus(); window.scrollTo({top:0,behavior:"smooth"});
  }
  function deleteMember(id) {
    const m=memberById(id); if(!m)return;
    if(data.transactions.some(t=>t.kind==="income"&&t.memberId===id)) return notify("Anggota memiliki riwayat pembayaran. Jangan hapus agar laporan tetap akurat.");
    if(!confirm(`Hapus anggota "${m.name}"?`))return;
    data.members=data.members.filter(x=>x.id!==id); saveData(); renderAll(); notify("Anggota berhasil dihapus.");
  }
  function renderMembers() {
    const q=$("#memberSearch").value.trim().toLowerCase();
    const list=data.members.filter(m=>`${m.name} ${m.number}`.toLowerCase().includes(q));
    $("#memberCountLabel").textContent=`${data.members.length} anggota terdaftar`;
    $("#memberRows").innerHTML=list.length?list.map(m=>{
      const paid=incomeTransactions().filter(t=>t.memberId===m.id).reduce((s,t)=>s+Number(t.amount),0);
      return `<tr><td><b>${escapeHTML(m.name)}</b></td><td>${escapeHTML(m.number)}</td><td>${money(paid)}</td><td><div class="action-group"><button class="action-btn" data-action="edit-member" data-id="${m.id}">Edit</button><button class="action-btn danger" data-action="delete-member" data-id="${m.id}">Hapus</button></div></td></tr>`;
    }).join(""):emptyRow(4,q?"Anggota tidak ditemukan.":"Belum ada anggota. Tambahkan anggota melalui formulir di atas.");
  }

  function resetDueForm() {
    $("#dueForm").reset();$("#dueId").value="";
    $("#dueFormTitle").textContent="Tambah jenis iuran/tagihan";$("#dueSubmit").textContent="＋ Tambah jenis iuran";$("#dueCancel").classList.add("hidden");
  }
  $("#dueCancel").addEventListener("click",resetDueForm);
  $("#dueForm").addEventListener("submit",e=>{
    e.preventDefault();
    const id=$("#dueId").value,name=$("#dueName").value.trim(),amount=Number($("#dueAmount").value);
    if(!name||!Number.isFinite(amount)||amount<=0)return notify("Isi nama dan nominal iuran dengan benar.");
    if(data.dues.some(d=>d.name.toLowerCase()===name.toLowerCase()&&d.id!==id))return notify("Nama jenis iuran sudah ada.");
    if(id){const d=dueById(id);if(d){d.name=name;d.amount=amount;}notify("Jenis iuran berhasil diperbarui.");}
    else{data.dues.push({id:makeId(),name,amount});notify("Jenis iuran berhasil ditambahkan.");}
    saveData();resetDueForm();renderAll();
  });
  function editDue(id){
    const d=dueById(id);if(!d)return;
    $("#dueId").value=d.id;$("#dueName").value=d.name;$("#dueAmount").value=d.amount;
    $("#dueFormTitle").textContent="Edit jenis iuran";$("#dueSubmit").textContent="Simpan perubahan";$("#dueCancel").classList.remove("hidden");
    $("#dueName").focus();window.scrollTo({top:0,behavior:"smooth"});
  }
  function deleteDue(id){
    const d=dueById(id);if(!d)return;
    if(data.transactions.some(t=>t.dueId===id))return notify("Jenis iuran sudah dipakai transaksi. Pertahankan agar riwayat tetap akurat.");
    if(!confirm(`Hapus jenis iuran "${d.name}"?`))return;
    data.dues=data.dues.filter(x=>x.id!==id);saveData();renderAll();notify("Jenis iuran berhasil dihapus.");
  }
  function renderDues(){
    $("#dueRows").innerHTML=data.dues.length?data.dues.map(d=>`<tr><td><b>${escapeHTML(d.name)}</b></td><td class="right">${money(d.amount)}</td><td><div class="action-group"><button class="action-btn" data-action="edit-due" data-id="${d.id}">Edit</button><button class="action-btn danger" data-action="delete-due" data-id="${d.id}">Hapus</button></div></td></tr>`).join(""):emptyRow(3,"Belum ada jenis iuran. Tambahkan jenis iuran terlebih dahulu.");
  }
  function populateSelects(){
    const memberOptions=data.members.map(m=>`<option value="${m.id}">${escapeHTML(m.name)} (${escapeHTML(m.number)})</option>`).join("");
    const dueOptions=data.dues.map(d=>`<option value="${d.id}">${escapeHTML(d.name)} — ${money(d.amount)}</option>`).join("");
    const oldMember=$("#paymentMember").value,oldDue=$("#paymentDue").value,oldFilter=$("#filterMember").value;
    $("#paymentMember").innerHTML='<option value="">Pilih anggota...</option>'+memberOptions;
    $("#paymentDue").innerHTML='<option value="">Pilih jenis iuran...</option>'+dueOptions;
    $("#filterMember").innerHTML='<option value="">Semua anggota</option>'+memberOptions;
    if(data.members.some(m=>m.id===oldMember))$("#paymentMember").value=oldMember;
    if(data.dues.some(d=>d.id===oldDue))$("#paymentDue").value=oldDue;
    if(data.members.some(m=>m.id===oldFilter))$("#filterMember").value=oldFilter;
  }
  $("#paymentDue").addEventListener("change",()=>{
    const d=dueById($("#paymentDue").value);if(d)$("#paymentAmount").value=d.amount;
  });
  $("#paymentForm").addEventListener("submit",e=>{
    e.preventDefault();
    const member=memberById($("#paymentMember").value),due=dueById($("#paymentDue").value),amount=Number($("#paymentAmount").value),date=$("#paymentDate").value,note=$("#paymentNote").value.trim();
    if(!member||!due)return notify("Pilih anggota dan jenis iuran.");
    if(!Number.isFinite(amount)||amount<=0)return notify("Nominal pembayaran harus lebih dari nol.");
    if(!date)return notify("Tanggal pembayaran wajib diisi.");
    data.transactions.push({id:makeId(),kind:"income",memberId:member.id,memberName:member.name,dueId:due.id,dueName:due.name,category:due.name,amount,date,note:note||`Pembayaran ${due.name}`,createdAt:new Date().toISOString()});
    saveData();$("#paymentForm").reset();$("#paymentDate").value=todayISO();renderAll();notify("Pembayaran berhasil dicatat.");
  });

  $("#expenseForm").addEventListener("submit",e=>{
    e.preventDefault();
    const category=$("#expenseCategory").value.trim(),amount=Number($("#expenseAmount").value),date=$("#expenseDate").value,note=$("#expenseNote").value.trim();
    if(!category||!note||!date||!Number.isFinite(amount)||amount<=0)return notify("Lengkapi detail pengeluaran dengan benar.");
    data.transactions.push({id:makeId(),kind:"expense",category,amount,date,note,createdAt:new Date().toISOString()});
    saveData();$("#expenseForm").reset();$("#expenseDate").value=todayISO();renderAll();notify("Pengeluaran berhasil dicatat.");
  });

  function transactionRowsHTML(list, includeKind=true){
    if(!list.length)return emptyRow(includeKind?7:6,"Tidak ada transaksi yang sesuai.");
    return list.map(t=>{
      const isIncome=t.kind==="income";
      return `<tr><td>${prettyDate(t.date)}</td>${includeKind?`<td><span class="badge ${isIncome?"income":"expense"}">${isIncome?"Pemasukan":"Pengeluaran"}</span></td>`:""}<td>${escapeHTML(transactionMember(t))}</td><td>${escapeHTML(transactionType(t))}</td><td>${escapeHTML(t.note||"—")}</td><td class="right ${isIncome?"positive":"negative"}">${isIncome?"+":"−"} ${money(t.amount)}</td><td><button class="action-btn danger" data-action="delete-transaction" data-id="${t.id}">Hapus</button></td></tr>`;
    }).join("");
  }
  function sortedTransactions(list=data.transactions){return [...list].sort((a,b)=>b.date.localeCompare(a.date)||(b.createdAt||"").localeCompare(a.createdAt||""));}
  function renderPaymentHistory(){
    const list=sortedTransactions(incomeTransactions());
    $("#paymentRows").innerHTML=list.length?list.map(t=>`<tr><td>${prettyDate(t.date)}</td><td>${escapeHTML(transactionMember(t))}</td><td>${escapeHTML(transactionType(t))}</td><td>${escapeHTML(t.note||"—")}</td><td class="right positive">${money(t.amount)}</td><td><button class="action-btn danger" data-action="delete-transaction" data-id="${t.id}">Hapus</button></td></tr>`).join(""):emptyRow(6,"Belum ada pembayaran yang dicatat.");
  }
  function renderExpenseHistory(){
    const list=sortedTransactions(data.transactions.filter(t=>t.kind==="expense"));
    $("#expenseRows").innerHTML=list.length?list.map(t=>`<tr><td>${prettyDate(t.date)}</td><td>${escapeHTML(t.category)}</td><td>${escapeHTML(t.note)}</td><td class="right negative">${money(t.amount)}</td><td><button class="action-btn danger" data-action="delete-transaction" data-id="${t.id}">Hapus</button></td></tr>`).join(""):emptyRow(5,"Belum ada pengeluaran yang dicatat.");
  }
  function deleteTransaction(id){
    const t=data.transactions.find(x=>x.id===id);if(!t)return;
    if(!confirm(`Hapus transaksi ${t.kind==="income"?"pemasukan":"pengeluaran"} sebesar ${money(t.amount)}?`))return;
    data.transactions=data.transactions.filter(x=>x.id!==id);saveData();renderAll();notify("Transaksi dihapus dan saldo diperbarui.");
  }
  function renderTransactionSearch(){
    const member=$("#filterMember").value,type=$("#filterType").value.trim().toLowerCase(),note=$("#filterNote").value.trim().toLowerCase(),from=$("#filterFrom").value,to=$("#filterTo").value,kind=$("#filterKind").value;
    const list=sortedTransactions(data.transactions.filter(t=>{
      const typeText=transactionType(t).toLowerCase(),noteText=(t.note||"").toLowerCase();
      return (!member||t.memberId===member)&&(!type||typeText.includes(type))&&(!note||noteText.includes(note))&&(!from||t.date>=from)&&(!to||t.date<=to)&&(!kind||t.kind===kind);
    }));
    $("#transactionRows").innerHTML=transactionRowsHTML(list,true);
    $("#filterSummary").textContent=`Menampilkan ${list.length} transaksi • Pemasukan ${money(totalFor(list,"income"))} • Pengeluaran ${money(totalFor(list,"expense"))}`;
  }
  ["filterMember","filterType","filterNote","filterFrom","filterTo","filterKind"].forEach(id=>$("#"+id).addEventListener("input",renderTransactionSearch));
  $("#clearFilters").addEventListener("click",()=>{
    ["filterMember","filterType","filterNote","filterFrom","filterTo","filterKind"].forEach(id=>$("#"+id).value="");
    renderTransactionSearch();
  });

  function renderDashboard(){
    const income=totalFor(data.transactions,"income"),expense=totalFor(data.transactions,"expense"),balance=income-expense;
    $("#dashIncome").textContent=money(income);$("#dashExpense").textContent=money(expense);$("#dashBalance").textContent=money(balance);$("#dashMembers").textContent=data.members.length;
    const key=monthKey(todayISO()),monthList=data.transactions.filter(t=>monthKey(t.date)===key),mi=totalFor(monthList,"income"),me=totalFor(monthList,"expense");
    $("#monthIncome").textContent=money(mi);$("#monthExpense").textContent=money(me);$("#monthNet").textContent=money(mi-me);
    const recent=sortedTransactions(data.transactions).slice(0,6);
    $("#recentRows").innerHTML=recent.length?recent.map(t=>`<tr><td>${prettyDate(t.date)}</td><td><span class="badge ${t.kind==="income"?"income":"expense"}">${t.kind==="income"?"Masuk":"Keluar"}</span></td><td>${escapeHTML(t.note||transactionType(t))}</td><td class="right ${t.kind==="income"?"positive":"negative"}">${t.kind==="income"?"+":"−"} ${money(t.amount)}</td></tr>`).join(""):emptyRow(4,"Belum ada transaksi. Mulai dengan mencatat pembayaran atau pengeluaran.");
  }
  function renderReports(){
    const from=$("#reportFrom").value,to=$("#reportTo").value;
    if(from&&to&&from>to){notify("Tanggal awal tidak boleh melewati tanggal akhir.");return;}
    const list=sortedTransactions(filteredByDates(data.transactions,from,to)),income=totalFor(list,"income"),expense=totalFor(list,"expense");
    $("#reportIncome").textContent=money(income);$("#reportExpense").textContent=money(expense);$("#reportNet").textContent=money(income-expense);
    const members=data.members.map(m=>{
      const tx=list.filter(t=>t.kind==="income"&&t.memberId===m.id);
      return {member:m,tx,total:tx.reduce((s,t)=>s+Number(t.amount),0)};
    }).filter(x=>x.tx.length>0||!from&&!to);
    $("#memberReportRows").innerHTML=members.length?members.map(x=>`<tr><td>${escapeHTML(x.member.name)}</td><td>${escapeHTML(x.member.number)}</td><td>${x.tx.length}</td><td class="right">${money(x.total)}</td></tr>`).join(""):emptyRow(4,"Tidak ada pembayaran anggota pada periode ini.");
    let running=0;
    const book=[...list].sort((a,b)=>a.date.localeCompare(b.date)||(a.createdAt||"").localeCompare(b.createdAt||""));
    $("#cashbookRows").innerHTML=book.length?book.map(t=>{
      running+=t.kind==="income"?Number(t.amount):-Number(t.amount);
      return `<tr><td>${prettyDate(t.date)}</td><td>${escapeHTML((t.kind==="income"?"Pembayaran — "+transactionMember(t)+" — ":"Pengeluaran — ")+transactionType(t)+(t.note?" / "+t.note:""))}</td><td class="positive">${t.kind==="income"?money(t.amount):"—"}</td><td class="negative">${t.kind==="expense"?money(t.amount):"—"}</td><td class="${running>=0?"positive":"negative"}">${money(running)}</td></tr>`;
    }).join(""):emptyRow(5,"Tidak ada transaksi pada periode ini.");
  }
  $("#applyReport").addEventListener("click",renderReports);
  $("#reportFrom").addEventListener("change",renderReports);$("#reportTo").addEventListener("change",renderReports);
  $("#printReport").addEventListener("click",()=>{navigate("reports");window.print();});

  document.addEventListener("click",e=>{
    const btn=e.target.closest("[data-action]");if(!btn)return;
    const {action,id}=btn.dataset;
    if(action==="edit-member")editMember(id);
    if(action==="delete-member")deleteMember(id);
    if(action==="edit-due")editDue(id);
    if(action==="delete-due")deleteDue(id);
    if(action==="delete-transaction")deleteTransaction(id);
  });
  function renderAll(){
    populateSelects();renderMembers();renderDues();renderPaymentHistory();renderExpenseHistory();renderTransactionSearch();renderDashboard();
    if($("#reports").classList.contains("active"))renderReports();
  }
  $("#today").textContent=new Intl.DateTimeFormat("id-ID",{weekday:"short",day:"numeric",month:"short",year:"numeric"}).format(new Date());
  $("#paymentDate").value=todayISO();$("#expenseDate").value=todayISO();
  renderAll();
})();