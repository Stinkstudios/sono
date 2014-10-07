'use strict';

function Flanger(context) {
    var feedbackGain = 0.5,
        delayTime = 0.005,
        lfoGain = 0.002,
        lfoFreq = 0.25;

    // 5-25ms delay (0.005 > 0.025)
    var delay = context.createDelay();
    delay.delayTime.value = 0.005;
    
    var input = context.createGain();

    var wet = context.createGain();
    wet.gain.value = 0.8;
    
    // 0 > 1
    var feedback = context.createGain();
    feedback.gain.value = 0.5;

    // 0.05 > 5
    var lfo = context.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.25;

    // 0.0005 > 0.005
    var gain = context.createGain();
    gain.gain.value = 0.002;

    // 
    var wetGain = context.createGain();

    var node = input;
    node._in = input;
    node._out = wetGain;

    node._connected = function(to) {
        console.log.apply(console, ['flanger connected to', (to.name || to.constructor.name)]);
        
        // TODO: should disconnect?
        lfo.disconnect();
        gain.disconnect();
        input.disconnect();
        delay.disconnect();
        feedback.disconnect();

        lfo.connect(gain);
        gain.connect(delay.delayTime);

        input.connect( wetGain );
        input.connect( delay );
        delay.connect( wetGain );
        delay.connect( feedback );
        feedback.connect( input );
    };



    lfo.start(0);
    
    node.delay = delay.delayTime;
    node.lfoFrequency = lfo.frequency;
    node.lfoGain = gain.gain;
    node.feedback = feedback.gain;
    node.name = 'Flanger';

    return node;
}

module.exports = Flanger;

/*
function createFlange() {
    var delay = audioContext.createDelay();
    delay.delayTime.value = parseFloat( document.getElementById("fldelay").value ); // 0.001 > 0.02 (0.005)

    var input = audioContext.createGain();
    
    var feedback = audioContext.createGain();
    feedback.gain.value = parseFloat( document.getElementById("flfb").value ); // 0 > 1 (0.5)

    var lfo = audioContext.createOscillator();
    lfo.type = lfo.SINE;
    lfo.frequency.value = parseFloat( document.getElementById("flspeed").value ); // 0.05 > 5 (0.25)
    
    var lfoGain = audioContext.createGain();
    lfoGain.gain.value = parseFloat( document.getElementById("fldepth").value ); // 0.0005 > 0.005 (0.002)

    lfo.connect(lfoGain);
    lfoGain.connect(delay.delayTime);

    input.connect( wetGain );
    input.connect( delay );
    delay.connect( wetGain );
    delay.connect( feedback );
    feedback.connect( input );

    lfo.start(0);

    return input;
}
*/


/*
function StereoFlanger() {
    var feedbackGain = 0.5,
        delayTime = 0.005,
        lfoGain = 0.002,
        lfoFreq = 0.25;

    var splitter = audioContext.createChannelSplitter(2);
    var merger = audioContext.createChannelMerger(2);
    var inputNode = audioContext.createGain();
    feedbackL = audioContext.createGain();
    feedbackR = audioContext.createGain();
    lfo = audioContext.createOscillator();
    lfoGainL = audioContext.createGain();
    lfoGainR = audioContext.createGain();
    delayL = audioContext.createDelay();
    delayR = audioContext.createDelay();


    feedbackL.gain.value = feedbackR.gain.value = feedbackGain;

    inputNode.connect( splitter );
    inputNode.connect( wetGain );

    delayL.delayTime.value = delayTime;
    delayR.delayTime.value = delayTime;

    splitter.connect( delayL, 0 );
    splitter.connect( delayR, 1 );
    delayL.connect( feedbackL );
    delayR.connect( feedbackR );
    feedbackL.connect( delayR );
    feedbackR.connect( delayL );

    lfoGainL.gain.value = lfoGain; // depth of change to the delay:
    lfoGainR.gain.value = 0 - lfoGain; // depth of change to the delay:

    lfo.type = lfo.TRIANGLE;
    lfo.frequency.value = lfoFreq;

    lfo.connect( lfoGainL );
    lfo.connect( lfoGainR );

    lfoGainL.connect( delayL.delayTime );
    lfoGainR.connect( delayR.delayTime );

    delayL.connect( merger, 0, 0 );
    delayR.connect( merger, 0, 1 );
    merger.connect( wetGain );

    lfo.start(0);

    return inputNode;
}
*/