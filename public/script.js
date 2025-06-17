const uploadBox = document.getElementById('uploadBox');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const startBtn = document.getElementById('startConversion');
const clearBtn = document.getElementById('clearQueue');
const fromFormat = document.getElementById('fromFormat');
const toFormat = document.getElementById('toFormat');

let files = [];

// Trigger file picker
uploadBox.addEventListener('click', () => fileInput.click());
uploadBox.addEventListener('dragover', (e) => e.preventDefault());
uploadBox.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', () => handleFiles(fileInput.files));

function handleDrop(e) {
  e.preventDefault();
  const items = e.dataTransfer.items;
  const filePromises = [];

  for (const item of items) {
    const entry = item.webkitGetAsEntry();
    if (entry) {
      filePromises.push(traverseFileTree(entry));
    }
  }

  Promise.all(filePromises).then(flatFiles => {
    flatFiles.flat().forEach(f => files.push(f));
    renderFiles();
  });
}

function traverseFileTree(item) {
  return new Promise(resolve => {
    if (item.isFile) {
      item.file(file => resolve([file]));
    } else if (item.isDirectory) {
      const dirReader = item.createReader();
      dirReader.readEntries(entries => {
        const promises = entries.map(e => traverseFileTree(e));
        Promise.all(promises).then(results => {
          resolve(results.flat());
        });
      });
    }
  });
}

function handleFiles(selectedFiles) {
  for (const file of selectedFiles) {
    files.push(file);
  }
  renderFiles();
}

function renderFiles() {
  fileList.innerHTML = '';
  files.forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'file-item';

    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);

    const name = document.createElement('span');
    name.textContent = file.name;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.className = 'remove';
    removeBtn.onclick = () => removeFile(index);

    item.appendChild(img);
    item.appendChild(name);
    item.appendChild(removeBtn);

    fileList.appendChild(item);
  });

  const show = files.length > 0;
  startBtn.style.display = show ? 'inline-block' : 'none';
  clearBtn.style.display = show ? 'inline-block' : 'none';

  // Hide upload box if files exist
  uploadBox.style.display = show ? 'none' : 'block';
}

function removeFile(index) {
  files.splice(index, 1);
  renderFiles();
}

function clearQueue() {
  files = [];
  renderFiles();
}

clearBtn.onclick = clearQueue;

// ✅ NEW: Batch ZIP conversion
startBtn.onclick = async () => {
  if (files.length === 0) return;

  const formData = new FormData();
  for (const file of files) {
    formData.append('batch', file);
  }
  formData.append('to', toFormat.value);

  const res = await fetch('/convert', {
    method: 'POST',
    body: formData
  });

  const blob = await res.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'converted_images.zip';
  link.click();
};

// ✅ Image host
function uploadSingle() {
  const file = document.getElementById('singleHostInput').files[0];
  const formData = new FormData();
  formData.append('single', file);
  fetch('/upload', { method: 'POST', body: formData })
    .then(res => res.json())
    .then(data => {
      document.getElementById('hostOutput').innerHTML =
        `<a href="${data.url}" target="_blank">${data.url}</a>`;
    });
}