const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
const startCaptureBtn = document.getElementById('start-capture');
const stopCaptureBtn = document.getElementById('stop-capture');
const visualizationStyle = document.getElementById('visualization-style');
const sensitivityControl = document.getElementById('sensitivity');
const barColorInput = document.getElementById('bar-color');
const audioFileInput = document.getElementById('audio-file');
let barColor = barColorInput.value;

let audioContext;
let analyser;
let source;
let stream;
let isCapturing = false;
let currentStyle = 'bars';
let sensitivity = 5;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

startCaptureBtn.addEventListener('click', startCapture);
stopCaptureBtn.addEventListener('click', stopCapture);
visualizationStyle.addEventListener('change', (e) => currentStyle = e.target.value);
sensitivityControl.addEventListener('input', (e) => sensitivity = e.target.value);
barColorInput.addEventListener('input', (e) => barColor = e.target.value);
audioFileInput.addEventListener('change', handleFileUpload);

window.addEventListener('load', startCapture);

async function startCapture() {
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    const audioStream = new MediaStream(stream.getAudioTracks());

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    source = audioContext.createMediaStreamSource(audioStream);

    source.connect(analyser);
    analyser.fftSize = 2048;

    startCaptureBtn.disabled = true;
    stopCaptureBtn.disabled = false;
    isCapturing = true;

    animate();
  } catch (error) {
    console.error('Error capturing audio:', error);
  }
}

function stopCapture() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
  startCaptureBtn.disabled = false;
  stopCaptureBtn.disabled = true;
  isCapturing = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const arrayBuffer = e.target.result;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioContext.decodeAudioData(arrayBuffer, (audioBuffer) => {
      const bufferSource = audioContext.createBufferSource();
      bufferSource.buffer = audioBuffer;

      analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;

      bufferSource.connect(analyser);
      analyser.connect(audioContext.destination);

      bufferSource.start();
      isCapturing = true;

      animate();
    });
  };

  reader.readAsArrayBuffer(file);
}

function animate() {
  if (!isCapturing) return;

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  analyser.getByteFrequencyData(dataArray);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (currentStyle === 'bars') {
    drawBars(dataArray);
  } else if (currentStyle === 'waveform') {
    drawWaveform(dataArray);
  } else if (currentStyle === 'circle') {
    drawCircle(dataArray);
  }

  requestAnimationFrame(animate);
}

function drawBars(dataArray) {
  const barWidth = (canvas.width) / (dataArray.length / 2);
  let barHeight;
  let x = (canvas.width - (barWidth * (dataArray.length / 2))) / 2;

  for (let i = 0; i < dataArray.length / 2; i++) {
    barHeight = dataArray[i] * sensitivity * 0.2;

    const gradientTop = ctx.createLinearGradient(0, canvas.height / 2, 0, canvas.height / 2 - barHeight);
    gradientTop.addColorStop(0, barColor);
    gradientTop.addColorStop(1, 'black');

    const gradientBottom = ctx.createLinearGradient(0, canvas.height / 2, 0, canvas.height / 2 + barHeight);
    gradientBottom.addColorStop(0, 'black');
    gradientBottom.addColorStop(1, barColor);

    ctx.fillStyle = gradientBottom;
    ctx.fillRect(x, canvas.height / 2, barWidth, barHeight);

    ctx.fillStyle = gradientTop;
    ctx.fillRect(x, canvas.height / 2 - barHeight, barWidth, barHeight);

    x += barWidth + 1;
  }
}

function drawWaveform(dataArray) {
  const waveWidth = (canvas.width) / dataArray.length;
  const centerX = canvas.width / 2;
  const amplitudeMultiplier = sensitivity * 0.1;

  const startX = centerX - (dataArray.length * waveWidth) / 2;
  let x = startX;

  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(x, canvas.height / 2);

  for (let i = 0; i < dataArray.length; i++) {
    const amplitude = dataArray[i] * amplitudeMultiplier;
    ctx.lineTo(x, canvas.height / 2 - amplitude);
    x += waveWidth + 1;
  }

  ctx.strokeStyle = barColor;
  ctx.stroke();
}

function drawCircle(dataArray) {
  const radius = Math.min(canvas.width, canvas.height) / 8;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const barCount = dataArray.length / 10;

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.strokeStyle = barColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  for (let i = 0; i < barCount; i++) {
    const angle = (i / barCount) * Math.PI * 2;
    const barHeight = dataArray[i] * sensitivity * 0.1;
    const x1 = centerX + Math.cos(angle) * radius;
    const y1 = centerY + Math.sin(angle) * radius;
    const x2 = centerX + Math.cos(angle) * (radius + barHeight);
    const y2 = centerY + Math.sin(angle) * (radius + barHeight);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = barColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
