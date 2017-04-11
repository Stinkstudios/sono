import sono from '../core/sono';

function recorder(passThrough = false) {
    const bufferLength = 4096;
    const buffersL = [];
    const buffersR = [];
    let startedAt = 0;
    let stoppedAt = 0;
    let script = null;
    let isRecording = false;
    let soundOb = null;

    const input = sono.context.createGain();
    const output = sono.context.createGain();
    output.gain.value = passThrough ? 1 : 0;

    const node = {
        _in: input,
        _out: output,
        connect(n) {
            output.connect(n._in || n);
        },
        disconnect(...args) {
            output.disconnect(args);
        }
    };

    function mergeBuffers(buffers, length) {
        const buffer = new Float32Array(length);
        let offset = 0;
        for (let i = 0; i < buffers.length; i++) {
            buffer.set(buffers[i], offset);
            offset += buffers[i].length;
        }
        return buffer;
    }

    function getBuffer() {
        if (!buffersL.length) {
            return sono.context.createBuffer(2, bufferLength, sono.context.sampleRate);
        }
        const recordingLength = buffersL.length * bufferLength;
        const buffer = sono.context.createBuffer(2, recordingLength, sono.context.sampleRate);
        buffer.getChannelData(0)
            .set(mergeBuffers(buffersL, recordingLength));
        buffer.getChannelData(1)
            .set(mergeBuffers(buffersR, recordingLength));
        return buffer;
    }

    function destroyScriptProcessor() {
        if (script) {
            script.onaudioprocess = null;
            input.disconnect();
            script.disconnect();
        }
    }

    function createScriptProcessor() {
        destroyScriptProcessor();

        script = sono.context.createScriptProcessor(bufferLength, 2, 2);
        input.connect(script);
        script.connect(output);
        script.connect(sono.context.destination);
        // output.connect(sono.context.destination);


        script.onaudioprocess = function(event) {
            const inputL = event.inputBuffer.getChannelData(0);
            const inputR = event.inputBuffer.getChannelData(1);

            if (passThrough) {
                const outputL = event.outputBuffer.getChannelData(0);
                const outputR = event.outputBuffer.getChannelData(1);
                outputL.set(inputL);
                outputR.set(inputR);
            }

            if (isRecording) {
                buffersL.push(new Float32Array(inputL));
                buffersR.push(new Float32Array(inputR));
            }
        };
    }

    return {
        start(sound) {
            if (!sound) {
                return;
            }
            createScriptProcessor();
            buffersL.length = 0;
            buffersR.length = 0;
            startedAt = sono.context.currentTime;
            stoppedAt = 0;
            soundOb = sound;
            sound.effects.add(node);
            isRecording = true;
        },
        stop() {
            soundOb.effects.remove(node);
            soundOb = null;
            stoppedAt = sono.context.currentTime;
            isRecording = false;
            destroyScriptProcessor();
            return getBuffer();
        },
        getDuration() {
            if (!isRecording) {
                return stoppedAt - startedAt;
            }
            return sono.context.currentTime - startedAt;
        },
        get isRecording() {
            return isRecording;
        }
    };
}

export default sono.register('recorder', recorder, sono.utils);
