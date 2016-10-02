(function() {
    'use strict';

    var sono = window.sono;
    var dat = window.dat;
    var THREE = window.THREE;

    sono.log();

    var container = document.querySelector('[data-js="container"]');
    var width = 960;
    var height = 540;

    var renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0x000030);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    var aspectRatio = width / height;
    var camera = new THREE.PerspectiveCamera(45, aspectRatio, 1, 10000);
    camera.eulerOrder = 'YXZ';
    var scene = new THREE.Scene();
    var clock = new THREE.Clock();
    var forward = new THREE.Vector3(0, 0, -1);
    var up = new THREE.Vector3(0, 1, 0);
    var angle = 0;
    camera.position.y = 40;
    // var controls = new THREE.TrackballControls(camera, container);
    // controls.rotateSpeed = 1.0;
    // controls.zoomSpeed = 1.2;
    // controls.panSpeed = 0.8;
    // controls.noZoom = false;
    // controls.noPan = false;
    // controls.staticMoving = true;
    // controls.dynamicDampingFactor = 0.3;
    // controls.keys = [65, 83, 68];

    var options = {
        ambientColor: 0xaaaaaa,
        directionalColor: 0x888888
    };

    var ambient = new THREE.AmbientLight(options.ambientColor);
    scene.add(ambient);

    var light = new THREE.PointLight(0x404040, 3, 1000);
    scene.add(light);



    // var geometry = new THREE.Geometry();
    // geometry.vertices.push(new THREE.Vector3(-500, 0, 0));
    // geometry.vertices.push(new THREE.Vector3(500, 0, 0));
    //
    // var material = new THREE.LineBasicMaterial({
    //     color: new THREE.Color(Math.random(), Math.random() * 0.5, Math.random()),
    //     transparent: true,
    //     opacity: 0.5,
    //     linewidth: 0.1
    // });
    //
    // for (var i = 0; i <= 20; i++) {
    //
    //     var line = new THREE.Line(geometry, material);
    //     line.position.z = (i * 50) - 500;
    //     scene.add(line);
    //
    //     var line = new THREE.Line(geometry, material);
    //     line.position.x = (i * 50) - 500;
    //     line.rotation.y = 90 * Math.PI / 180;
    //     scene.add(line);
    // }

    // BoxGeometry
    // CircleGeometry
    // CubeGeometry
    // CylinderGeometry
    // DodecahedronGeometry
    // ExtrudeGeometry
    // IcosahedronGeometry
    // LatheGeometry
    // OctahedronGeometry
    // ParametricGeometry
    // PlaneGeometry
    // PolyhedronGeometry
    // RingGeometry
    // ShapeGeometry
    // SphereGeometry
    // TetrahedronGeometry
    // TextGeometry
    // TorusGeometry
    // TorusKnotGeometry
    // TubeGeometry

    var CustomSinCurve = THREE.Curve.create(
        function(scale) { //custom curve constructor
            this.scale = (scale === undefined) ? 1 : scale;
        },

        function(t) { //getPoint: t is between 0-1
            var tx = t * 3 - 1.5,
                ty = Math.sin(2 * Math.PI * t),
                tz = 0;

            return new THREE.Vector3(tx, ty, tz)
                .multiplyScalar(this.scale);
        }
    );

    var geometries = [
        new THREE.IcosahedronGeometry(20, 0),
        new THREE.OctahedronGeometry(20, 0),
        new THREE.TetrahedronGeometry(20, 0),
        new THREE.DodecahedronGeometry(20, 0),
        new THREE.TorusGeometry(16, 4, 4, 8),
        new THREE.BoxGeometry(20, 20, 20),
        new THREE.SphereGeometry(20),
        new THREE.CylinderGeometry(20, 20, 20),
        new THREE.TubeGeometry(new CustomSinCurve(10), 8, 4, 8)
    ];

    var sounds = [
        ['audio/planetx1.ogg', 'audio/planetx1.mp3'],
        ['audio/kalimb0.ogg', 'audio/kalimb0.mp3'],
        ['audio/jx3p1.ogg', 'audio/jx3p1.mp3'],
        ['audio/daydream.ogg', 'audio/daydream.mp3'],
        ['audio/trouble1.ogg', 'audio/trouble1.mp3'],
        ['audio/ad20273.ogg', 'audio/ad20273.mp3'],
        ['audio/trouble2.ogg', 'audio/trouble2.mp3'],
        ['audio/kalimb1.ogg', 'audio/kalimb1.mp3'],
        ['audio/sticky2.ogg', 'audio/sticky2.mp3'],
        ['audio/ad20271.ogg', 'audio/ad20271.mp3'],
        ['audio/ad20272.ogg', 'audio/ad20272.mp3'],
        ['audio/sticky1.ogg', 'audio/sticky1.mp3'],
    ];

    var createMesh = function(geometry) {
        var material = new THREE.MeshLambertMaterial({
            color: new THREE.Color(Math.random(), Math.random() * 0.5, Math.random()),
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
        return mesh;
    };
    var createStaticMesh = function(geometry) {
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
        return mesh;
    };

    // geometry = new THREE.BufferGeometry().fromGeometry(geometry);
    var color = new THREE.Color(Math.random(), Math.random() * 0.5, Math.random());
    // http://www.smartjava.org/ltjs/chapter-06/06-parametric-geometries.html
    var geometry = new THREE.PlaneBufferGeometry(5000, 5000, 100, 100);
    var material = new THREE.MeshLambertMaterial({
        color: color,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        shading: THREE.FlatShading,
        transparent: true,
        wireframe: true
    });
    var plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = Math.PI / 2;
    scene.add(plane);

    var group = new THREE.Group();
    scene.add(group);

    var groupStatic = new THREE.Group();
    scene.add(groupStatic);

    var groupWalls = new THREE.Group();
    scene.add(groupWalls);

    var arr = [],
        spacing = 1500,
        ySpacing = 500,
        vary = 10,
        mesh, x, y, z;

    var wallGeometry = new THREE.BoxGeometry(100, 80, 40);

    function createWall() {
        var mesh = createStaticMesh(wallGeometry);
        mesh.scale.y = 1 + Math.random() * 16;
        mesh.scale.z = 1 + Math.random() * 4;
        mesh.position.y = 40 * mesh.scale.y;
        groupWalls.add(mesh);
        return mesh;
    }

    for (var i = -2500; i < 2500; i += 100) {
        // north
        mesh = createWall();
        mesh.position.x = i;
        mesh.position.z = -2500;
        // south
        mesh = createWall();
        mesh.position.x = i;
        mesh.position.z = 2500;
        // east
        mesh = createWall();
        mesh.position.x = 2500;
        mesh.position.z = i;
        mesh.rotation.y = Math.PI / 2;
        // west
        mesh = createWall();
        mesh.position.x = -2500;
        mesh.position.z = i;
        mesh.rotation.y = Math.PI / 2;
    }

    for (x = 0; x < 3; x++) {
        for (z = 0; z < 3; z++) {
            mesh = createStaticMesh(geometries[x]);
            mesh.position.x = -spacing + spacing * x;
            mesh.position.y = -20;
            mesh.position.z = -spacing + spacing * z;
            groupStatic.add(mesh);
        }
    }

    for (x = 0; x < 3; x++) {
        for (z = 0; z < 3; z++) {
            for (y = 0; y < 3; y++) {
                var index = Math.floor(group.children.length / 3);

                mesh = createMesh(geometries[index]);
                mesh.position.x = -spacing + spacing * x + (-vary + Math.random() * vary * 2);
                mesh.position.y = y * ySpacing;
                mesh.position.z = -spacing + spacing * z + (-vary + Math.random() * vary * 2);

                mesh.rotation.x = Math.random() * Math.PI;
                mesh.rotation.y = Math.random() * Math.PI;
                mesh.rotation.z = Math.random() * Math.PI;

                mesh.scale.multiplyScalar(1 + Math.random() * 1);

                group.add(mesh);

                var sound = sono.createSound({
                    src: sounds[index],
                    loop: false
                });
                // sound.effect.reverb({
                //     time: 1,
                //     decay: 5
                // });

                var pan = sound.effect.panner();
                pan.distanceModel = 'linear'; // 'linear' 'inverse' 'exponential'
                pan.refDistance = 1;
                pan.maxDistance = 1500;
                pan.rolloffFactor = 1;

                arr.push({
                    mesh: mesh,
                    sound: sound,
                    pan: pan
                });
            }
        }
    }

    /*
     * key input
     */

    var keyInput = (function() {
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
            isDown: function(key) {
                return keys[key];
            },
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

    var render = function() {
        window.requestAnimationFrame(render);

        var delta = clock.getDelta();

        var velocity = 0;
        if (keyInput.up()) {
            velocity = 400 * delta;
        } else if (keyInput.down()) {
            velocity = -400 * delta;
        }

        if (keyInput.left()) {
            angle += 0.02;
        } else if (keyInput.right()) {
            angle -= 0.02;
        }
        camera.quaternion.setFromAxisAngle(up, angle);

        forward.set(0, 0, -1);
        forward.applyQuaternion(camera.quaternion);
        // set listener orientation to the forward vector of the hero
        sono.effect.panning.setListenerOrientation(forward.clone()
            .normalize());

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
        console.log('camera.rotation.x:', camera.rotation.x);

        forward.x *= velocity;
        forward.z *= velocity;
        camera.position.add(forward);
        // set listener position to the position vector of the hero
        sono.effect.panning.setListenerPosition(camera.position);

        // console.log(camera.position.x, camera.position.y, camera.position.z);

        // set source position to the position vector of the speaker
        for (var i = 0; i < arr.length; i++) {
            var item = arr[i];
            var mesh = item.mesh;
            var sound = item.sound;
            var pan = item.pan;
            // item.pan.setSourceOrientation(item.mesh.position.clone().normalize());
            mesh.rotation.x += 0.5 * delta;
            mesh.rotation.y += 2 * delta;
            mesh.position.y += delta * 200;
            if (mesh.position.y > ySpacing * 3) {
                mesh.position.y = 0;
                sound.play();
            }
            // update sound position
            pan.setSourcePosition(mesh.position);
        }

        // controls.update(deltaTime);

        for (i = 0; i < groupStatic.children.length; i++) {
            var child = groupStatic.children[i];
            child.rotation.x += 5 * delta;
            child.rotation.y += 15 * delta;
        }
        // for (var i = 0; i < group.children.length; i++) {
        //     var child = group.children[i];
        //     child.rotation.x += 0.5 * delta;
        //     child.rotation.y += 2 * delta;
        //     child.position.y += delta * 800;
        //     if (child.position.y > 1000) {
        //         child.position.y = -1000;
        //     }
        //     // child.position.z += delta * -100;
        //     // if (child.position.z > 1000) {
        //     //     child.position.z = 0;
        //     // }
        // }



        renderer.render(scene, camera);
    };
    render();

    /*
     * gui
     */

    var gui = new dat.GUI();
    var folder = gui.addFolder('camera');
    folder.add(camera.position, 'x', -1000, 1000)
        .listen();
    folder.add(camera.position, 'y', -1000, 1000)
        .listen();
    folder.add(camera.position, 'z', -1000, 1000)
        .listen();
    folder.add(camera, 'fov', 1, 100)
        .onChange(function() {
            camera.updateProjectionMatrix();
        });



}());
