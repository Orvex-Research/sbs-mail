const emailInputText = document.getElementById('email-address-text');
const copyBtn = document.getElementById('copy-btn');
const generateBtn = document.getElementById('generate-btn');
const mobileRefreshBtn = document.getElementById('mobile-refresh-btn');
const mobileGenerateBtn = document.getElementById('mobile-generate-btn');
const toast = document.getElementById('toast');
const customBtn = document.getElementById('custom-btn');
const privacyNotice = document.getElementById('privacy-notice');
const closePrivacyBtn = document.getElementById('close-privacy-btn');
const inboxContainer = document.getElementById('inbox-container');
const unreadCount = document.getElementById('unread-count');
const emailModal = document.getElementById('email-modal');
const closeEmailModalBtn = document.getElementById('close-email-modal');
const modalIframe = document.getElementById('modal-iframe');
const inputModal = document.getElementById('input-modal');
const closeInputModal = document.getElementById('close-input-modal');
const inputModalTitle = document.getElementById('input-modal-title');
const inputModalDesc = document.getElementById('input-modal-desc');
const inputModalIcon = document.getElementById('input-modal-icon');
const inputModalField = document.getElementById('input-modal-field');
const inputModalError = document.getElementById('input-modal-error');
const inputModalSubmit = document.getElementById('input-modal-submit');
const inputModalBtnText = document.getElementById('input-modal-btn-text');
const domainSelect = document.getElementById('domain-select');
const domainGenerateBtn = document.getElementById('domain-generate-btn');
const inputModalAt = document.getElementById('input-modal-at');
const loginNavBtn = document.getElementById('login-nav-btn');
const dashboardNavBtn = document.getElementById('dashboard-nav-btn');
const profileNavBtn = document.getElementById('profile-nav-btn');
const loginModal = document.getElementById('login-modal');
const authEmail = document.getElementById('auth-email');
const authPass = document.getElementById('auth-pass');
const authLoginBtn = document.getElementById('auth-login-btn');
const authSignupBtn = document.getElementById('auth-signup-btn');
const authError = document.getElementById('auth-error');
const authSuccess = document.getElementById('auth-success');
const downloadEmlBtn = document.getElementById('download-eml-btn');
const customDomainBtn = document.getElementById('custom-domain-btn');
const customDomainModal = document.getElementById('custom-domain-modal');
const closeCustomDomainModal = document.getElementById('close-custom-domain-modal');
const forwardingAddressCode = document.getElementById('forwarding-address');
const copyForwardBtn = document.getElementById('copy-forward-btn');
const startTrackingBtn = document.getElementById('start-tracking-btn');

let currentEmailsData = {};
let knownEmailIds = new Set();
let currentViewingEmailId = null;
let fetchTimer = null;

function generateRandomString(length) {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function getSavedEmail() {
    const saved = localStorage.getItem('temp_mail_address');
    if (saved && saved.includes('@bbinl.site')) {
        return saved;
    }
    const hash = window.location.hash.substring(1);
    if (hash && hash.includes('@bbinl.site')) {
        return hash;
    }
    return null;
}

function saveEmail(emailAddress) {
    localStorage.setItem('temp_mail_address', emailAddress);
    window.location.hash = emailAddress;
    addToHistory(emailAddress);
}

function addToHistory(email) {
    let history = JSON.parse(localStorage.getItem('temp_mail_history') || '[]');
    history = history.filter(e => e !== email);
    history.unshift(email);
    if (history.length > 15) history.pop();
    localStorage.setItem('temp_mail_history', JSON.stringify(history));
}

function generateNewEmail() {
    const randomName = generateRandomString(8);
    let domain = 'bbinl.site';
    if (domainSelect && domainSelect.options && domainSelect.options.length > 0) {
        const randomIndex = Math.floor(Math.random() * domainSelect.options.length);
        domain = domainSelect.options[randomIndex].value;
    }
    const newEmail = `${randomName}@${domain}`;
    emailInputText.textContent = newEmail;
    saveEmail(newEmail);
    knownEmailIds.clear();
    renderEmails([]);
    fetchEmails();
}

function initializeEmail() {
    const savedEmail = getSavedEmail();
    if (savedEmail) {
        emailInputText.textContent = savedEmail;
        window.history.replaceState(null, null, `#${savedEmail}`);
        fetchEmails();
    } else {
        generateNewEmail();
    }
}

window.addEventListener('hashchange', () => {
    const savedEmail = getSavedEmail();
    if (savedEmail && savedEmail !== emailInputText.textContent) {
        emailInputText.textContent = savedEmail;
        localStorage.setItem('temp_mail_address', savedEmail);
        knownEmailIds.clear();
        fetchEmails();
    }
});

function fetchEmails() {
    if (fetchTimer) clearTimeout(fetchTimer);

    const currentEmail = emailInputText.textContent;
    if (!currentEmail || currentEmail === "Loading...") {
        fetchTimer = setTimeout(fetchEmails, 1000);
        return;
    }

    fetch(`/api/get_emails?email=${encodeURIComponent(currentEmail)}`)
        .then(res => res.json())
        .then(async data => {
            if (data.error && data.error !== 'No email provided') {
                console.error("API Error:", data.error);
                return;
            }
            let emailsList = data.emails || [];

            // Enhanced snippet cleaning: use PostalMime for messy snippets
            for (let email of emailsList) {
                const messy = email.snippet && (
                    email.snippet.includes('--') ||
                    email.snippet.toLowerCase().includes('content-type:') ||
                    email.snippet.toLowerCase().includes('received:') ||
                    email.snippet.toLowerCase().includes('mime-version:') ||
                    email.snippet.includes('=20') ||
                    email.snippet.trim() === ""
                );

                if (messy && email.html) {
                    try {
                        let parser;
                        if (typeof PostalMime === 'function') {
                            parser = new PostalMime();
                        } else if (window.postalMime && typeof window.postalMime.parse === 'function') {
                            parser = window.postalMime;
                        } else if (window.postalMime && window.postalMime.default && typeof window.postalMime.default === 'function') {
                            parser = new window.postalMime.default();
                        }

                        if (parser) {
                            const parsed = await parser.parse(email.html);
                            let cleanText = parsed.text || "";
                            if (!cleanText && parsed.html) {
                                // Strip HTML tags if no text part
                                cleanText = parsed.html.replace(/<[^>]*>?/gm, '');
                            }
                            email.snippet = cleanText.substring(0, 150).replace(/\s+/g, " ").trim();
                        }
                    } catch (e) {
                        console.warn("Snippet parsing failed:", e);
                    }
                }

                // Final cleanup for any remaining snippet artifacts
                if (email.snippet) {
                    email.snippet = email.snippet
                        .replace(/=([0-9A-F]{2})/gi, (match, p1) => {
                            try { return String.fromCharCode(parseInt(p1, 16)); } catch (e) { return match; }
                        })
                        .replace(/=\r?\n/g, '')
                        .replace(/\s+/g, ' ')
                        .trim();
                }
            }

            emailsList.push(getWelcomeEmail(currentEmail));
            renderEmails(emailsList);
        })
        .catch(err => console.error("Fetch Error:", err))
        .finally(() => {
            if (fetchTimer) clearTimeout(fetchTimer);
            fetchTimer = setTimeout(fetchEmails, 5000);
        });
}

function renderEmails(emails) {
    currentEmailsData = {};
    if (emails.length === 0) {
        inboxContainer.innerHTML = `
            <div class="group bg-surface-container-lowest p-8 md:p-12 rounded-xl flex flex-col items-center justify-center text-center transition-all border-l-4 border-surface-dim opacity-70">
                <span class="material-symbols-outlined text-5xl md:text-6xl text-slate-300 mb-2 md:mb-4" data-icon="inbox">inbox</span>
                <h3 class="text-headline-sm md:text-xl font-bold text-on-surface">Inbox is empty</h3>
                <p class="text-xs md:text-sm text-on-surface-variant mt-2">Waiting for incoming packets...</p>
            </div>
        `;
        unreadCount.textContent = "0 Messages";
        return;
    }

    unreadCount.textContent = `${emails.length} Messages`;

    let html = '';
    let isFirstLoad = knownEmailIds.size === 0;
    let newArrived = false;

    emails.forEach((email) => {
        if (!knownEmailIds.has(email.id)) {
            knownEmailIds.add(email.id);
            if (!isFirstLoad && !email.isWelcome) {
                newArrived = true;
            }
        }
        currentEmailsData[email.id] = email;
        const fromName = email.from.split('<')[0].replace(/"/g, '').trim() || "Unknown";
        const initial = fromName.charAt(0).toUpperCase();

        let displayDate = email.date;
        try {
            const d = new Date(email.date);
            if (!isNaN(d.getTime())) {
                const now = new Date();
                if (d.toDateString() === now.toDateString()) {
                    displayDate = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } else {
                    displayDate = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                }
            }
        } catch (e) { }

        html += `
        <div onclick="openEmailModal('${email.id}')" class="bg-surface-container-low p-5 rounded-3xl flex gap-4 transition-all hover:bg-surface-container-highest border border-surface-dim cursor-pointer active:scale-[0.99] shadow-sm">
            <div class="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-sm md:text-lg shrink-0">
                ${initial}
            </div>
            <div class="overflow-hidden w-full">
                <div class="flex justify-between items-start mb-2">
                    <span class="font-label text-[10px] md:text-xs uppercase tracking-widest text-on-surface-variant font-bold truncate pr-2">${fromName}</span>
                    <div class="flex items-center gap-1 shrink-0">
                        ${email.attachments && email.attachments.length > 0 ? `<span class="material-symbols-outlined text-[14px] text-slate-400 mr-1" data-icon="attach_file">attach_file</span>` : ''}
                        <span class="font-label text-[10px] md:text-[11px] text-on-surface-variant">${displayDate}</span>
                    </div>
                </div>
                <h4 class="font-headline font-bold text-on-background text-[15px] md:text-lg mb-1 truncate">${email.subject}</h4>
                <p class="text-xs md:text-sm text-on-surface-variant truncate">${email.snippet}</p>
            </div>
        </div>
        `;
    });

    inboxContainer.innerHTML = html;

    if (newArrived) {
        playNotificationSound();
    }
}

window.openEmailModal = async function (id) {
    const email = currentEmailsData[id];
    if (!email) return;

    currentViewingEmailId = id;

    // Show initial values in modal
    document.getElementById('modal-subject').textContent = email.subject || "No Subject";
    document.getElementById('modal-from').textContent = email.from;
    document.getElementById('modal-date').textContent = email.date;

    if (email.isWelcome) {
        modalIframe.srcdoc = `<html><head><base target="_blank"><style>body{margin:0;font-family:sans-serif;}</style></head><body>${email.html}</body></html>`;
        document.getElementById('modal-attachments')?.classList.add('hidden');
        emailModal.classList.remove('hidden');
        setTimeout(() => {
            emailModal.classList.remove('opacity-0');
            emailModal.firstElementChild.classList.remove('scale-95');
        }, 10);
        return;
    }

    modalIframe.srcdoc = `<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;color:#666;background-color:#fff;">
        <div style="text-align:center;">
            <div style="border:3px solid #f3f3f3;border-top:3px solid #3b82f6;border-radius:50%;width:24px;height:24px;animation:spin 1s linear infinite;margin:0 auto 10px;"></div>
            Parsing email content...
        </div>
        <style>@keyframes spin {0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}</style>
    </div>`;

    try {
        // Defensive PostalMime check
        let parser;
        if (typeof PostalMime === 'function') {
            parser = new PostalMime();
        } else if (window.postalMime && typeof window.postalMime.parse === 'function') {
            parser = window.postalMime;
        } else if (window.postalMime && window.postalMime.default && typeof window.postalMime.default === 'function') {
            parser = new window.postalMime.default();
        } else {
            throw new Error("PostalMime library not loaded");
        }

        const parsedEmail = await parser.parse(email.html);

        document.getElementById('modal-subject').textContent = parsedEmail.subject || "(No Subject)";
        document.getElementById('modal-from').textContent = parsedEmail.from.address ? `${parsedEmail.from.name || ''} <${parsedEmail.from.address}>` : email.from;

        let finalHtml = parsedEmail.html || `<pre style="font-family: sans-serif; white-space: pre-wrap; padding: 1.5rem; margin: 0; font-size: 14px; color: #333; background: #fff;">${parsedEmail.text || ''}</pre>`;

        // Handle inline images (CIDs)
        if (parsedEmail.attachments && parsedEmail.attachments.length > 0) {
            parsedEmail.attachments.forEach(att => {
                if (att.contentId && att.contentId.length > 0) {
                    const contentType = att.contentType || att.mimeType || 'application/octet-stream';
                    const cid = att.contentId.replace(/[<>]/g, '');
                    // For v1.x, att.content might be an ArrayBuffer or a Uint8Array
                    let base64Data = "";
                    if (att.content instanceof Uint8Array || att.content instanceof ArrayBuffer) {
                        const bytes = new Uint8Array(att.content);
                        let binary = '';
                        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
                        base64Data = `data:${contentType};base64,${btoa(binary)}`;
                    } else if (typeof att.content === 'string') {
                        base64Data = `data:${contentType};base64,${att.content}`;
                    }

                    if (base64Data) {
                        finalHtml = finalHtml.split(`cid:${cid}`).join(base64Data);
                    }
                }
            });
        }

        // If even parsed text contains messy headers, strip them manually
        if (finalHtml.toLowerCase().includes('received:') && finalHtml.toLowerCase().includes('arc-seal:')) {
            const bodyStart = finalHtml.search(/\r?\n\r?\n/);
            if (bodyStart !== -1) {
                finalHtml = `<pre style="font-family: sans-serif; white-space: pre-wrap; padding: 1.5rem; margin: 0; font-size: 14px; color: #333; background: #fff;">${finalHtml.substring(bodyStart).trim()}</pre>`;
            }
        }

        // Add base target to links
        if (finalHtml.includes('<head>')) {
            finalHtml = finalHtml.replace('<head>', '<head><base target="_blank">');
        } else if (finalHtml.includes('<html>')) {
            finalHtml = finalHtml.replace('<html>', '<html><head><base target="_blank"></head>');
        } else {
            finalHtml = `<html><head><base target="_blank"><style>body{margin:0;font-family:sans-serif;}</style></head><body>${finalHtml}</body></html>`;
        }

        modalIframe.srcdoc = finalHtml;
        email.attachments = parsedEmail.attachments || [];
    } catch (e) {
        console.error("Parsing Error:", e);
        document.getElementById('modal-subject').textContent = email.subject || "No Subject";

        // Final fallback: manually strip headers from the raw content
        let cleanText = email.html;
        const bodyStart = cleanText.search(/\r?\n\r?\n/);
        if (bodyStart !== -1) {
            cleanText = cleanText.substring(bodyStart).trim();
        }

        modalIframe.srcdoc = `<html><head><style>body{margin:0;font-family:sans-serif;}</style></head><body><pre style="white-space: pre-wrap; padding: 1.5rem; margin: 0; font-size: 14px; color: #333;">${cleanText}</pre></body></html>`;
    }

    const attachmentsContainer = document.getElementById('modal-attachments');
    if (attachmentsContainer) {
        if (email.attachments && email.attachments.length > 0) {
            attachmentsContainer.classList.remove('hidden');
            let attHtml = '';
            email.attachments.forEach(att => {
                let sizeKb = Math.round(att.size / 1024);
                let base64 = "";
                if (att.content instanceof Uint8Array || att.content instanceof ArrayBuffer) {
                    const bytes = new Uint8Array(att.content);
                    let binary = '';
                    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
                    base64 = btoa(binary);
                } else if (typeof att.content === 'string') {
                    base64 = att.content;
                }

                const contentType = att.contentType || att.mimeType || 'application/octet-stream';
                if (base64) {
                    attHtml += `<a href="data:${contentType};base64,${base64}" download="${att.filename}" class="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm hover:shadow border border-slate-200 text-sm font-medium text-slate-700 cursor-pointer transition-all shrink-0"><span class="material-symbols-outlined text-primary text-[18px]">attach_file</span> <span class="truncate max-w-[150px] md:max-w-[250px]">${att.filename}</span> <span class="text-xs text-slate-400 font-normal">(${sizeKb}KB)</span></a>`;
                } else {
                    attHtml += `<div class="inline-flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 shrink-0"><span class="material-symbols-outlined text-[18px]">folder_off</span> <span class="truncate max-w-[150px] md:max-w-[250px]">${att.filename}</span> <span class="text-xs font-normal">(Too large)</span></div>`;
                }
            });
            attachmentsContainer.innerHTML = attHtml;
        } else {
            attachmentsContainer.classList.add('hidden');
            attachmentsContainer.innerHTML = '';
        }
    }

    emailModal.classList.remove('hidden');
    setTimeout(() => {
        emailModal.classList.remove('opacity-0');
        emailModal.firstElementChild.classList.remove('scale-95');
    }, 10);
};

closeEmailModalBtn.addEventListener('click', () => {
    emailModal.classList.add('opacity-0');
    emailModal.firstElementChild.classList.add('scale-95');
    setTimeout(() => emailModal.classList.add('hidden'), 300);
});

function openInputModal(type) {
    inputModalField.value = '';
    inputModalError.classList.add('hidden');

    const historySection = document.getElementById('modal-history-section');
    const historyList = document.getElementById('modal-history-list');

    if (type === 'custom') {
        inputModalTitle.textContent = 'Custom Alias';
        inputModalDesc.textContent = 'Create a personalized temporary email address.';
        inputModalIcon.textContent = 'edit_attributes';
        inputModalBtnText.textContent = 'Create Alias';
        if (historySection) historySection.classList.add('hidden');
        inputModalField.classList.remove('hidden');
        if (inputModalAt) inputModalAt.classList.remove('hidden');
        if (domainSelect) { domainSelect.classList.remove('w-full'); domainSelect.classList.add('w-1/2'); }
    } else if (type === 'domain') {
        inputModalTitle.textContent = 'Random Domain';
        inputModalDesc.textContent = 'Select a specific domain to generate a random email.';
        inputModalIcon.textContent = 'domain';
        inputModalBtnText.textContent = 'Generate Mail';
        if (historySection) historySection.classList.add('hidden');
        inputModalField.classList.add('hidden');
        if (inputModalAt) inputModalAt.classList.add('hidden');
        if (domainSelect) { domainSelect.classList.remove('w-1/2'); domainSelect.classList.add('w-full'); }
    } else if (type === 'recovery') {
        inputModalTitle.textContent = 'Recovery Vault';
        inputModalDesc.textContent = 'Enter a previously used alias or select from history.';
        inputModalIcon.textContent = 'security';
        inputModalBtnText.textContent = 'Recover Inbox';

        if (historySection && historyList) {
            historySection.classList.remove('hidden');
            let history = JSON.parse(localStorage.getItem('temp_mail_history') || '[]');
            if (history.length === 0) {
                historyList.innerHTML = '<p class="text-[11px] text-slate-400 italic">No history found on this device.</p>';
            } else {
                historyList.innerHTML = history.map(email => `
                    <button onclick="recoverFromHistory('${email}')" class="w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center justify-between group active:scale-[0.98] mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500/50 cursor-pointer">
                        <span class="text-sm font-medium transition-colors truncate pr-2">${email}</span>
                        <span class="material-symbols-outlined text-sm transition-colors">restore</span>
                    </button>
                `).join('');
            }
        }
    }

    inputModal.classList.remove('hidden');
    setTimeout(() => {
        inputModal.classList.remove('opacity-0');
        inputModal.firstElementChild.classList.remove('translate-y-full', 'md:scale-95');
    }, 10);
    setTimeout(() => inputModalField.focus(), 300);
}

window.recoverFromHistory = function (email) {
    emailInputText.textContent = email;
    saveEmail(email);
    knownEmailIds.clear();
    renderEmails([]);
    fetchEmails();
    closeInputModalHandler();
};

function closeInputModalHandler() {
    inputModal.classList.add('opacity-0');
    inputModal.firstElementChild.classList.add('translate-y-full', 'md:scale-95');
    setTimeout(() => inputModal.classList.add('hidden'), 300);
}

function submitInputModal() {
    let cleanAlias;
    if (!inputModalField.classList.contains('hidden')) {
        const alias = inputModalField.value.trim().toLowerCase();

        if (!alias) {
            inputModalError.textContent = "Please enter a username.";
            inputModalError.classList.remove('hidden');
            return;
        }

        cleanAlias = alias.replace(/[^a-z0-9_.-]/g, '');
        if (alias !== cleanAlias) {
            inputModalError.textContent = "Use only lowercase letters, numbers, and allowed characters (_ . -)";
            inputModalError.classList.remove('hidden');
            return;
        }
    } else {
        cleanAlias = generateRandomString(8);
    }

    const domain = domainSelect ? domainSelect.value : 'bbinl.site';
    const newEmail = `${cleanAlias}@${domain}`;
    emailInputText.textContent = newEmail;
    saveEmail(newEmail);
    knownEmailIds.clear();
    renderEmails([]);
    fetchEmails();

    closeInputModalHandler();
}

closeInputModal.addEventListener('click', closeInputModalHandler);
inputModalSubmit.addEventListener('click', submitInputModal);
inputModalField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitInputModal();
});

initializeEmail();

copyBtn.addEventListener('click', () => {
    const emailToCopy = emailInputText.textContent;
    navigator.clipboard.writeText(emailToCopy).then(() => {
        toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
        toast.classList.add('opacity-100', 'pointer-events-auto', 'translate-y-0');
        setTimeout(() => {
            toast.classList.remove('opacity-100', 'pointer-events-auto', 'translate-y-0');
            toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
        }, 3000);
    });
});

if (generateBtn) generateBtn.addEventListener('click', generateNewEmail);
if (mobileRefreshBtn) mobileRefreshBtn.addEventListener('click', generateNewEmail);
if (mobileGenerateBtn) mobileGenerateBtn.addEventListener('click', generateNewEmail);

const manualRefreshBtn = document.getElementById('manual-refresh-btn');
if (manualRefreshBtn) {
    manualRefreshBtn.addEventListener('click', () => {
        manualRefreshBtn.firstElementChild.classList.add('animate-spin');
        fetchEmails();
        setTimeout(() => manualRefreshBtn.firstElementChild.classList.remove('animate-spin'), 1000);
    });
}

if (customBtn) {
    customBtn.addEventListener('click', () => openInputModal('custom'));
}
if (domainGenerateBtn) {
    domainGenerateBtn.addEventListener('click', () => openInputModal('domain'));
}
document.querySelectorAll('.recovery-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        openInputModal('recovery');
    });
});

if (privacyNotice && closePrivacyBtn) {
    if (!localStorage.getItem('privacy_dismissed')) {
        privacyNotice.classList.remove('hidden');
    }
    closePrivacyBtn.addEventListener('click', () => {
        localStorage.setItem('privacy_dismissed', '1');
        privacyNotice.classList.add('opacity-0');
        setTimeout(() => privacyNotice.classList.add('hidden'), 300);
    });
}

// Custom Domain Logic
if (customDomainBtn) {
    customDomainBtn.addEventListener('click', () => {
        const randomAlias = generateRandomString(12);
        const domain = domainSelect ? domainSelect.value : 'bbinl.site';
        const forwardAddr = `${randomAlias}@${domain}`;
        forwardingAddressCode.textContent = forwardAddr;

        customDomainModal.classList.remove('hidden');
        setTimeout(() => {
            customDomainModal.classList.remove('opacity-0');
            customDomainModal.firstElementChild.classList.remove('scale-95');
        }, 10);
    });
}

const closeCustomDomainHandler = () => {
    customDomainModal.classList.add('opacity-0');
    customDomainModal.firstElementChild.classList.add('scale-95');
    setTimeout(() => customDomainModal.classList.add('hidden'), 300);
};

if (closeCustomDomainModal) closeCustomDomainModal.addEventListener('click', closeCustomDomainHandler);
if (startTrackingBtn) {
    startTrackingBtn.addEventListener('click', () => {
        const addr = forwardingAddressCode.textContent;
        emailInputText.textContent = addr;
        saveEmail(addr);
        knownEmailIds.clear();
        renderEmails([]);
        fetchEmails();
        closeCustomDomainHandler();
    });
}

if (copyForwardBtn) {
    copyForwardBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(forwardingAddressCode.textContent).then(() => {
            const originalIcon = copyForwardBtn.innerHTML;
            copyForwardBtn.innerHTML = '<span class="material-symbols-outlined text-sm">done</span>';
            setTimeout(() => copyForwardBtn.innerHTML = originalIcon, 2000);
        });
    });
}

// SaaS Features
if (profileNavBtn) {
    profileNavBtn.addEventListener('click', () => {
        if (localStorage.getItem('supabase_token')) {
            window.location.href = '/dashboard';
        } else {
            if (loginModal) {
                loginModal.classList.remove('hidden');
                if (authError) authError.classList.add('hidden');
                if (authSuccess) authSuccess.classList.add('hidden');
            }
        }
    });
}

function handleAuth(url) {
    const email = authEmail.value.trim();
    const password = authPass.value;
    authError.classList.add('hidden');
    authSuccess.classList.add('hidden');

    if (!email || !password) return authError.textContent = "Both fields rules", authError.classList.remove('hidden');

    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    }).then(res => res.json()).then(data => {
        if (data.error) {
            authError.textContent = data.error;
            authError.classList.remove('hidden');
        } else {
            localStorage.setItem('supabase_token', data.session);
            authSuccess.textContent = "Success! Redirecting...";
            authSuccess.classList.remove('hidden');
            setTimeout(() => window.location.href = '/dashboard', 1000);
        }
    }).catch(err => {
        authError.textContent = "Network Error!";
        authError.classList.remove('hidden');
    });
}

if (authLoginBtn) authLoginBtn.addEventListener('click', () => handleAuth('/api/auth/login'));
if (authSignupBtn) authSignupBtn.addEventListener('click', () => handleAuth('/api/auth/signup'));

// Fetch public and user-specific domains
const storedToken = localStorage.getItem('supabase_token');
const reqHeaders = storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {};

fetch('/api/domains/public', { headers: reqHeaders })
    .then(r => r.json())
    .then(domains => {
        if (domainSelect && domains.length > 0) {
            domainSelect.innerHTML = domains.map(d => `<option value="${d}">${d}</option>`).join('');
            if (domains.length > 1 && domainGenerateBtn) {
                domainGenerateBtn.classList.remove('hidden');
            }
        }
    });

// Premium Features Implementation

function getWelcomeEmail(emailAddress) {
    return {
        id: 'welcome-' + emailAddress,
        from: '"No Mail Premium" <hello@nomail.com>',
        subject: 'Welcome to your Secure Inbox! 🚀',
        date: new Date().toUTCString(),
        snippet: 'Your disposable email is ready to use. Protect your privacy easily...',
        html: `
            <div style="font-family: 'Inter', sans-serif; color: #334155; max-width: 580px; margin: 0 auto; padding: 20px; border-radius: 12px; background: #ffffff; border: 1px solid #e2e8f0; line-height: 1.4;">
                <h1 style="color: #2563eb; margin: 0 0 15px 0; font-size: 24px;">Welcome to No Mail!</h1>
                <p style="font-size: 15px; margin: 0 0 20px 0;">Your temporary email address <strong>${emailAddress}</strong> is now securely active and ready to receive packets.</p>
                <div style="background: #f8fafc; padding: 15px 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
                    <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 17px;">Why use No Mail?</h3>
                    <ul style="margin: 0; padding-left: 20px; color: #475569;">
                        <li style="margin-bottom: 8px;"><strong>Privacy First:</strong> Keep your real inbox clean from spam, bots, and phishing attempts.</li>
                        <li style="margin-bottom: 8px;"><strong>Zero Logs:</strong> Your incoming data is completely ephemeral and encrypted in transit.</li>
                        <li style="margin-bottom: 0;"><strong>Lightning Fast:</strong> Emails arrive in seconds without needing to hit refresh constantly.</li>
                    </ul>
                </div>
                <p style="font-size: 14px; color: #64748b; margin: 20px 0;">Try sending a test email to yourself from another tab to see it instantly appear!</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                <p style="font-size: 13px; color: #94a3b8; margin: 0;">Stay secure,<br><strong style="color: #64748b;">The No Mail Team</strong></p>
            </div>
        `,
        attachments: [],
        isWelcome: true
    };
}

function playNotificationSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        oscillator.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1); // A6
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.2);
    } catch (e) { console.error("Audio block", e); }
}

if (downloadEmlBtn) {
    downloadEmlBtn.addEventListener('click', () => {
        if (!currentViewingEmailId) return;
        const email = currentEmailsData[currentViewingEmailId];
        if (!email) return;

        let emlContent = `From: ${email.from}\r\n`;
        emlContent += `To: ${emailInputText.textContent}\r\n`;
        emlContent += `Subject: ${email.subject}\r\n`;
        emlContent += `Date: ${email.date}\r\n`;
        emlContent += `MIME-Version: 1.0\r\n`;
        emlContent += `Content-Type: text/html; charset=utf-8\r\n\r\n`;
        emlContent += email.html || email.snippet;

        const blob = new Blob([emlContent], { type: 'message/rfc822' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${email.subject.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'email'}.eml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}