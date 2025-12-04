// ============================================
// APPLICATION LOGIC OUTLINE
// Blockchain Document Verification System
// ============================================

// Global State Management
let currentRole = null;
let userAuthenticated = false;
let otpSent = false;
// Blockchain + Email + QR state
const ABI = [
        {
            "inputs": [],
            "stateMutability": "nonpayable",
            "type": "constructor"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "bytes32",
                    "name": "docHash",
                    "type": "bytes32"
                },
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "studentId",
                    "type": "string"
                },
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "docType",
                    "type": "string"
                }
            ],
            "name": "DocumentIssued",
            "type": "event"
        },
        {
            "inputs": [
                {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                }
            ],
            "name": "documents",
            "outputs": [
                { "internalType": "bytes32", "name": "docHash", "type": "bytes32" },
                { "internalType": "string", "name": "studentId", "type": "string" },
                { "internalType": "string", "name": "studentName", "type": "string" },
                { "internalType": "string", "name": "docType", "type": "string" },
                { "internalType": "string", "name": "courseName", "type": "string" },
                { "internalType": "string", "name": "docData", "type": "string" },
                { "internalType": "string", "name": "issuerName", "type": "string" },
                { "internalType": "uint256", "name": "issuedDate", "type": "uint256" },
                { "internalType": "bool", "name": "isValid", "type": "bool" }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [ { "internalType": "string", "name": "_studentId", "type": "string" } ],
            "name": "getStudentDocuments",
            "outputs": [ { "internalType": "bytes32[]", "name": "", "type": "bytes32[]" } ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                { "internalType": "bytes32", "name": "_docHash", "type": "bytes32" },
                { "internalType": "string", "name": "_studentId", "type": "string" },
                { "internalType": "string", "name": "_studentName", "type": "string" },
                { "internalType": "string", "name": "_docType", "type": "string" },
                { "internalType": "string", "name": "_courseName", "type": "string" },
                { "internalType": "string", "name": "_docData", "type": "string" },
                { "internalType": "string", "name": "_issuerName", "type": "string" }
            ],
            "name": "issueDocument",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        { "inputs": [], "name": "owner", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" },
        {
            "inputs": [ { "internalType": "bytes32", "name": "_docHash", "type": "bytes32" } ],
            "name": "verifyDocument",
            "outputs": [
                { "internalType": "bool", "name": "isValid", "type": "bool" },
                { "internalType": "string", "name": "studentName", "type": "string" },
                { "internalType": "string", "name": "docType", "type": "string" },
                { "internalType": "string", "name": "docData", "type": "string" },
                { "internalType": "string", "name": "issuerName", "type": "string" },
                { "internalType": "uint256", "name": "issuedDate", "type": "uint256" }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ];
let contract = null;
let provider = null;
let signer = null;

// ============================================
// NAVIGATION FUNCTIONS
// ============================================

/**
 * Navigate to selected user role section
 * @param {string} role - 'admin', 'hr', or 'user'
 */
function selectRole(role) {
    currentRole = role;
    document.getElementById('homepage').classList.remove('active');
    document.getElementById(role).classList.add('active');
}

/**
 * Return to homepage
 */
function goBack() {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    document.getElementById('homepage').classList.add('active');
    currentRole = null;
    resetAllForms();
}

/**
 * Reset all forms to initial state
 */
function resetAllForms() {
    document.getElementById('certificateForm').classList.add('hidden');
    document.getElementById('marksheetForm').classList.add('hidden');
    document.getElementById('legalForm').classList.add('hidden');
    document.getElementById('docTypeSelect').value = '';

    document.getElementById('verificationResult').classList.add('hidden');
    // email OTP UI
    const s1 = document.getElementById('emailOtpStep1');
    const s2 = document.getElementById('emailOtpStep2');
    if (s1) s1.classList.remove('hidden');
    if (s2) s2.classList.add('hidden');
    document.getElementById('portfolioView').classList.add('hidden');
}

// ============================================
// ADMIN SECTION - DOCUMENT ISSUANCE
// ============================================

/**
 * Display appropriate form based on document type selection
 * @param {string} type - 'certificate', 'marksheet', or 'legal'
 */
function showDocumentForm(type) {
    document.getElementById('certificateForm').classList.add('hidden');
    document.getElementById('marksheetForm').classList.add('hidden');
    document.getElementById('legalForm').classList.add('hidden');

    if (type === 'certificate') {
        document.getElementById('certificateForm').classList.remove('hidden');
    } else if (type === 'marksheet') {
        document.getElementById('marksheetForm').classList.remove('hidden');
    } else if (type === 'legal') {
        document.getElementById('legalForm').classList.remove('hidden');
    }
}

/**
 * Handle Certificate submission
 * @param {Event} e - Form submit event
 */
function handleCertificateSubmit(e) {
    e.preventDefault();
    const formData = {
        studentName: document.getElementById('cert_name').value,
        studentId: document.getElementById('cert_studentId').value,
        docType: 'Certificate',
        courseName: document.getElementById('cert_purpose').value,
        docData: document.getElementById('cert_type').value,
        issuerName: 'Axis College',
        studentEmail: document.getElementById('cert_email').value,
        file: document.getElementById('cert_upload').files[0]
    };

    // If blockchain not connected, warn
    if (!contract) {
        alert('Please connect your wallet first!');
        return;
    }

    (async () => {
        try {
            const dataString = JSON.stringify(formData);
            const hashBytes = ethers.utils.id(dataString);

            const submitBtn = e.target.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Issuing to Blockchain...';
            }

            const tx = await contract.issueDocument(
                hashBytes,
                formData.studentId,
                formData.studentName,
                formData.docType,
                formData.courseName,
                formData.docData,
                formData.issuerName
            );

            await tx.wait();

            showSuccessResult(hashBytes, formData.studentEmail);

            e.target.reset();
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Issue Certificate';
            }
        } catch (err) {
            console.error('Blockchain error:', err);
            alert('Failed to issue certificate: ' + (err && err.message ? err.message : err));
            const submitBtn = e.target.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Issue Certificate';
            }
        }
    })();
}

/**
 * Handle Marksheet submission with auto-calculation
 * @param {Event} e - Form submit event
 */
function handleMarksheetSubmit(e) {
    e.preventDefault();

    const formData = {
        studentName: document.getElementById('mark_name').value,
        standard: document.getElementById('mark_standard').value,
        studentId: document.getElementById('mark_studentId').value,
        fatherName: document.getElementById('mark_father').value,
        motherName: document.getElementById('mark_mother').value,
        maxTotal: document.getElementById('mark_maxTotal').value,
        subjects: [],
        totalObtained: document.getElementById('mark_totalObtained').value,
        percentage: document.getElementById('mark_percentage').value,
        grade: document.getElementById('mark_grade').value,
        email: document.getElementById('mark_email').value,
        mobile: document.getElementById('mark_mobile').value,
        file: document.getElementById('mark_upload').files[0],
    };

    for (let i = 1; i <= 6; i++) {
        const name = document.getElementById(`sub${i}_name`)?.value;
        if (name) {
            formData.subjects.push({
                name,
                maxMarks: document.getElementById(`sub${i}_max`).value,
                obtained: document.getElementById(`sub${i}_obtained`).value,
            });
        }
    }

    console.log('Marksheet Form Data:', formData);
    alert('Marksheet issued successfully! (Placeholder)');
}

/**
 * Calculate total marks and percentage for Marksheet
 */
function calculateTotal() {
    let total = 0;
    const maxTotal = parseFloat(document.getElementById('mark_maxTotal').value) || 0;

    for (let i = 1; i <= 6; i++) {
        const obtained = parseFloat(document.getElementById(`sub${i}_obtained`)?.value) || 0;
        total += obtained;
    }

    document.getElementById('mark_totalObtained').value = total;

    if (maxTotal > 0) {
        const percentage = ((total / maxTotal) * 100).toFixed(2);
        document.getElementById('mark_percentage').value = `${percentage}%`;
    }
}

/**
 * Handle Legal Document submission with Digilocker flow
 * @param {Event} e - Form submit event
 */
function handleLegalDocSubmit(e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('legal_name').value,
        docType: document.getElementById('legal_type').value,
        email: document.getElementById('legal_email').value,
        phone: document.getElementById('legal_phone').value,
        mobile: document.getElementById('legal_mobile').value,
        file: document.getElementById('legal_upload').files[0],
    };

    console.log('Legal Document Form Data:', formData);
    alert('Legal Document issued successfully! (Placeholder)');
}

/**
 * Simulate Digilocker verification
 */
function verifyDigilocker() {
    const phone = document.getElementById('legal_phone').value;
    const statusDiv = document.getElementById('digilockerStatus');

    if (!phone) {
        alert('Please enter a phone number first');
        return;
    }

    statusDiv.classList.remove('hidden');
    statusDiv.innerHTML = 'Checking Digilocker...';

    setTimeout(() => {
        const scenario = Math.random();
        if (scenario < 0.33) {
            statusDiv.innerHTML = '✓ Digilocker account verified';
        } else if (scenario < 0.66) {
            statusDiv.innerHTML = '⚠ Digilocker ID not found. Please verify via email or register.';
        } else {
            statusDiv.innerHTML = '⚠ Account not registered. Please register first, then verify.';
        }
    }, 1500);
}

// ============================================
// HR SECTION - DOCUMENT VERIFICATION
// ============================================

/**
 * Verify document using hash/QR code
 */
function verifyDocument() {
    const hash = document.getElementById('verifyHash').value;
    const termsChecked = document.getElementById('termsCheckbox').checked;
    const resultDiv = document.getElementById('verificationResult');

    if (!hash) {
        alert('Please enter a document hash');
        return;
    }

    if (!termsChecked) {
        alert('Please confirm the terms and conditions');
        return;
    }

    if (!contract) {
        alert('Please connect your wallet first!');
        return;
    }

    (async () => {
        try {
            resultDiv.classList.remove('hidden');
            resultDiv.innerHTML = '<p>Verifying on blockchain...</p>';

            const result = await contract.verifyDocument(hash);

            // Expect result to have isValid and other fields
            if (result && result.isValid) {
                resultDiv.innerHTML = `
                    <h3>✅ Verification Result</h3>
                    <p><strong>Status:</strong> Valid</p>
                    <p><strong>Student Name:</strong> ${result.studentName}</p>
                    <p><strong>Document Type:</strong> ${result.docType}</p>
                    <p><strong>Course/Purpose:</strong> ${result.docData}</p>
                    <p><strong>Issuer:</strong> ${result.issuerName}</p>
                    <p><strong>Issued Date:</strong> ${new Date(Number(result.issuedDate) * 1000).toLocaleDateString()}</p>
                `;
            } else {
                resultDiv.innerHTML = '<h3>❌ Document Not Found</h3><p>This document hash is not registered on the blockchain.</p>';
            }
        } catch (err) {
            console.error('Verification error:', err);
            alert('Verification failed: ' + (err && err.message ? err.message : err));
        }
    })();
}

// ============================================
// USER SECTION - PORTFOLIO WITH OTP
// ============================================

/**
 * Send OTP to user's phone
 */
function sendOTP() {
    const phone = document.getElementById('userPhone').value;

    if (!phone) {
        alert('Please enter your phone number');
        return;
    }

    console.log('Sending OTP to:', phone);

    setTimeout(() => {
        alert(`OTP sent to ${phone}`);
        document.getElementById('otpStep1').classList.add('hidden');
        document.getElementById('otpStep2').classList.remove('hidden');
        otpSent = true;
    }, 1000);
}

/**
 * Verify OTP and load user portfolio
 */
function verifyOTP() {
    const otp = document.getElementById('otpInput').value;

    if (!otp || otp.length !== 6) {
        alert('Please enter a valid 6-digit OTP');
        return;
    }

    console.log('Verifying OTP:', otp);

    setTimeout(() => {
        userAuthenticated = true;
        document.getElementById('otpStep2').classList.add('hidden');
        document.getElementById('portfolioView').classList.remove('hidden');
        loadUserDocuments();
    }, 1000);
}

/**
 * Load and display user's documents from blockchain
 */
function loadUserDocuments() {
    const documentsList = document.getElementById('documentsList');

    const mockDocuments = [
        { type: 'Certificate', name: 'Participation Certificate', date: '2024-01-15', hash: '0xabc123...' },
        { type: 'Marksheet', name: 'Grade 12 Marksheet', date: '2024-02-20', hash: '0xdef456...' },
    ];

    documentsList.innerHTML = mockDocuments.map(doc => `
        <div class="document-card">
            <h3>${doc.name}</h3>
            <p><strong>Type:</strong> ${doc.type}</p>
            <p><strong>Date:</strong> ${doc.date}</p>
            <p><strong>Hash:</strong> ${doc.hash}</p>
            <button class="submit-btn" onclick="copyHash('${doc.hash}')">Copy Hash</button>
        </div>
    `).join('');
}

/**
 * Copy hash to clipboard
 * @param {string} hash - Document hash
 */
function copyHash(hash) {
    navigator.clipboard.writeText(hash).then(() => {
        alert('Hash copied to clipboard!');
    });
}

// ============================================
// EVENT LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    const certForm = document.getElementById('certificateForm');
    if (certForm) {
        certForm.addEventListener('submit', handleCertificateSubmit);
    }

    const markForm = document.getElementById('marksheetForm');
    if (markForm) {
        markForm.addEventListener('submit', handleMarksheetSubmit);
    }

    const legalForm = document.getElementById('legalForm');
    if (legalForm) {
        legalForm.addEventListener('submit', handleLegalDocSubmit);
    }
});

// ============================================
// PLACEHOLDER FUNCTIONS FOR BLOCKCHAIN INTEGRATION
// ============================================

/**
 * Connect to MetaMask wallet
 * TODO: Implement wallet connection
 */
async function connectWallet() {
    if (!window.ethereum) {
        alert('MetaMask not detected. Please install MetaMask!');
        return;
    }

    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

        if (accounts && accounts.length > 0) {
            setCurrentAccount(accounts[0]);
        }

        const network = await provider.getNetwork();
        if (network.chainId !== 31337 && network.chainId !== 1337) {
            alert('Please switch MetaMask network to Localhost (Hardhat) or Ganache');
        }
    } catch (err) {
        console.error('Wallet connection failed', err);
        alert('Failed to connect wallet: ' + (err && err.message ? err.message : err));
    }
}

/**
 * Initialize Web3 provider
 * TODO: Implement Web3/Ethers.js initialization
 */
async function initializeProvider() {
    // If wallet already connected, initialize ethers provider and contract
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts && accounts.length > 0) {
                provider = new ethers.providers.Web3Provider(window.ethereum);
                signer = provider.getSigner();
                contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
                setCurrentAccount(accounts[0]);
            } else {
                updateWalletUI(null);
            }

            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts && accounts.length > 0) {
                    setCurrentAccount(accounts[0]);
                } else {
                    setCurrentAccount(null);
                }
            });

            window.ethereum.on('chainChanged', (chainId) => {
                // Refresh UI on chain change
                console.log('chainChanged', chainId);
                updateWalletUI(null);
            });
        } catch (err) {
            console.error('Provider init failed', err);
        }
    } else {
        updateWalletUI(null);
    }
}

/**
 * Issue document to blockchain
 * TODO: Implement smart contract interaction
 */
async function issueToBlockchain(documentData) {
    if (!contract) throw new Error('Wallet not connected');
    const dataString = JSON.stringify(documentData);
    const hashBytes = ethers.utils.id(dataString);
    const tx = await contract.issueDocument(
        hashBytes,
        documentData.studentId,
        documentData.studentName,
        documentData.docType,
        documentData.courseName,
        documentData.docData,
        documentData.issuerName
    );
    await tx.wait();
    return hashBytes;
}

// Disconnect wallet
async function disconnectWallet() {
    currentAccount = null;
    contract = null;
    provider = null;
    signer = null;
    updateWalletUI(null);
    alert('Wallet disconnected');
}

// Display success overlay and QR
function showSuccessResult(hash, email) {
    const resultDiv = document.getElementById('adminResult');
    const hashDisplay = document.getElementById('generatedHash');
    const emailStatus = document.getElementById('emailStatus');

    hashDisplay.textContent = hash;

    document.getElementById('qrcode').innerHTML = '';
    new QRCode(document.getElementById('qrcode'), {
        text: hash,
        width: 200,
        height: 200
    });

    resultDiv.classList.remove('hidden');
    emailStatus.textContent = `📧 Document details sent to ${email}`;
}

function closeAdminResult() {
    const resultDiv = document.getElementById('adminResult');
    if (resultDiv) resultDiv.classList.add('hidden');
}

function copyGeneratedHash() {
    const el = document.getElementById('generatedHash');
    if (!el) return;
    const hash = el.textContent;
    navigator.clipboard.writeText(hash);
    alert('Hash copied to clipboard!');
}

function downloadQR() {
    const qrCanvas = document.querySelector('#qrcode canvas');
    if (!qrCanvas) { alert('QR not found'); return; }
    const url = qrCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'document-qr.png';
    link.href = url;
    link.click();
}

// QR scanning from uploaded image
function scanQRCode(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
                document.getElementById('verifyHash').value = code.data;
                alert('QR Code scanned successfully!');
            } else {
                alert('No QR code found in image');
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Email OTP functions using EmailJS
function sendEmailOTP() {
    const email = document.getElementById('userEmail').value;
    if (!email) { alert('Enter email'); return; }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    sessionStorage.setItem('emailOTP', otp);
    // Initialize EmailJS (replace PUBLIC_KEY below)
    try { emailjs.init('YOUR_EMAILJS_PUBLIC_KEY'); } catch (e) {}
    emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', {
        to_email: email,
        otp_code: otp,
        message: `Your OTP for document verification is: ${otp}`
    }).then(() => {
        alert('OTP sent to your email');
        document.getElementById('emailOtpStep1').classList.add('hidden');
        document.getElementById('emailOtpStep2').classList.remove('hidden');
    }).catch(err => {
        console.error('EmailJS error', err);
        alert('Failed to send OTP via email');
    });
}

function verifyEmailOTP() {
    const enteredOTP = document.getElementById('emailOtpInput').value;
    const storedOTP = sessionStorage.getItem('emailOTP');
    if (enteredOTP === storedOTP) {
        document.getElementById('emailOtpStep2').classList.add('hidden');
        document.getElementById('portfolioView').classList.remove('hidden');
        loadUserDocuments();
    } else {
        alert('Invalid OTP');
    }
}

// Helper to convert file to base64 (for future IPFS/upload integrations)
function convertFileToBase64(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });
}

// Load user documents from contract
async function loadUserDocuments() {
    if (!contract) { alert('Please connect wallet first!'); return; }
    const studentId = document.getElementById('userEmail')?.value || '';
    try {
        const hashes = await contract.getStudentDocuments(studentId);
        const documentsList = document.getElementById('documentsList');
        if (!hashes || hashes.length === 0) {
            documentsList.innerHTML = '<p>No documents found for this student ID.</p>';
            return;
        }
        let html = '';
        for (const hash of hashes) {
            const doc = await contract.verifyDocument(hash);
            html += `
                <div class="document-card">
                    <h3>${doc.docType}</h3>
                    <p><strong>Student:</strong> ${doc.studentName}</p>
                    <p><strong>Course:</strong> ${doc.docData}</p>
                    <p><strong>Date:</strong> ${new Date(Number(doc.issuedDate) * 1000).toLocaleDateString()}</p>
                    <p><strong>Hash:</strong> ${String(hash).slice(0, 20)}...</p>
                    <button class="submit-btn" onclick="copyHash('${hash}')">Copy Full Hash</button>
                </div>
            `;
        }
        documentsList.innerHTML = html;
    } catch (err) {
        console.error('Failed to load documents:', err);
        alert('Failed to load documents: ' + (err && err.message ? err.message : err));
    }
}

// ============================================
// Wallet UI helpers
// ============================================
let currentAccount = null;

function setCurrentAccount(address) {
    currentAccount = address;
    updateWalletUI(address);
}

function updateWalletUI(address) {
    const btn = document.getElementById('walletButton');
    const status = document.getElementById('walletStatus');

    if (!btn || !status) return;

    if (address) {
        const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
        btn.textContent = 'Connected';
        btn.classList.add('connected');
        status.textContent = `Account: ${short}`;
    } else {
        btn.textContent = 'Connect Wallet';
        btn.classList.remove('connected');
        status.textContent = window.ethereum ? 'Not connected' : 'No wallet detected';
    }
}

// Bind wallet button on load
document.addEventListener('DOMContentLoaded', function () {
    const walletBtn = document.getElementById('walletButton');
    if (walletBtn) {
        walletBtn.addEventListener('click', connectWallet);
    }

    // initialize provider and reflect any existing connection
    initializeProvider();
});

