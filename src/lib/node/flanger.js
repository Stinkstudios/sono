'use strict';

function Flanger(context) {

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
    var lfoGain = context.createGain();
    lfoGain.gain.value = 0.002;

    // 
    var wetGain = context.createGain();

    var node = input;
    node._in = input;
    node._out = wetGain;

    node._connected = function(to) {
        console.log.apply(console, ['flanger connected to', (to.name || to.constructor.name)]);
        
        // TODO: should disconnect?
        lfo.disconnect();
        lfoGain.disconnect();
        input.disconnect();
        delay.disconnect();
        feedback.disconnect();

        lfo.connect(lfoGain);
        lfoGain.connect(delay.delayTime);

        input.connect( wetGain );
        input.connect( delay );
        delay.connect( wetGain );
        delay.connect( feedback );
        feedback.connect( input );
    };



    lfo.start(0);
    
    node.delay = delay.delayTime;
    node.lfoFrequency = lfo.frequency;
    node.lfoGain = lfoGain.gain;
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