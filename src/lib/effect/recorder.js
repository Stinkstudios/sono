export default function Recorder(context, passThrough) {
    const bufferLength = 4096,
        buffersL = [],
        buffersR = [];
    let startedAt = 0,
        stoppedAt = 0;

    const input = context.createGain();
    const output = context.createGain();
    let script;

    const node = input;
    node.name = 'Recorder';
    node._output = output;

    node.isRecording = false;

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
            return context.createBuffer(2, bufferLength, context.sampleRate);
        }
        const recordingLength = buffersL.length * bufferLength;
        const buffer = context.createBuffer(2, recordingLength, context.sampleRate);
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

        script = context.createScriptProcessor(bufferLength, 2, 2);
        input.connect(script);
        script.connect(context.destination);
        script.connect(output);


        script.onaudioprocess = function(event) {
            const inputL = event.inputBuffer.getChannelData(0);
            const inputR = event.inputBuffer.getChannelData(1);

            if (passThrough) {
                const outputL = event.outputBuffer.getChannelData(0);
                const outputR = event.outputBuffer.getChannelData(1);
                outputL.set(inputL);
                outputR.set(inputR);
            }

            if (node.isRecording) {
                buffersL.push(new Float32Array(inputL));
                buffersR.push(new Float32Array(inputR));
            }
        };
    }

    node.start = function() {
        createScriptProcessor();
        buffersL.length = 0;
        buffersR.length = 0;
        startedAt = context.currentTime;
        stoppedAt = 0;
        this.isRecording = true;
    };

    node.stop = function() {
        stoppedAt = context.currentTime;
        this.isRecording = false;
        destroyScriptProcessor();
        return getBuffer();
    };

    node.getDuration = function() {
        if (!this.isRecording) {
            return stoppedAt - startedAt;
        }
        return context.currentTime - startedAt;
    };

    return node;
}
