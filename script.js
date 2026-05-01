let uploadedFile = null;

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const previewContainer = document.getElementById('previewContainer');
const imagePreview = document.getElementById('imagePreview');
const predictBtn = document.getElementById('predictBtn');
const resultContainer = document.getElementById('resultContainer');
const loadingSpinner = document.getElementById('loadingSpinner');
const resultHeader = document.getElementById('resultHeader');
const resultIcon = document.getElementById('resultIcon');
const resultText = document.getElementById('resultText');
const resultMessage = document.getElementById('resultMessage');
const confidenceBar = document.getElementById('confidenceBar');

// --- Event Listeners ---

// Open file dialog when clicking the upload area
uploadArea.addEventListener('click', () => fileInput.click());

// Drag and Drop listeners
uploadArea.addEventListener('dragover', handleDragOver);
uploadArea.addEventListener('dragleave', handleDragLeave);
uploadArea.addEventListener('drop', handleDrop);

// File input change listener
fileInput.addEventListener('change', handleFileSelect);

// Predict button listener
predictBtn.addEventListener('click', predictImage);

// --- Functions ---

function handleDragOver(e) {
  e.preventDefault();
  uploadArea.style.background = '#e9ecef';
  uploadArea.style.borderColor = '#218838';
}

function handleDragLeave(e) {
  e.preventDefault();
  uploadArea.style.background = 'white';
  uploadArea.style.borderColor = '#28a745';
}

function handleDrop(e) {
  e.preventDefault();
  uploadArea.style.background = 'white';
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    handleFile(file);
    // Reset input value so the same file can be re-selected if needed
    e.target.value = '';
  }
}

function handleFile(file) {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    showNotification(
      'Invalid file type! Please upload JPG, JPEG, PNG, or GIF.',
      'error',
    );
    return;
  }

  // Validate file size (16MB)
  if (file.size > 16 * 1024 * 1024) {
    showNotification('File too large! Maximum size is 16MB.', 'error');
    return;
  }

  uploadedFile = file;

  // Preview image logic
  const reader = new FileReader();

  // Define onload before calling readAsDataURL for better reliability
  reader.onload = function (e) {
    imagePreview.src = e.target.result;

    // UI Updates: Hide upload area, show preview
    uploadArea.style.display = 'none';
    previewContainer.style.display = 'block';
    resultContainer.style.display = 'none';
  };

  reader.onerror = function () {
    showNotification('Error reading file. Please try again.', 'error');
  };

  reader.readAsDataURL(file);
}

function clearImage() {
  uploadedFile = null;
  fileInput.value = '';
  uploadArea.style.display = 'block';
  previewContainer.style.display = 'none';
  resultContainer.style.display = 'none';
  imagePreview.src = '';
}

async function predictImage() {
  if (!uploadedFile) {
    showNotification('Please select an image first!', 'warning');
    return;
  }

  // Show loading UI
  loadingSpinner.style.display = 'block';
  predictBtn.disabled = true;

  const formData = new FormData();
  formData.append('file', uploadedFile);

  try {
    const response = await fetch('/predict', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (response.ok && data.success) {
      displayResult(data);
    } else {
      showNotification(data.error || 'Prediction failed!', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    showNotification(
      'An error occurred while processing. Please try again.',
      'error',
    );
  } finally {
    loadingSpinner.style.display = 'none';
    predictBtn.disabled = false;
  }
}

function displayResult(data) {
  // Set header color based on prediction
  const isHealthy = data.prediction === 'Healthy';
  const headerColor = isHealthy ? 'bg-success' : 'bg-danger';

  resultHeader.className = `card-header text-white rounded-top-4 ${headerColor}`;

  // Set icon and colors
  const colorCode = isHealthy ? '#28a745' : '#dc3545';

  resultIcon.className = `fas ${data.icon || (isHealthy ? 'fa-check-circle' : 'fa-exclamation-triangle')} result-icon`;
  resultIcon.style.color = colorCode;

  resultText.textContent = data.prediction;
  resultText.style.color = colorCode;

  resultMessage.textContent = data.message;

  // Update progress bar
  confidenceBar.style.width = `${data.confidence}%`;
  confidenceBar.textContent = `${data.confidence}% Confidence`;
  confidenceBar.className = `progress-bar progress-bar-striped progress-bar-animated ${isHealthy ? 'bg-success' : 'bg-danger'}`;

  // Show result container
  resultContainer.style.display = 'block';
  resultContainer.classList.add('fade-in');

  // Smooth scroll to result
  resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function resetApp() {
  clearImage();
  resultContainer.style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showNotification(message, type) {
  const notification = document.createElement('div');
  const alertType =
    type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'success';

  notification.className = `alert alert-${alertType} alert-dismissible fade show position-fixed`;
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.zIndex = '9999';
  notification.style.minWidth = '300px';

  notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (
    (e.key === 'r' || e.key === 'R') &&
    resultContainer.style.display === 'block'
  ) {
    resetApp();
  }

  if (e.key === 'Enter' && uploadedFile && !predictBtn.disabled) {
    predictImage();
  }
});
