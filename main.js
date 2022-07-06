const AudioContext = window.AudioContext || window.webkitAudioContext;

let nodes = [];
const audioCtx = new AudioContext();
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 2048;

let player;
let display;
let streamPath;
let filePath;
let sourceNode;
let reverbImpulse;
let canvas;

function generateRandomId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function useAudioStream() {
  audioCtx.resume();
  filePath.value = "";
  player.src = streamPath.value;
  player.play();
}

function useFileStream() {
  audioCtx.resume();
  streamPath.value = "";
  var file = filePath.files[0];
  var reader = new FileReader();
  
  if (filePath.files && file) {
      var reader = new FileReader();
      reader.onload = function (e) {
        player.src = e.target.result;
        player.play();
      }
      reader.readAsDataURL(file);
  }
}

function addNode(id, type) {
  nodes.push({
    "id": id,
    "type": type
  });
  processAudio();
}

function removeNode(id) {
  const node = document.getElementById(`${id}-container`)
  let index = -1;
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id == id) {
      index = i;
      break;
    }
  }
  if (index == -1 || !node) {
    console.error(`Couldn't remove node. Couldn't find id ${id}`);
    return;
  }
  node.remove();
  nodes.splice(index,1);
  processAudio();
}

async function setupWebAudio() {
  player = document.getElementById("player");
  display = document.getElementById("audioDemo");
  streamPath = document.getElementById("streamPath");
  filePath = document.getElementById("filePath");
  sourceNode = audioCtx.createMediaElementSource(player); 
  reverbImpulse = await getImpulseBuffer(audioCtx, "assets/impulse.wav");
  setUpVisualizer(analyser);
  processAudio();
}

function processAudio() {
  sourceNode.disconnect();
  let prevNode = {
    "outputNode": sourceNode
  }
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].filter) {
      nodes[i].filter.outputNode.disconnect();
      if (nodes[i].filter.inputNodes) {
        nodes[i].filter.inputNodes.forEach(node => prevNode.outputNode.connect(node));
      } else {
        prevNode.outputNode.connect(nodes[i].filter.outputNode);
      }
      prevNode = nodes[i].filter;
    } else {
      switch (nodes[i].type) {
        case "reverb":
          prevNode = createReverbNode(nodes[i].id, prevNode)
          break;
        case "gain":
          prevNode = createGainNode(nodes[i].id, prevNode);
          break;
        case "lpf":
          prevNode = createFilterNode(nodes[i].id, prevNode, "lowpass");
          break;
        case "hpf":
          prevNode = createFilterNode(nodes[i].id, prevNode, "highpass");
          break;
        case "pan":
          prevNode = createPanNode(nodes[i].id, prevNode);
          break;
        default:
          console.error(`Unknown filter type ${nodes[i].type}`)
          continue;
      }
      nodes[i].filter = prevNode;
    }
  }
  analyser.disconnect();
  prevNode.outputNode.connect(analyser);
  analyser.connect(audioCtx.destination);
}

function createReverbNode(id, prevNode) {
  const reverb = audioCtx.createConvolver();
  reverb.buffer = reverbImpulse;
  const dryGainNode = audioCtx.createGain();
  const wetGainNode = audioCtx.createGain();
  dryGainNode.gain.value = 0.5;
  wetGainNode.gain.value = 0.5;
  const reverbSlider = createSlider(id, "Reverb", 0, 1, 0.5, 0.01);
  reverbSlider.oninput = () => {
    dryGainNode.gain.value = 1 - reverbSlider.value;
    wetGainNode.gain.value = reverbSlider.value;
  }
  const exitGainNode = audioCtx.createGain();
  exitGainNode.gain.value = 1;
  prevNode.outputNode.connect(dryGainNode).connect(exitGainNode);
  prevNode.outputNode.connect(reverb).connect(wetGainNode).connect(exitGainNode);
  return {
    "inputNodes": [
      dryGainNode,
      reverb
    ],
    "outputNode": exitGainNode
  }
}

function createGainNode(id, prevNode) {
  const gainNode = audioCtx.createGain();
  const gainSlider = createSlider(id, "Gain", 0, 2, 1, 0.01);
  gainSlider.oninput = () => {
    gainNode.gain.value = gainSlider.value;
  }
  prevNode.outputNode.connect(gainNode)
  return {
    "outputNode": gainNode
  };
}

function createFilterNode(id, prevNode, type) {
  const filterNode = audioCtx.createBiquadFilter();
  const filterInfo = getFilterInfo(type);
  filterNode.frequency.value = filterInfo.defaultFrequency;
  filterNode.type = type;
  const filterSlider = createSlider(id, filterInfo.labelText, 0, 20000, filterInfo.defaultFrequency, 1);
  filterSlider.oninput = () => {
    filterNode.frequency.value = filterSlider.value;
  }
  prevNode.outputNode.connect(filterNode);
  return {
    "outputNode": filterNode
  };
}

function createPanNode(id, prevNode) {
  const panner = audioCtx.createStereoPanner();
  panner.pan.value = 0;
  const panSlider = createSlider(id, "Pan", -1, 1, 0, 0.01);
  panSlider.oninput = () => {
    panner.pan.value = panSlider.value;
  }
  prevNode.outputNode.connect(panner);
  return {
    "outputNode": panner
  };
}

function getFilterInfo(type) {
  switch (type) {
    case "lowpass":
      return {
        "labelText": "Low Pass Filter",
        "defaultFrequency": 20000
      }
    case "highpass":
      return {
        "labelText": "High Pass Filter",
        "defaultFrequency": 0
      };
  }
}

// Visualizer code from the Voice-Change-o-Matic example:
// https://github.com/mdn/voice-change-o-matic/blob/gh-pages/scripts/app.js#L123-L167
function setUpVisualizer(analyser) {
  canvas = document.getElementById("visualizer");
  canvas.width = window.innerWidth;
  canvas.height = Math.floor(window.innerHeight/4);
  const canvasCtx = canvas.getContext("2d");

  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const drawFrequency = () => {
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    drawVisual = requestAnimationFrame(drawFrequency);

    analyser.getByteFrequencyData(dataArray);

    canvasCtx.fillStyle = 'rgb(0, 0, 0)';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for(let i = 0; i < bufferLength; i++) {
      barHeight = Math.floor(canvas.height*dataArray[i]/255);

      canvasCtx.fillStyle = 'rgb(' + (barHeight+100) + ',50,50)';
      canvasCtx.fillRect(x,canvas.height-barHeight,barWidth,barHeight);

      x += barWidth + 1;
    }
  };

  drawFrequency();
}

async function getImpulseBuffer(audioCtx, impulseUrl) {
  if (reverbImpulse) {
    return reverbImpulse;
  }
  const response = await fetch(impulseUrl);
  const responseBuffer = await response.arrayBuffer();
  reverbImpulse = audioCtx.decodeAudioData(responseBuffer)
  return reverbImpulse;
}

function createSlider(id, labelText, min, max, currentValue, step) {
  const containerDiv = document.createElement("div");
  containerDiv.id = `${id}-container`;
  containerDiv.classList = ["node-control"];
  const slider = document.createElement("input");
  slider.id = id;
  slider.type = "range"
  slider.labelText = labelText;
  slider.min = min;
  slider.max = max;
  slider.step = step;
  const label = document.createElement("label");
  label.for = labelText;
  label.innerText = labelText;
  slider.value = currentValue;
  const closeButton = document.createElement("img");
  closeButton.src = "assets/close-button.svg";
  closeButton.onclick = () => {
    removeNode(id);
  };
  closeButton.classList = ["close-button"];
  containerDiv.appendChild(label);
  containerDiv.appendChild(slider);
  containerDiv.appendChild(closeButton);
  display.appendChild(containerDiv);
  return slider;
}

document.addEventListener("DOMContentLoaded", setupWebAudio);
window.onresize = () => {
  canvas.width = window.innerWidth;
  canvas.height = Math.floor(window.innerHeight/4);
};