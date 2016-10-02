/*global THREE:false */

'use strict';

function KeyInput() {
    var keys = [];

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

    var self = {
        on: function() {
            document.addEventListener('keydown', onKeyDown, false);
            document.addEventListener('keyup', onKeyUp, false);
        },
        off: function() {
            document.removeEventListener('keydown', onKeyDown, false);
            document.removeEventListener('keyup', onKeyUp, false);
        },
        isDown: function(key) {
            return keys[key];
        },
        left: function() {
            return keys[37];
        },
        right: function() {
            return keys[39];
        },
        up: function() {
            return keys[38];
        },
        down: function() {
            return keys[40];
        },
        space: function() {
            return keys[32];
        }
    };

    self.on();

    return self;
}

function Room(width, depth, height) {
    THREE.Object3D.call(this);

    width = width || 512;
    depth = depth || 512;
    height = height || 256;

    var material = new THREE.MeshLambertMaterial({
        color: '#ffffff'
    });

    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
    this.ground.rotation.x = -Math.PI / 2;
    this.add(this.ground);

    this.leftWall = this.createWall(material, depth, height);
    this.leftWall.rotation.y = Math.PI / 2; // 90
    this.leftWall.position.x = -width / 2;
    this.add(this.leftWall);

    this.rightWall = this.createWall(material, depth, height);
    this.rightWall.rotation.y = -Math.PI / 2; // -90
    this.rightWall.position.x = width / 2;
    this.add(this.rightWall);

    this.nearWall = this.createWall(material, width, height);
    this.nearWall.rotation.y = Math.PI; // 180
    this.nearWall.position.z = depth / 2;
    this.add(this.nearWall);

    this.farWall = this.createWall(material, width, height);
    this.farWall.position.z = -depth / 2;
    this.add(this.farWall);

    this.roof = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
    this.roof.rotation.x = Math.PI / 2;
    this.roof.position.y = height;
    this.add(this.roof);

    this.walls = [this.leftWall, this.rightWall, this.nearWall, this.farWall];
}

Room.prototype = Object.create(THREE.Object3D.prototype);
Room.prototype.constructor = Room;

Room.prototype.createWall = function(material, length, height) {
    var mesh = new THREE.Mesh(new THREE.PlaneGeometry(length, height), material);
    mesh.position.y = height / 2;
    return mesh;
};

function Hero(materials) {
    var material = (materials instanceof Array) ? new THREE.MeshFaceMaterial(materials) : materials;
    if (!material) {
        material = new THREE.MeshLambertMaterial({
            color: '#0000ff'
        });
    }
    THREE.Mesh.call(this, new THREE.BoxGeometry(64, 64, 64), material);

    this.groundedY = 32;
    this.position.y = this.groundedY;

    this.maxSpeed = 10;
    this.rotSpeed = 0.05;

    this.front = new THREE.Vector3(0, 0, 1);
    this.back = new THREE.Vector3(0, 0, -1);
    this.left = new THREE.Vector3(-1, 0, 0);
    this.right = new THREE.Vector3(1, 0, 0);
    this.up = new THREE.Vector3(0, 1, 0);
    this.down = new THREE.Vector3(0, -1, 0);

    this.angleOffset = Math.PI;
    this.angle = -Math.PI / 4; // 45
    this.quaternion.setFromAxisAngle(this.up, this.angle);

    this.forward = new THREE.Vector3(0, 0, 1);
    this.forward.applyQuaternion(this.quaternion);

    this.velocity = new THREE.Vector3(0, 0, 0);

    this.raycaster = new THREE.Raycaster();
    this.rays = [this.front, this.back, this.left, this.right, this.up, this.down];

    this.keyInput = new KeyInput();
}

Hero.prototype = Object.create(THREE.Mesh.prototype);
Hero.prototype.constructor = Hero;

Hero.prototype.preUpdate = function(deltaTime, elapsedTime) {

    function lerp(from, to, percent) {
        return from + (to - from) * percent;
    }

    if (this.keyInput.left()) {
        this.angle += this.rotSpeed;
    } else if (this.keyInput.right()) {
        this.angle -= this.rotSpeed;
    }
    this.quaternion.setFromAxisAngle(this.up, this.angle);
    this.forward.set(0, 0, 1);
    this.forward.applyQuaternion(this.quaternion);

    if (this.keyInput.up()) {
        this.velocity.z = lerp(this.velocity.z, this.maxSpeed, 0.2);
    } else if (this.keyInput.down()) {
        this.velocity.z = lerp(this.velocity.z, -this.maxSpeed, 0.2);
    } else {
        this.velocity.z *= 0.5;
    }

    // strafe would be velocity x

    // jumping and gravity

    if (!this.jumping && this.keyInput.space()) {
        this.velocity.y = 10;
        this.jumping = true;
        this.jumpedAt = elapsedTime;
    }

    if (this.jumping && elapsedTime - this.jumpedAt > 1) {
        this.jumping = false;
    }
    var gravity = -400;
    var step = deltaTime * 0.05;
    this.velocity.y += gravity * step;
};

Hero.prototype.update = function() {
    var fw = this.forward.clone();
    fw.x *= this.velocity.z;
    fw.z *= this.velocity.z;
    fw.y = this.velocity.y;
    this.position.add(fw);

    // quick collide with floor

    if (this.position.y < this.groundedY) {
        this.position.y = this.groundedY;
        this.velocity.y = 0;
    }
};

Hero.prototype.collide = function(collidableMeshList) {
    var bounce = 2;

    var object = this.overlap(collidableMeshList);
    if (object) {
        var inFront = this.forward.dot(object.position) > 0;
        if (inFront && this.velocity.z > 0) {
            //this.velocity.z = 0;
            this.velocity.z *= -bounce;
        } else if (!inFront && this.velocity.z < 0) {
            //this.velocity.z = 0;
            this.velocity.z *= -bounce;
        }
        return object;
    }

    return null;
};

Hero.prototype.overlap = function(overlapMeshList) {
    for (var i = 0; i < this.geometry.vertices.length; i++) {
        var localVertex = this.geometry.vertices[i].clone();
        var globalVertex = localVertex.applyMatrix4(this.matrix);
        var directionVector = globalVertex.sub(this.position);
        var minDistance = directionVector.length();

        this.raycaster.set(this.position, directionVector.normalize());
        var collisions = this.raycaster.intersectObjects(overlapMeshList);
        if (collisions.length > 0 && collisions[0].distance < minDistance) {
            var object = collisions[0].object;
            return object;
        }
    }
    return null;
};

function ThreeBase(el, fov, near, far) {
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.deltaTime = 0;
    this.elapsedTime = 0;
    this.fov = fov || 45;
    this.aspectRatio = 1;
    this.near = near || 0.1;
    this.far = far || 10000;

    // camera
    this.camera = new THREE.PerspectiveCamera(this.fov, this.aspectRatio, this.near, this.far);
    this.camera.position.x = 0;
    this.camera.position.y = 0;
    this.camera.position.z = 0;
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    // renderer
    if (window.WebGLRenderingContext) {
        this.renderer = new THREE.WebGLRenderer();
    } else {
        this.renderer = new THREE.CanvasRenderer();
    }
    el.appendChild(this.renderer.domElement);
    this.size();
    //this.render();

    // resize
    window.addEventListener('resize', this.size.bind(this), false);
}

ThreeBase.prototype.render = function() {
    //window.requestAnimationFrame(this.render.bind(this));
    this.deltaTime = this.clock.getDelta();
    this.elapsedTime = this.clock.getElapsedTime();
    this.update(this.deltaTime, this.elapsedTime);
    this.renderer.render(this.scene, this.camera);
};

ThreeBase.prototype.update = function(deltaTime, elapsedTime) {
    console.log('update', deltaTime, elapsedTime);
};

ThreeBase.prototype.size = function(width) {
    this.width = width || window.innerWidth - 80;
    this.height = this.width / 2;
    this.aspectRatio = this.width / this.height;
    this.camera.aspect = this.aspectRatio;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
};

function ThreeScene(el) {
    ThreeBase.call(this, el, 45);

    this.createScene();
    this.createLights();

    this.camera.position.set(0, 80, 400);

    this.render();
}

ThreeScene.prototype = Object.create(ThreeBase.prototype);
ThreeScene.prototype.constructor = ThreeScene;

ThreeScene.prototype.update = function(deltaTime, elapsedTime) {
    this.hero.preUpdate(deltaTime, elapsedTime);

    this.hero.collide(this.room.walls);

    this.speaker.scale.x = this.speaker.scale.y = 2 + Math.sin(elapsedTime * 12) / 4;

    this.hero.update();
};

ThreeScene.prototype.createScene = function() {
    this.room = new Room(512, 2048, 256);
    this.scene.add(this.room);

    var materials = [];
    var faces = ['left', 'right', 'top', 'bottom', 'front', 'back'];
    for (var i = 0; i < faces.length; i++) {
        var tex = THREE.ImageUtils.loadTexture('img/' + faces[i] + '.png');
        var mat = new THREE.MeshPhongMaterial({
            map: tex
        });
        materials.push(mat);
    }

    this.hero = new Hero(materials);
    this.hero.position.z = 64;
    this.room.add(this.hero);

    this.speaker = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 16), new THREE.MeshPhongMaterial({
        color: 0x22ee22
    }));
    this.speaker.position.set(-100, 24, 200);
    this.room.add(this.speaker);
};

ThreeScene.prototype.createLights = function() {
    this.light = new THREE.PointLight(0xffffff, 1, 2000);
    this.light.position.set(50, 64, 1024);
    this.scene.add(this.light);

    this.scene.add(new THREE.PointLightHelper(this.light, 30));

    this.ambientLight = new THREE.AmbientLight(0x222200);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0x444444);
    this.directionalLight.position.set(1, 0, 1)
        .normalize();
    this.scene.add(this.directionalLight);
};
