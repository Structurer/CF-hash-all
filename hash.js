const textInput = document.getElementById('textInput');
const dragArea = document.getElementById('dragArea');
const textResult = document.getElementById('textResult');
const fileResult = document.getElementById('fileResult');
const copyAllBtn = document.getElementById('copyAllBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const loading = document.getElementById('loading');
const algoCheckboxes = document.querySelectorAll('input[name="algo"]');
const customTip = document.getElementById('customTip');
let fileList = [];
let newFileCount = 0;
let tipTimer = null;

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

function calcSingleHash(data, isText = true) {
    const algos = getSelectedAlgos();
    let hashResult = '';
    const targetData = isText ? data : CryptoJS.lib.WordArray.create(data);
    algos.forEach((algo, index) => {
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
        hashResult += `■ ${algo}:\n${hash}`;
        if (index !== algos.length - 1) hashResult += '\n';
    });
    return hashResult;
}

function calcTextHashRealTime() {
    const text = textInput.value.trim();
    if (!text) {
        textResult.value = '请输入文本，实时生成规整哈希结果...';
        return;
    }
    const result = `=============================\n${calcSingleHash(text, true)}`;
    textResult.value = result;
}
textInput.addEventListener('input', calcTextHashRealTime);
algoCheckboxes.forEach(box => box.addEventListener('change', calcTextHashRealTime));
calcTextHashRealTime();

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
            const hash = calcSingleHash(e.target.result, false);
            const result = `文件路径：${path}
文件名称：${file.name}
文件大小：${(file.size / 1024).toFixed(2)} KB
=============================
${hash}
=========================================\n`;
            resolve(result);
        };
        reader.readAsArrayBuffer(file);
    });
}

async function calcFileHashAuto() {
    if (newFileCount === 0 || fileList.length === 0) return;
    loading.style.display = 'block';
    const batchStart = fileList.length - newFileCount;
    const newFiles = fileList.slice(batchStart);

    let newResult = '';
    newResult += `✅ 新增${newFileCount}个文件，累计${fileList.length}个文件\n\n`;
    for (const file of newFiles) {
        newResult += await calcSingleFileHash(file);
    }
    fileResult.value += newResult;
    loading.style.display = 'none';
}

dragArea.addEventListener('dragover', (e) => { e.preventDefault(); dragArea.classList.add('active'); });
dragArea.addEventListener('dragleave', () => dragArea.classList.remove('active'));
dragArea.addEventListener('drop', async (e) => {
    e.preventDefault();
    dragArea.classList.remove('active');
    const items = e.dataTransfer.items;
    if (!items.length) return;
    newFileCount = 0;
    const tempList = [];
    for (const item of items) {
        const entry = item.webkitGetAsEntry();
        if (entry) tempList.push(traverseFolder(entry));
    }
    await Promise.all(tempList);
    await calcFileHashAuto();
});

copyAllBtn.addEventListener('click', async () => {
    const allResult = `=== 文本哈希结果 ===\n${textResult.value}\n\n=== 文件哈希结果 ===\n${fileResult.value}`;
    if (!allResult.trim()) return showTip('暂无结果可复制');
    await navigator.clipboard.writeText(allResult);
    showTip('已复制全部哈希结果');
});

clearAllBtn.addEventListener('click', () => {
    textInput.value = '';
    textResult.value = '请输入文本，实时生成规整哈希结果...';
    fileList = [];
    fileResult.value = '文件哈希结果将按拖拽顺序累加展示在这里...';
    newFileCount = 0;
    calcTextHashRealTime();
});

if (!fileResult.value.trim()) {
    fileResult.value = '文件哈希结果将按拖拽顺序累加展示在这里...';
}