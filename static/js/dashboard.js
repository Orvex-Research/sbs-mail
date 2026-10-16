const token = localStorage.getItem('supabase_token');

if (!token) {
    window.location.href = '/';
}

function loadDomains() {
    fetch('/api/domains', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        if (res.status === 401) {
            localStorage.removeItem('supabase_token');
            window.location.href = '/';
            return;
        }
        return res.json();
    })
    .then(data => {
        const tbody = document.getElementById('domains-list');
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-12 text-center text-slate-400 font-medium bg-slate-50">No domains integrated yet. Click "Add Domain" to get started.</td></tr>';
            return;
        }
        let html = '';
        data.forEach(d => {
            const date = new Date(d.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
            const badge = d.is_public ? '<span class="bg-green-100 text-green-700 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider border border-green-200">Public</span>' : '<span class="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider border border-slate-200">Private</span>';
            
            html += `
            <tr class="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                <td class="px-6 py-4">
                    <div class="font-bold text-slate-800 text-[15px]">${d.domain}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Cloudflare Router</div>
                </td>
                <td class="px-6 py-4">${badge}</td>
                <td class="px-6 py-4 text-right text-slate-400 text-xs font-medium">${date}</td>
                <td class="px-6 py-4 text-center">
                    <div class="flex items-center justify-center gap-2">
                        <button onclick="toggleVisibility('${d.id}', ${!d.is_public})" title="${d.is_public ? 'Make Private' : 'Make Public'}" class="text-slate-400 hover:text-primary transition-colors p-1 flex items-center justify-center">
                            <span class="material-symbols-outlined text-lg">${d.is_public ? 'visibility_off' : 'visibility'}</span>
                        </button>
                        <button onclick="deleteDomain('${d.id}')" title="Delete Domain" class="text-slate-400 hover:text-red-500 transition-colors p-1 flex items-center justify-center">
                            <span class="material-symbols-outlined text-lg">delete</span>
                        </button>
                    </div>
                </td>
            </tr>`;
        });
        tbody.innerHTML = html;
    })
    .catch(err => console.error(err));
}

document.getElementById('save-domain-btn').addEventListener('click', () => {
    const domain = document.getElementById('domain-input').value.trim();
    const is_public = document.getElementById('public-toggle').checked;
    const btn = document.getElementById('save-domain-btn');
    const errObj = document.getElementById('modal-error');
    
    if (!domain) {
        errObj.textContent = "Error: Domain name is required.";
        errObj.classList.remove('hidden');
        return;
    }
    
    btn.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">sync</span> Provisioning Node...`;
    
    fetch('/api/domains/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ domain, is_public })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            errObj.textContent = data.error;
            errObj.classList.remove('hidden');
            btn.innerHTML = `<span class="material-symbols-outlined text-sm">cloud_upload</span> Integrate Gateway`;
        } else {
            document.getElementById('add-modal').classList.add('hidden');
            document.getElementById('domain-input').value = '';
            errObj.classList.add('hidden');
            loadDomains();
        }
    })
    .catch(err => {
        errObj.textContent = "Network synchronization failure.";
        errObj.classList.remove('hidden');
        btn.innerHTML = `<span class="material-symbols-outlined text-sm">cloud_upload</span> Integrate Gateway`;
    });
});

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('supabase_token');
    window.location.href = '/';
});

window.deleteDomain = function(id) {
    if (!confirm("Are you sure you want to delete this domain setup? Visitors will no longer be able to use it.")) return;
    fetch(`/api/domains/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json()).then(() => loadDomains());
};

window.toggleVisibility = function(id, makePublic) {
    const act = makePublic ? "publicly expose" : "privatize";
    if (!confirm(`Are you sure you want to ${act} this domain?`)) return;
    fetch(`/api/domains/${id}/toggle_visibility`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ is_public: makePublic })
    }).then(res => res.json()).then(() => loadDomains());
};

loadDomains();
