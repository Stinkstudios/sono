(function() {
    const {sono, dat, THREE, Boid} = window;

    sono.log();

    const container = document.querySelector('[data-container]');
    const width = 960;
    const height = 540;
    const bgColor = 0x000020;
    const volume = 0.4;
    const size = 2000;
    const local = /^(?:https?:\/\/)?(?:localhost|192\.168)/.test(window.location.href);
    const baseURL = local ? 'audio/other' : 'https://ianmcgregor.co/prototypes/audio/';

    const sounds = [
        'pulsar_1',
        'pulsar_2',
        'pulsar_3',
        'pulsar_4'
    ]
    .map(name => `${baseURL}${name}`)
    .map(path => [`${path}.ogg`, `${path}.mp3`]);

    const names = [
        'red',
        'blue',
        'green',
        'yellow'
    ];

    const colors = [
        new THREE.Color(0.8, 0.1, 0.1),
        new THREE.Color(0.1, 0.8, 0.1),
        new THREE.Color(0.1, 0.5, 0.8),
        new THREE.Color(0.8, 0.6, 0.1)
    ];

    const renderer = new THREE.WebGLRenderer({antiAlias: true});
    renderer.setClearColor(bgColor);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const aspectRatio = width / height;
    const camera = new THREE.PerspectiveCamera(50, aspectRatio, 1, 10000);
    camera.rotation.order = 'YXZ';
    const scene = new THREE.Scene();
    const clock = new THREE.Clock();
    const forward = new THREE.Vector3(0, 0, -1);
    const up = new THREE.Vector3(0, 1, 0);
    camera.position.y = 50;
    let angle = 0;

    const ambient = new THREE.AmbientLight(0xaaaaaa);
    scene.add(ambient);

    const light = new THREE.PointLight(0xffffff, 1, 1000);
    scene.add(light);

    function createThing(group, geometry, position, color) {
        const material = new THREE.MeshLambertMaterial({
            color: color,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            shading: THREE.FlatShading,
            transparent: true
        });
        const mesh = new THREE.Mesh(geometry, material);
        const wireframe = mesh.clone();
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
        const group = new THREE.Group();
        const halfSize = length / 2;
        const step = length / divisions;

        const geometry = new THREE.Geometry();
        geometry.vertices.push(new THREE.Vector3(-halfSize, 0, 0));
        geometry.vertices.push(new THREE.Vector3(halfSize, 0, 0));

        const material = new THREE.MeshLambertMaterial({
            color: new THREE.Color(0.3, 0.5, 0.8),
            blending: THREE.AdditiveBlending,
            transparent: true
        });

        for (let i = 0; i <= divisions; i++) {
            let line = new THREE.Line(geometry, material);
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

    const group = new THREE.Group();
    scene.add(group);

    const things = colors.map((color, i) => {
        const x = -200 + 100 * i;
        return {
            name: names[i],
            sound: sono.create({
                url: sounds[i],
                volume: volume,
                loop: true,
                effects: [
                    sono.panner()
                ]
            }),
            mesh: createThing(
                group,
                new THREE.TetrahedronGeometry(20, 0),
                new THREE.Vector3(x, 60, -400),
                color
            ),
            boid: new Boid({
                bounds: {x: 0 - size / 2, y: 0 - size / 2, width: size, height: size},
                edgeBehavior: 'bounce',
                maxSpeed: 2 + 2 * Math.random(),
                wanderDistance: 10,
                wanderRadius: 3,
                wanderAngle: 0,
                wanderRange: 0.5
            })
        };
    });

    things.forEach(thing => {
        thing.boid.position.x = thing.mesh.position.x;
        thing.boid.position.y = thing.mesh.position.z;
        thing.sound.play(Math.random());
    });

    const keyInput = (function() {
        const keys = [];
        const UP = 38;
        const DOWN = 40;
        const SPACE = 32;
        const LEFT = 37;
        const RIGHT = 39;

        for (let i = 0; i < 256; i++) {
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
            left: function() {
                return keys[LEFT];
            },
            right: function() {
                return keys[RIGHT];
            },
            up: function() {
                return keys[UP];
            },
            down: function() {
                return keys[DOWN];
            },
            space: function() {
                return keys[SPACE];
            }
        };
    }());

    let velocity = 0;
    let angleVelocity = 0;

    function render() {
        window.requestAnimationFrame(render);

        const delta = clock.getDelta();
        const frames = delta * 60;
        const moveSpeed = 400;
        const rotateSpeed = 0.02;

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
        const norm = forward.clone().normalize();
        sono.panner.setListenerOrientation(norm);

        let velocityY = 0;
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

        for (let i = 0; i < things.length; i++) {
            const thing = things[i];
            const {boid, mesh, sound} = thing;
            mesh.rotation.x += 0.5 * delta;
            mesh.rotation.y += 0.2 * delta;
            boid.wander().update();
            mesh.position.x = boid.position.x;
            mesh.position.z = boid.position.y;

            const pan = sound.effects[0];
            pan.setPosition(mesh.position);
            // pan.setOrientation(boid.position.x, 0, boid.position.z);
        }

        renderer.render(scene, camera);
    }
    render();

    const gui = new dat.GUI();

    function add(prop, min, max) {
        gui.add(sono.panner.defaults, prop, min, max).onChange(value => {
            sono.panner.defaults[prop] = value;
            things.forEach(thing => {
                const node = thing.sound.effects[0]._node;
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

    let fl;
    things.forEach(thing => {
        fl = gui.addFolder(thing.name);
        fl.add({mute: false}, 'mute').onChange(value => {
            thing.sound.volume = value ? 0 : volume;
        });
        fl.add({speed: thing.boid.maxSpeed}, 'speed', 0, 20).onChange(value => {
            thing.boid.maxSpeed = value;
        });
    });

}());
