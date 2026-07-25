const textInput = document.getElementById('textInput');
const combinedResult = document.getElementById('combinedResult');
const fileIndicator = document.getElementById('fileIndicator');
const fileCountText = document.querySelector('.file-count-text');
const copyAllBtn = document.getElementById('copyAllBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const loading = document.getElementById('loading');
const algoCheckboxes = document.querySelectorAll('input[name="algo"]');
const customTip = document.getElementById('customTip');
let fileList = [];
let newFileCount = 0;
let tipTimer = null;
let hasFiles = false;
let hasText = false;

document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());

function showTip(msg) {
    clearTimeout(tipTimer);
    customTip.innerText = msg;
    customTip.classList.add('show');
    tipTimer = setTimeout(() => {
        customTip.classList.remove('show');
    }, 3000);
}

function getSelectedAlgos() {
    const selected = Array.from(algoCheckboxes).filter(box => box.checked).map(box => box.value);
    return selected.length > 0 ? selected : ['MD5', 'SHA-256', 'SHA-512'];
}

function calcHashValues(data, isText = true) {
    const algos = getSelectedAlgos();
    const results = [];
    const targetData = isText ? data : CryptoJS.lib.WordArray.create(data);
    algos.forEach(algo => {
        let hash = '';
        switch(algo) {
            case 'MD5': hash = CryptoJS.MD5(targetData).toString(); break;
            case 'SHA-1': hash = CryptoJS.SHA1(targetData).toString(); break;
            case 'SHA-256': hash = CryptoJS.SHA256(targetData).toString(); break;
            case 'SHA-384': hash = CryptoJS.SHA384(targetData).toString(); break;
            case 'SHA-512': hash = CryptoJS.SHA512(targetData).toString(); break;
            case 'SHA-3-224': hash = CryptoJS.SHA3(targetData, { outputLength: 224 }).toString(); break;
            case 'SHA-3-256': hash = CryptoJS.SHA3(targetData, { outputLength: 256 }).toString(); break;
            case 'SHA-3-384': hash = CryptoJS.SHA3(targetData, { outputLength: 384 }).toString(); break;
            case 'SHA-3-512': hash = CryptoJS.SHA3(targetData, { outputLength: 512 }).toString(); break;
            case 'RIPEMD-160': hash = CryptoJS.RIPEMD160(targetData).toString(); break;
            default: hash = `算法${algo}暂不支持`;
        }
        results.push({ algo, hash });
    });
    return results;
}

function createHashCard(algo, hash) {
    const card = document.createElement('div');
    card.className = 'hash-card';
    card.innerHTML = `
        <button class="copy-btn" data-hash="${hash}" aria-label="复制">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
                <rect x="4" y="4" width="9" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/>
                <rect x="2" y="2" width="9" height="9" rx="1" fill="currentColor" opacity="0.3"/>
            </svg>
        </button>
        <span class="hash-algo">${algo}:</span>
        <span class="hash-value" data-hash="${hash}">${hash}</span>
    `;
    return card;
}

function bindCopyButton(btn) {
    btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const hash = btn.dataset.hash;
        await navigator.clipboard.writeText(hash);
        btn.classList.add('copied');
        const card = btn.closest('.hash-card');
        const algo = card.querySelector('.hash-algo').textContent.replace(':', '');
        showTip(`已复制 ${algo} 哈希`);
        setTimeout(() => {
            btn.classList.remove('copied');
        }, 2000);
    });
}

function getTextSection() {
    return combinedResult.querySelector('.text-section');
}

function ensureTextSection() {
    let textSection = getTextSection();
    if (!textSection) {
        textSection = document.createElement('div');
        textSection.className = 'result-section text-section';
        
        const textHeader = document.createElement('div');
        textHeader.className = 'result-header';
        textHeader.innerHTML = '<span class="result-type">📝 文本哈希</span>';
        textSection.appendChild(textHeader);
        
        const firstChild = combinedResult.firstChild;
        if (firstChild && firstChild.classList && !firstChild.classList.contains('file-count')) {
            combinedResult.insertBefore(textSection, firstChild);
        } else {
            combinedResult.appendChild(textSection);
        }
    }
    return textSection;
}

function removeTextSection() {
    const textSection = getTextSection();
    if (textSection) {
        textSection.remove();
    }
}

function updateTextCards(textSection, results) {
    const existingCards = Array.from(textSection.querySelectorAll('.hash-card'));
    
    const resultMap = new Map(results.map(r => [r.algo, r.hash]));
    
    existingCards.forEach(card => {
        const algo = card.querySelector('.hash-algo').textContent.replace(':', '');
        if (resultMap.has(algo)) {
            const hashValue = card.querySelector('.hash-value');
            hashValue.textContent = resultMap.get(algo);
            hashValue.dataset.hash = resultMap.get(algo);
            const copyBtn = card.querySelector('.copy-btn');
            copyBtn.dataset.hash = resultMap.get(algo);
            resultMap.delete(algo);
        } else {
            card.remove();
        }
    });
    
    resultMap.forEach((hash, algo) => {
        const card = createHashCard(algo, hash);
        textSection.appendChild(card);
        bindCopyButton(card.querySelector('.copy-btn'));
        bindHashValueClick(card.querySelector('.hash-value'));
    });
}

function bindHashValueClick(hashValueEl) {
    hashValueEl.addEventListener('click', async (e) => {
        e.stopPropagation();
        const hash = hashValueEl.dataset.hash;
        await navigator.clipboard.writeText(hash);
        hashValueEl.classList.add('copied');
        const card = hashValueEl.closest('.hash-card');
        const algo = card.querySelector('.hash-algo').textContent.replace(':', '');
        showTip(`已复制 ${algo} 哈希`);
        setTimeout(() => {
            hashValueEl.classList.remove('copied');
        }, 2000);
    });
}

function calcTextHashRealTime() {
    const text = textInput.value.trim();
    hasText = !!text;
    
    if (hasText) {
        hasFiles = false;
        fileIndicator.classList.remove('show');
        
        const textSection = ensureTextSection();
        const results = calcHashValues(text, true);
        updateTextCards(textSection, results);
    } else {
        removeTextSection();
    }
    
    updateEmptyState();
}

function updateEmptyState() {
    const hasContent = combinedResult.querySelector('.result-section') || 
                       combinedResult.querySelector('.file-count');
    if (!hasContent) {
        combinedResult.innerHTML = '<div class="empty-tip">请输入文本或拖拽文件，生成哈希结果...</div>';
    }
}

textInput.addEventListener('input', calcTextHashRealTime);
algoCheckboxes.forEach(box => box.addEventListener('change', () => {
    if (hasText) calcTextHashRealTime();
    if (fileList.length > 0) calcFileHashAuto(true);
}));
calcTextHashRealTime();

textInput.addEventListener('keydown', () => {
    if (hasFiles) {
        hasFiles = false;
        fileIndicator.classList.remove('show');
    }
});

async function traverseFolder(entry, path = '') {
    const fullPath = path ? `${path}/${entry.name}` : entry.name;
    if (entry.isFile) {
        return new Promise(resolve => entry.file(file => {
            fileList.push({ path: fullPath, file });
            newFileCount++;
            resolve();
        }));
    }
    if (entry.isDirectory) {
        const reader = entry.createReader();
        return new Promise(resolve => {
            const readEntries = () => reader.readEntries(entries => {
                entries.length === 0 ? resolve() : Promise.all(entries.map(e => traverseFolder(e, fullPath))).then(readEntries);
            });
            readEntries();
        });
    }
}

async function calcSingleFileHash(fileObj) {
    const { path, file } = fileObj;
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const results = calcHashValues(e.target.result, false);
            resolve({ path, file, results });
        };
        reader.readAsArrayBuffer(file);
    });
}

async function calcFileHashAuto(forceRefresh = false) {
    if (!forceRefresh && (newFileCount === 0 || fileList.length === 0)) return;
    
    if (!forceRefresh) {
        loading.style.display = 'block';
    }
    
    const batchStart = forceRefresh ? 0 : fileList.length - newFileCount;
    const newFiles = fileList.slice(batchStart);

    if (!forceRefresh) {
        const fileCountEl = document.createElement('div');
        fileCountEl.className = 'file-count';
        fileCountEl.textContent = `新增 ${newFileCount} 个文件，累计 ${fileList.length} 个文件`;
        combinedResult.appendChild(fileCountEl);
    }

    for (const file of newFiles) {
        const { path, file: fileObj, results } = await calcSingleFileHash(file);
        
        let group;
        
        if (forceRefresh) {
            const existingGroups = combinedResult.querySelectorAll('.file-group');
            const existingGroup = Array.from(existingGroups).find(g => 
                g.querySelector('.file-name')?.textContent === fileObj.name &&
                g.querySelector('.file-info span:nth-child(2)')?.textContent === path
            );
            
            if (existingGroup) {
                group = existingGroup;
                updateTextCards(group, results);
                continue;
            }
        }
        
        group = document.createElement('div');
        group.className = 'file-group new-flash';
        
        const info = document.createElement('div');
        info.className = 'file-info';
        const displayPath = path && path !== fileObj.name ? path : '';
        info.innerHTML = `
            <div class="file-title-row">
                <span class="file-name">${fileObj.name}</span>
                <span class="file-size">${(fileObj.size / 1024).toFixed(2)} KB</span>
            </div>
            ${displayPath ? `<span class="file-path">${displayPath}</span>` : ''}
        `;
        group.appendChild(info);
        
        results.forEach(({ algo, hash }) => {
            const card = createHashCard(algo, hash);
            group.appendChild(card);
            bindCopyButton(card.querySelector('.copy-btn'));
        });
        
        const fileSection = document.createElement('div');
        fileSection.className = 'result-section';
        fileSection.appendChild(group);
        combinedResult.appendChild(fileSection);
    }
    
    if (!forceRefresh) {
        combinedResult.scrollTop = combinedResult.scrollHeight;
    }
    loading.style.display = 'none';
}

textInput.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    textInput.classList.add('drag-over');
});

textInput.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    textInput.classList.remove('drag-over');
});

textInput.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    textInput.classList.remove('drag-over');
    
    const items = e.dataTransfer.items;
    if (!items.length) return;
    
    textInput.value = '';
    hasFiles = true;
    
    newFileCount = 0;
    const tempList = [];
    for (const item of items) {
        const entry = item.webkitGetAsEntry();
        if (entry) tempList.push(traverseFolder(entry));
    }
    await Promise.all(tempList);
    await calcFileHashAuto();
    
    fileCountText.textContent = `${fileList.length} 个文件`;
    fileIndicator.classList.add('show');
});

textInput.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (items && items.length > 0) {
        for (const item of items) {
            if (item.type.startsWith('file/')) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
        }
    }
});

clearAllBtn.addEventListener('click', () => {
    textInput.value = '';
    fileList = [];
    newFileCount = 0;
    hasFiles = false;
    hasText = false;
    fileIndicator.classList.remove('show');
    combinedResult.innerHTML = '<div class="empty-tip">请输入文本或拖拽文件</div>';
});