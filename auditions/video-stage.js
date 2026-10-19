
import * as THREE from 'three';

export function createVideoStage(
    video,
    posterSrc = 'assets/post 10.png',
    providedTexture = null,
    showTarget = false
) {
    const group = new THREE.Group();

    // AR video overlay
    const texture = providedTexture || new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.encoding = THREE.sRGBEncoding;

    const geometry = new THREE.PlaneGeometry(1, 1920 / 1080);

    const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        toneMapped: false,
        transparent: true,
        opacity: 1
    });

    const screen = new THREE.Mesh(geometry, material);
    screen.position.z = 0.018;
    screen.renderOrder = 2;
    group.add(screen);

    // Old poster image overlay REMOVED.
    // The real poster remains visible through the phone camera.
    // MindAR still tracks the actual printed poster.

    // AR tracking corner effects
    const vertices = [];

    for (const [x, y, sx, sy] of [
        [-0.5, 0.708, 1, -1],
        [0.5, 0.708, -1, -1],
        [-0.5, -0.708, 1, 1],
        [0.5, -0.708, -1, 1]
    ]) {
        vertices.push(
            x + sx * 0.08, y, 0.035,
            x, y, 0.035,
            x, y, 0.035,
            x, y + sy * 0.08, 0.035
        );
    }

    const cornerGeometry = new THREE.BufferGeometry();

    cornerGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(vertices, 3)
    );

    const cornerMaterial = new THREE.LineBasicMaterial({
        color: 0xffcf72,
        transparent: true,
        opacity: 1,
        depthTest: false
    });

    const corners = new THREE.LineSegments(
        cornerGeometry,
        cornerMaterial
    );

    corners.renderOrder = 5;
    corners.visible = false;
    group.add(corners);

    // Orange scanning beam
    const beamGeometry = new THREE.PlaneGeometry(0.99, 0.07);

    const beamMaterial = new THREE.ShaderMaterial({
        vertexShader: `
            varying vec2 vUv;

            void main() {
                vUv = uv;
                gl_Position =
                    projectionMatrix *
                    modelViewMatrix *
                    vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec2 vUv;

            void main() {
                float edge = pow(
                    1.0 - abs(vUv.y * 2.0 - 1.0),
                    2.0
                );

                float sides =
                    smoothstep(0.0, 0.04, vUv.x) *
                    smoothstep(0.0, 0.04, 1.0 - vUv.x);

                gl_FragColor = vec4(
                    1.0,
                    0.32,
                    0.05,
                    edge * sides * 0.42
                );
            }
        `,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    const beam = new THREE.Mesh(
        beamGeometry,
        beamMaterial
    );

    beam.position.z = 0.04;
    beam.renderOrder = 6;
    beam.visible = false;
    group.add(beam);

    // Scanning laser
    const laserGeometry = new THREE.PlaneGeometry(
        0.98,
        0.003
    );

    const laserMaterial = new THREE.MeshBasicMaterial({
        color: 0xffe6a6,
        transparent: true,
        depthTest: false,
        depthWrite: false
    });

    const laser = new THREE.Mesh(
        laserGeometry,
        laserMaterial
    );

    laser.position.z = 0.041;
    laser.renderOrder = 7;
    laser.visible = false;
    group.add(laser);

    // Floating AR particles
    const sparkPositions = [];

    for (let i = 0; i < 36; i++) {
        const side = i % 2 ? -1 : 1;

        sparkPositions.push(
            side * (0.52 + Math.random() * 0.12),
            Math.random() * 1.9 - 0.95,
            0.05 + Math.random() * 0.09
        );
    }

    const sparkGeometry = new THREE.BufferGeometry();

    sparkGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
            sparkPositions,
            3
        )
    );

    const sparkMaterial = new THREE.PointsMaterial({
        color: 0xffac50,
        size: 0.008,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    const sparks = new THREE.Points(
        sparkGeometry,
        sparkMaterial
    );

    group.add(sparks);

    let scanning = false;

    return {
        group,

        update(t) {
            sparks.position.y =
                Math.sin(t * 0.7) * 0.035;

            sparkMaterial.opacity =
                0.30 + 0.14 * Math.sin(t * 2);

            if (!scanning) {
                corners.visible = true;

                cornerMaterial.opacity =
                    0.25 + 0.08 * Math.sin(t * 2);
            }
        },

        startScan(fresh) {
            scanning = true;

            // Never show the old poster image.
            // Keep the video visible during scanning.
            material.opacity = fresh ? 0 : 1;

            corners.visible = true;
            beam.visible = fresh;
            laser.visible = fresh;
        },

        scan(progress, fresh) {
            if (!scanning) return;

            const p = Math.max(
                0,
                Math.min(1, progress)
            );

            cornerMaterial.opacity =
                0.75 + 0.25 * Math.sin(p * 12);

            if (fresh) {
                beam.position.y =
                laser.position.y =
                    0.708 -
                    1.416 * Math.min(1, p / 0.70);

                const reveal = Math.max(
                    0,
                    Math.min(1, (p - 0.70) / 0.30)
                );

                const easing =
                    1 - Math.pow(1 - reveal, 3);

                // Fade in the AR video only.
                // No old poster background.
                material.opacity = easing;

                beam.visible = p < 0.72;
                laser.visible = p < 0.72;

                corners.scale.setScalar(
                    1 + Math.sin(p * Math.PI) * 0.005
                );
            } else {
                cornerMaterial.opacity = 1 - p;
            }
        },

        finishScan() {
            scanning = false;

            material.opacity = 1;

            beam.visible = false;
            laser.visible = false;
            corners.visible = true;

            cornerMaterial.opacity = 0.3;
            corners.scale.setScalar(1);
        },

        stopScan() {
            scanning = false;

            beam.visible = false;
            laser.visible = false;
            corners.visible = false;
        },

        dispose() {
            geometry.dispose();
            material.dispose();

            if (!providedTexture) {
                texture.dispose();
            }

            cornerGeometry.dispose();
            cornerMaterial.dispose();

            beamGeometry.dispose();
            beamMaterial.dispose();

            laserGeometry.dispose();
            laserMaterial.dispose();

            sparkGeometry.dispose();
            sparkMaterial.dispose();
        }
    };
}
