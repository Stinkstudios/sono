'use strict';

// import sono from 'sono';
// import 'sono/effects';

// import {
//     Clock,
//     Color,
//     Geometry,
//     Line,
//     LineBasicMaterial,
//     Matrix4,
//     PerspectiveCamera,
//     Scene,
//     Vector3,
//     WebGLRenderer
// } from 'three';
//
// import {
//     BloomPass,
//     EffectComposer,
//     RenderPass
// } from 'postprocessing';
//
// import gui from 'usfl/gui';
// import FPS from 'usfl/fps';

var _window = window,
    sono = _window.sono,
    THREE = _window.THREE,
    POSTPROCESSING = _window.POSTPROCESSING,
    usfl = _window.usfl;
var Clock = THREE.Clock,
    Color = THREE.Color,
    Geometry = THREE.Geometry,
    Line = THREE.Line,
    LineBasicMaterial = THREE.LineBasicMaterial,
    Matrix4 = THREE.Matrix4,
    PerspectiveCamera = THREE.PerspectiveCamera,
    Scene = THREE.Scene,
    Vector3 = THREE.Vector3,
    WebGLRenderer = THREE.WebGLRenderer;
var BloomPass = POSTPROCESSING.BloomPass,
    EffectComposer = POSTPROCESSING.EffectComposer,
    RenderPass = POSTPROCESSING.RenderPass;
var _usfl$default = usfl.default,
    fps = _usfl$default.fps,
    gui = _usfl$default.gui;


sono.log();

var stats = fps();
var cos = Math.cos,
    PI = Math.PI,
    sin = Math.sin;

var PI2 = PI * 2;
var W = window.innerWidth;
var H = window.innerHeight;

var baseURL = gui.isLocalHost() ? 'audio/other/' : 'https://ianmcgregor.co/prototypes/audio/';

var sound = sono.create({
    url: [baseURL + 'ad2027-loop.ogg', baseURL + 'ad2027-loop.mp3'],
    loop: true,
    singlePlay: true
}).play();

var analyser = sound.effects.add(sono.analyser({
    fftSize: 128
}));

var amplitude = {
    value: 0,
    norm: 0,
    min: 1,
    max: 0
};

var opts = {
    color: true,
    numLines: 20,
    scale: 80,
    verticesPerLine: 128,
    speedThreshold: 0.65,
    bloom: 2,
    bloomThreshold: 0.65,
    bloomScale: 12,
    mulOffsetX: 0.02,
    mulOffsetY: 0.03,
    mulOffsetZ: 0.01,
    zoomThreshold: 1,
    cameraY: 0,
    cameraZ: 325,
    speedMultiplier: 3
};

var lineSector = PI2 / opts.numLines;
var vertexSector = PI2 / opts.verticesPerLine;
var bloomBoost = 1;

var lines = [];
var offset = new Vector3(0, 0, 0);
var axis = new Vector3(0, 0, 1);
var mat4 = new Matrix4();
var clock = new Clock();

var scene = new Scene();
var camera = new PerspectiveCamera(70, W / H);
scene.add(camera);

var renderer = new WebGLRenderer();
renderer.autoClear = false;
renderer.clearAlpha = 1;
renderer.setSize(W, H);
// document.body.appendChild(renderer.domElement);
document.querySelector('[data-container]').appendChild(renderer.domElement);

var composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
var bloomPass = new BloomPass({
    intensity: opts.bloom,
    resolutionScale: 1
});
bloomPass.renderToScreen = true;
composer.addPass(bloomPass);

function createLine(angle) {
    var geometry = new Geometry();

    for (var i = 0; i < opts.verticesPerLine + 1; i++) {
        geometry.vertices.push(new Vector3());
    }

    var material = new LineBasicMaterial({
        color: new Color(0xffffff)
    });

    if (opts.color) {
        material.color.setHSL(angle / PI2, 1, 0.6);
    }

    return new Line(geometry, material);
}

function createLines() {
    for (var i = 0; i < opts.numLines; i++) {
        var angle = lineSector * i;
        var line = createLine(angle);
        lines.push(line);
        scene.add(line);
    }
}

function draw(amp) {
    for (var i = 0; i < lines.length; i++) {
        var lineAngle = lineSector * i;
        var rotationMatrix = mat4.identity().makeRotationAxis(axis, lineAngle);
        var geometry = lines[i].geometry;
        var vertices = geometry.vertices;


        for (var j = 0; j < vertices.length; j++) {
            var vertex = vertices[j];
            var vertexAngle = vertexSector * j;

            vertex.x = cos(offset.x + sin(vertexAngle + offset.x) * sin(vertexAngle + offset.x));
            vertex.y = sin(offset.y + cos(vertexAngle + offset.y) * cos(vertexAngle + offset.y));
            vertex.z = sin(offset.z + sin(vertexAngle + offset.z) * cos(vertexAngle + offset.z));

            vertex.multiplyScalar(opts.scale);
            vertex.applyMatrix4(rotationMatrix);
        }

        geometry.verticesNeedUpdate = true;
    }

    var speed = 0.5 + amp;
    if (amp > opts.speedThreshold) {
        speed += amp * opts.speedMultiplier;
    }

    offset.x += opts.mulOffsetX * speed;
    offset.y += opts.mulOffsetY * speed;
    offset.z += opts.mulOffsetZ * speed;

    if (amp > opts.bloomThreshold) {
        bloomBoost = amp * opts.bloomScale;
    } else {
        bloomBoost += (1 - bloomBoost) * 0.1;
    }
    bloomPass.intensity = opts.bloom * bloomBoost;

    if (amp > opts.zoomThreshold) {
        camera.zoom = 1.5;
        camera.updateProjectionMatrix();
    } else if (camera.zoom > 1) {
        camera.zoom += (1 - camera.zoom) * 0.1;
        camera.updateProjectionMatrix();
    }

    camera.position.set(0, opts.cameraY, opts.cameraZ);
    camera.lookAt(scene.position);

    renderer.clear();
    // renderer.render(scene, camera);
    composer.render(clock.getDelta());
}

function averageAmplitude(wave) {
    var sum = 0;
    for (var i = 0; i < wave.length; i++) {
        sum += wave[i];
    }
    return sum / wave.length / 256;
}

function update() {
    window.requestAnimationFrame(update);

    var value = averageAmplitude(analyser.getWaveform());

    amplitude.value = value;

    if (value < amplitude.min) {
        amplitude.min = value;
    }

    if (value > amplitude.max) {
        amplitude.max = value;
    }

    var range = amplitude.max - amplitude.min || 1;
    var norm = (value - amplitude.min) / range;

    amplitude.norm = norm;

    draw(norm);

    stats.update();
}
createLines();
update();

function recreateLines() {
    lineSector = PI2 / opts.numLines;
    vertexSector = PI2 / opts.verticesPerLine;

    while (lines.length) {
        scene.remove(lines.pop());
    }
    createLines();
}

gui().then(function (g) {
    g.add(amplitude, 'value', 0, 1).listen();
    g.add(amplitude, 'norm', 0, 1).listen();
    g.add(amplitude, 'min', 0, 1).listen();
    g.add(amplitude, 'max', 0, 1).listen();
    g.add(opts, 'color').onChange(function () {
        return recreateLines();
    });
    g.add(opts, 'numLines', 1, 256).step(1).onChange(function () {
        return recreateLines();
    });
    g.add(opts, 'verticesPerLine', 3, 128).step(1).onChange(function () {
        return recreateLines();
    });
    g.add(opts, 'scale', 10, 500);
    g.add(opts, 'speedThreshold', 0, 1);
    g.add(opts, 'speedMultiplier', 1, 20);
    g.add(opts, 'zoomThreshold', 0, 1);
    g.add(opts, 'bloom', 0, 5);
    g.add(opts, 'bloomThreshold', 0, 1);
    g.add(opts, 'bloomScale', 1, 20);
    g.add(opts, 'mulOffsetX', 0.005, 0.1);
    g.add(opts, 'mulOffsetY', 0.005, 0.1);
    g.add(opts, 'mulOffsetZ', 0.005, 0.1);
    g.add(opts, 'cameraY', 0, 1600);
    g.add(opts, 'cameraZ', 0, 1600);

    if (!gui.isLocalHost()) {
        g.close();
    }
});

var upload = document.querySelector('[data-upload]');
upload.addEventListener('change', function (event) {
    sound.stop();
    var file = event.currentTarget.files[0];
    var reader = new FileReader();
    reader.onload = function (e) {
        return sound.load(e.target.result).play();
    };
    reader.readAsArrayBuffer(file);
});