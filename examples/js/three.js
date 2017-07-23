'use strict';

(function () {
    var _window = window,
        baseURL = _window.baseURL,
        sono = _window.sono,
        dat = _window.dat,
        THREE = _window.THREE,
        Boid = _window.Boid;


    sono.log();

    var container = document.querySelector('[data-container]');
    var width = window.innerWidth;
    var height = window.innerHeight;
    var bgColor = 0x000020;
    var volume = 0.4;
    var size = 2000;

    var sounds = ['pulsar_1', 'pulsar_2', 'pulsar_3', 'pulsar_4'].map(function (name) {
        return '' + baseURL + name;
    }).map(function (path) {
        return [path + '.ogg', path + '.mp3'];
    });

    var names = ['red', 'blue', 'green', 'yellow'];

    var colors = [new THREE.Color(0.8, 0.1, 0.1), new THREE.Color(0.1, 0.8, 0.1), new THREE.Color(0.1, 0.5, 0.8), new THREE.Color(0.8, 0.6, 0.1)];

    var renderer = new THREE.WebGLRenderer({ antiAlias: true });
    renderer.setClearColor(bgColor);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    var aspectRatio = width / height;
    var camera = new THREE.PerspectiveCamera(50, aspectRatio, 1, 10000);
    camera.rotation.order = 'YXZ';
    var scene = new THREE.Scene();
    var clock = new THREE.Clock();
    var forward = new THREE.Vector3(0, 0, -1);
    var up = new THREE.Vector3(0, 1, 0);
    camera.position.y = 50;
    var angle = 0;

    var ambient = new THREE.AmbientLight(0xaaaaaa);
    scene.add(ambient);

    var light = new THREE.PointLight(0xffffff, 1, 1000);
    scene.add(light);

    function createThing(group, geometry, position, color) {
        var material = new THREE.MeshLambertMaterial({
            color: color,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            shading: THREE.FlatShading,
            transparent: true
        });
        var mesh = new THREE.Mesh(geometry, material);
        var wireframe = mesh.clone();
        wireframe.material = wireframe.material.clone();
        wireframe.material.wireframe = true;
        mesh.add(wireframe);
        if (position) {
            mesh.position.add(position);
        }
        group.add(mesh);
        return mesh;
    }

    function createGrid(length, divisions) {
        var group = new THREE.Group();
        var halfSize = length / 2;
        var step = length / divisions;

        var geometry = new THREE.Geometry();
        geometry.vertices.push(new THREE.Vector3(-halfSize, 0, 0));
        geometry.vertices.push(new THREE.Vector3(halfSize, 0, 0));

        var material = new THREE.MeshLambertMaterial({
            color: new THREE.Color(0.3, 0.5, 0.8),
            blending: THREE.AdditiveBlending,
            transparent: true
        });

        for (var i = 0; i <= divisions; i++) {
            var line = new THREE.Line(geometry, material);
            line.position.z = i * step - halfSize;
            group.add(line);

            line = new THREE.Line(geometry, material);
            line.position.x = i * step - halfSize;
            line.rotation.y = 90 * Math.PI / 180;
            group.add(line);
        }

        return group;
    }

    scene.add(createGrid(size, 50));

    var group = new THREE.Group();
    scene.add(group);

    var things = colors.map(function (color, i) {
        var x = -200 + 100 * i;
        return {
            name: names[i],
            sound: sono.create({
                url: sounds[i],
                volume: volume,
                loop: true,
                effects: [sono.panner()]
            }),
            mesh: createThing(group, new THREE.TetrahedronGeometry(20, 0), new THREE.Vector3(x, 60, -400), color),
            boid: new Boid({
                bounds: { x: 0 - size / 2, y: 0 - size / 2, width: size, height: size },
                edgeBehavior: 'bounce',
                maxSpeed: 2 + 8 * Math.random(),
                wanderDistance: 10,
                wanderRadius: 3,
                wanderAngle: 0,
                wanderRange: 0.5
            })
        };
    });

    things.forEach(function (thing) {
        thing.boid.position.x = thing.mesh.position.x;
        thing.boid.position.y = thing.mesh.position.z;
        thing.sound.play(Math.random());
    });

    var keyInput = function () {
        var keys = [];
        var UP = 38;
        var DOWN = 40;
        var SPACE = 32;
        var LEFT = 37;
        var RIGHT = 39;

        for (var i = 0; i < 256; i++) {
            keys.push(false);
        }

        function onKeyDown(event) {
            event.preventDefault();
            keys[event.keyCode] = true;
        }

        function onKeyUp(event) {
            event.preventDefault();
            keys[event.keyCode] = false;
        }

        document.addEventListener('keydown', onKeyDown, false);
        document.addEventListener('keyup', onKeyUp, false);

        return {
            left: function left() {
                return keys[LEFT];
            },
            right: function right() {
                return keys[RIGHT];
            },
            up: function up() {
                return keys[UP];
            },
            down: function down() {
                return keys[DOWN];
            },
            space: function space() {
                return keys[SPACE];
            }
        };
    }();

    var velocity = 0;
    var angleVelocity = 0;

    function render() {
        window.requestAnimationFrame(render);

        var delta = clock.getDelta();
        var frames = delta * 60;
        var moveSpeed = 400;
        var rotateSpeed = 0.02;

        if (keyInput.up()) {
            velocity = moveSpeed * delta;
        } else if (keyInput.down()) {
            velocity = -moveSpeed * delta;
        } else {
            velocity *= 0.95;
        }

        if (keyInput.left()) {
            angleVelocity = rotateSpeed * frames;
        } else if (keyInput.right()) {
            angleVelocity = -rotateSpeed * frames;
        } else {
            angleVelocity *= 0.8;
        }

        angle += angleVelocity;

        camera.quaternion.setFromAxisAngle(up, angle);

        forward.set(0, 0, -1);
        forward.applyQuaternion(camera.quaternion);
        var norm = forward.clone().normalize();
        sono.panner.setListenerOrientation(norm);

        var velocityY = 0;
        if (keyInput.space()) {
            if (camera.position.y < 1800) {
                velocityY = 400 * delta;
                forward.y = velocityY;
            }
        } else if (camera.position.y > 40) {
            forward.y = 0 - (camera.position.y - 40) * 0.05;
        }
        camera.rotation.x = camera.position.y / -4000;

        forward.x *= velocity;
        forward.z *= velocity;
        camera.position.add(forward);
        sono.panner.setListenerPosition(camera.position);

        for (var i = 0; i < things.length; i++) {
            var thing = things[i];
            var boid = thing.boid,
                mesh = thing.mesh,
                sound = thing.sound;

            mesh.rotation.x += 0.5 * delta;
            mesh.rotation.y += 0.2 * delta;
            boid.wander().update();
            mesh.position.x = boid.position.x;
            mesh.position.z = boid.position.y;

            var pan = sound.effects[0];
            pan.setPosition(mesh.position);
            // pan.setOrientation(boid.position.x, 0, boid.position.z);
        }

        renderer.render(scene, camera);
    }
    render();

    var gui = new dat.GUI();

    function add(prop, min, max) {
        gui.add(sono.panner.defaults, prop, min, max).onChange(function (value) {
            sono.panner.defaults[prop] = value;
            things.forEach(function (thing) {
                var node = thing.sound.effects[0]._node;
                node[prop] = value;
            });
        });
    }

    add('panningModel', ['HRTF', 'equalpower']);
    add('distanceModel', ['linear', 'inverse', 'exponential']);
    add('refDistance', 0, 10);
    add('maxDistance', 1, 2000);
    add('rolloffFactor', 0, 5);
    add('coneInnerAngle', 0, 360);
    add('coneOuterAngle', 0, 360);
    add('coneOuterGain', 0, 360);

    var fl = void 0;
    things.forEach(function (thing) {
        fl = gui.addFolder(thing.name);
        fl.add({ mute: false }, 'mute').onChange(function (value) {
            thing.sound.volume = value ? 0 : volume;
        });
        fl.add({ speed: thing.boid.maxSpeed }, 'speed', 0, 20).onChange(function (value) {
            thing.boid.maxSpeed = value;
        });
    });
})();