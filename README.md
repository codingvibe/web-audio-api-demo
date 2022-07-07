# Web Audio API Demo
This repo hosts a demo to show off some of the features of the [Javascript Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API). In it, you can open some audio of your choice (live streaming, remote files, or local files are all supported), and manipulate the audio with a few different features of the API including gain, reverb via convolution, high and low pass filters, and audio panning.

### Reverb
This particular impulse response was recorded at the Athénée théâtre Louis-Jouve in Paris, so when you listen to something with reverb and you close your eyes, rumor has it you can smell fresh baked bread.

### Ideas for future improvements:
- Add support for all possible filter nodes
  - DelayNode
  - IIRFilterNode
  - ChannelSplitterNode
  - ChannelMergerNode
  - DynamicsCompressorNode
  - WaveShaperNode (distortion)
  - All forms of the BiquadFilterNode (allpass, shelf, notch, peaking)
- Add support for other possible audio types
  - OscillatorNode input
  - ConstantSourceNode input
  - User media input (microphone or other input devices)
- Add Analyzers in to the mix to see audio differences before and after a filter is added
- Display time domain data for analyzers
- User controls for colors in analyzers
- Selectable impulse responses

### Attributions
The impulse response is from [Lieuxperdus's Théâtre Acoustique Room Impulse Response Library](https://www.lieuxperdus.com/convolver/download/), licensed under the Create Commons Attribution-NonCommercial 4.0 International license.