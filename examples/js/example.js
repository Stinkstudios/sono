(function() {
  'use strict';

  var sono = window.sono;
  var ui = window.ui;

  sono.log();

  var info = document.querySelector('[data-js="info"]');
  info.innerHTML = '<li>Audio support: ' + sono.isSupported + '</li>' +
             '<li>Web Audio support: ' + sono.hasWebAudio + '</li>' +
             '<li>Touch locked (mobile): ' + sono.isTouchLocked + '</li>' +
             '<li>Supported extensions: ' + sono.extensions.join(', ') + '</li>';

  var baseURL = 'https://dl.dropboxusercontent.com/u/15470024/prototypes/audio/';

  var sound,
      panner,
      analyser,
      distortion,
      echo,
      flanger,
      highpass,
      lowshelf,
      reverb,
      waveformsExample,
      player,
      playerTop;

  sound = sono.createSound({
    src: [
      baseURL + 'dnb-loop-3.ogg',
      baseURL + 'dnb-loop-3.mp3'
    ],
    loop: true
  });

  panner = sono.effect.panner();

  distortion = sono.effect.distortion(0);

  echo = sono.effect.echo({
    delayTime: 0,
    feedback: 0.2
  });

  flanger = sono.effect.flanger({stereo: true});
  sono.effect.remove(flanger);

  highpass = sono.effect.highpass(20);

  lowshelf = sono.effect.lowshelf(80, 0);

  reverb = sono.effect.reverb({
    time: 0,
    decay: 2
  });

  analyser = sono.effect.analyser({
    fftSize: 1024,
    smoothingTimeConstant: 0.7,
    float: true
  });

  waveformsExample = createWaveformsExample();

  /*
   * players
   */

  playerTop = ui.createPlayer({
    el: document.querySelector('[data-js="playerTop"]'),
    sound: sound,
    analyser: analyser
  });

  player = ui.createPlayer({
    el: document.querySelector('[data-js="player"]'),
    sound: sound,
    analyser: analyser
  });

  /*
   * show minimized player
   */

  window.addEventListener('scroll', function() {
    var scrollTop = document.documentElement.scrollTop || document.body.scrollTop || window.pageYOffset || 0;
    var threshold = Math.max(400, Math.min(600, window.innerWidth));
    var isScrolledDown = scrollTop > threshold;
    playerTop.el.classList.toggle('is-active', isScrolledDown);
    player.el.classList.toggle('is-active', !isScrolledDown);
  });

  /*
   * controls
   */

  ui.createControl({
    el: document.querySelector('[data-js="volume"]'),
    name: 'Volume',
    min: 0,
    max: 1,
    value: 1
  }, function(value) {
    sound.volume = value;
  });

  ui.createControl({
    el: document.querySelector('[data-js="pan"]'),
    name: 'Pan',
    min: -1,
    max: 1,
    value: 0
  }, function(value) {
    panner.set(value);
  });

  ui.createControl({
    el: document.querySelector('[data-js="rate"]'),
    name: 'Rate',
    min: 0,
    max: 4,
    value: 1
  }, function(value) {
    sound.playbackRate = value;
  });

  ui.createToggle({
    el: document.querySelector('[data-js="loop"]'),
    name: 'Loop',
    value: sound.loop
  }, function(value) {
    console.log('toggle loop:', value);
    sound.loop = value;
  });

  ui.createToggle({
    el: document.querySelector('[data-js="reverse"]'),
    name: 'Reverse',
    value: false
  }, function() {
    sono.utils.reverseBuffer(sound.data);
  });

  /*
   * echo
   */

  ui.createControl({
    el: document.querySelector('[data-js="echoDelay"]'),
    name: 'Delay',
    min: 0,
    max: 10,
    value: 0
  }, function(value) {
    echo.delay = value;
  });

  ui.createControl({
    el: document.querySelector('[data-js="echoFeedback"]'),
    name: 'Feedback',
    min: 0.1,
    max: 10,
    value: 0.1
  }, function(value) {
    echo.feedback = value;
  });

  /*
   * distortion
   */

  ui.createToggle({
    el: document.querySelector('[data-js="distortionToggle"]'),
    name: 'Active',
    value: true
  }, function(value) {
    sono.effect.toggle(distortion, value);
  });

  ui.createControl({
    el: document.querySelector('[data-js="distortion"]'),
    name: 'Amount',
    min: 0,
    max: 2,
    value: 0
  }, function(value) {
    distortion.amount = value;
  });

  /*
   * waveforms
   */

   function createWaveformsExample() {

     var analyser = sono.effect.analyser({
       fftSize: 256,
       smoothingTimeConstant: 0.7
     }),
     waveformers = [],
     el = document.querySelector('[data-js="waveforms"]'),
     canvas = el.querySelector('canvas'),
     context = canvas.getContext('2d'),
     examples = [
       {
         x: 0,
         y: 0,
         width: 250,
         height: 250,
         shape: 'circular',
         style: 'fill',
         lineWidth: 1.5,
         waveform: analyser.getFrequencies(false),
         color: function(position, length) {
           var hue = (position / length) * 360;
           return 'hsl(' + hue + ', 100%, 40%)';
         },
         transform: function(value) {
           return 0.4 + value / 256 * 0.4;
         }
       },
       {
         x: 250,
         y: 0,
         width: 250,
         height: 250,
         style: 'line',
         lineWidth: 1,
         waveform: analyser.getWaveform(false),
         color: function(position, length) {
           var hue = (position / length) * 360;
           return 'hsl(' + hue + ', 100%, 40%)';
         },
         transform: function(value) {
           return value / 256;
         }
       },
       {
         x: 0,
         y: 250,
         width: 250,
         height: 250,
         shape: 'circular',
         style: 'line',
         lineWidth: 1.5,
         sound: sound,
         color: 'black'
       },
       {
         x: 250,
         y: 350,
         width: 250,
         height: 100,
         style: 'line',
         lineWidth: 4,
         sound: sound,
         color: function(position, length) {
           var hue = (position / length) * 360;
           return 'hsl(' + hue + ', 100%, 40%)';
         },
         transform: function(value) {
           return value;
         }
       }
     ];

     examples.forEach(function(example) {
       example.context = context;
       waveformers.push(sono.utils.waveformer(example));
     });

     return function() {
       analyser.getFrequencies();
       analyser.getWaveform();
       waveformers.forEach(function(waveformer) {
         waveformer();
       });
     };
   }

   /*
    * reverb
    */

   ui.createToggle({
     el: document.querySelector('[data-js="reverbToggle"]'),
     name: 'Active',
     value: true
   }, function(value) {
     sono.effect.toggle(reverb, value);
   });

   ui.createControl({
     el: document.querySelector('[data-js="reverbTime"]'),
     name: 'Time',
     min: 0,
     max: 5,
     value: reverb.time
   }, function(value) {
     reverb.time = value;
   });

   ui.createControl({
     el: document.querySelector('[data-js="reverbDecay"]'),
     name: 'Decay',
     min: 0,
     max: 10,
     value: reverb.decay
   }, function(value) {
     reverb.decay = value;
   });

   ui.createToggle({
     el: document.querySelector('[data-js="reverbReverse"]'),
     name: 'reverse',
     value: false
   }, function(value) {
     reverb.reverse = value;
   });

   /*
    * flanger
    */

   ui.createToggle({
     el: document.querySelector('[data-js="flangerToggle"]'),
     name: 'Active',
     value: false
   }, function(value) {
     sono.effect.toggle(flanger, value);
   });

   ui.createControl({
     el: document.querySelector('[data-js="flangerDelay"]'),
     name: 'Delay',
     min: 0.005,
     max: 0.05,
     value: flanger.delay
   }, function(value) {
     flanger.delay = value;
   });

   ui.createControl({
     el: document.querySelector('[data-js="flangerLFOGain"]'),
     name: 'LFO Gain',
     min: 0.0005,
     max: 0.005,
     value: flanger.lfoGain
   }, function(value) {
     flanger.lfoGain = value;
   });

   ui.createControl({
     el: document.querySelector('[data-js="flangerLFOFrequency"]'),
     name: 'LFO Frequency',
     min: 0.05,
     max: 5.0,
     value: flanger.lfoFrequency
   }, function(value) {
     flanger.lfoFrequency = value;
   });

   ui.createControl({
     el: document.querySelector('[data-js="flangerFeedback"]'),
     name: 'Feedback',
     min: 0.0,
     max: 0.9,
     value: flanger.feedback
   }, function(value) {
     flanger.feedback = value;
   });

   /*
    * fade
    */

   var fadeTime = 1;

   ui.createToggle({
     el: document.querySelector('[data-js="fadeToggle"]'),
     name: 'Toggle',
     value: false
   }, function(value) {
     sono.fade(value ? 0 : 1, fadeTime);
   });

   ui.createControl({
     el: document.querySelector('[data-js="fadeTime"]'),
     name: 'Time',
     min: 0,
     max: 10,
     value: fadeTime
   }, function(value) {
     fadeTime = value;
   });

   /*
    * highpass filter
    */

   ui.createControl({
     el: document.querySelector('[data-js="highpassFrequency"]'),
     name: 'Frequency',
     min: 20,
     max: sono.context.sampleRate / 2,
     value: 20,
     places: 0
   }, function(value) {
     highpass.frequency.value = value;
   });

   ui.createControl({
     el: document.querySelector('[data-js="highpassQ"]'),
     name: 'Peak',
     min: 0.0001,
     max: 40,
     value: highpass.Q.value
   }, function(value) {
     highpass.Q.value = value;
   });

   ui.createControl({
     el: document.querySelector('[data-js="highpassDetune"]'),
     name: 'Detune',
     min: -1000,
     max: 1000,
     places: 2,
     value: highpass.detune.value
   }, function(value) {
     highpass.detune.value = value;
   });

   /*
    * lowshelf filter
    */

   ui.createControl({
     el: document.querySelector('[data-js="lowshelfFrequency"]'),
     name: 'Frequency',
     min: 20,
     max: sono.context.sampleRate / 2,
     value: 80,
     places: 0
   }, function(value) {
     lowshelf.frequency.value = value;
   });

   ui.createControl({
     el: document.querySelector('[data-js="lowshelfGain"]'),
     name: 'Peak',
     min: -40,
     max: 40,
     value: lowshelf.gain.value
   }, function(value) {
     lowshelf.gain.value = value;
   });

   ui.createControl({
     el: document.querySelector('[data-js="lowshelfDetune"]'),
     name: 'Detune',
     min: -1000,
     max: 1000,
     value: lowshelf.detune.value
   }, function(value) {
     lowshelf.detune.value = value;
   });

   /*
    * update
    */

   function update() {
     window.requestAnimationFrame(update);
     if(sound.playing) {
       player();
       playerTop();
       waveformsExample();
     }
   }
   update();

}());
