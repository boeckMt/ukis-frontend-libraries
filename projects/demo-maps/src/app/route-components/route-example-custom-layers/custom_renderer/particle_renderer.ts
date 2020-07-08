import { Shader, Program, Attribute, Framebuffer, Uniform, Texture, renderLoop } from './engine/engine.core';
import { rectangle, flattenMatrix } from './engine/engine.shapes';
import { Feature } from 'ol';
import { FrameState } from 'ol/PluggableMap';
import LayerRenderer from 'ol/renderer/Layer';
import VectorLayer from 'ol/layer/Vector';
import Point from 'ol/geom/Point';
import Delaunator from 'delaunator';


export class WindFieldLayer extends VectorLayer {
    constructor(options) {
        super(options);
    }

    createRenderer(): LayerRenderer {
        return new ParticleRenderer(this);
    }
}


export class ParticleRenderer extends LayerRenderer {


    readonly canvas: HTMLCanvasElement;
    readonly gl: WebGLRenderingContext;
    readonly interpolationShader: Shader;
    readonly particleShader: Shader;
    readonly interpolFb: Framebuffer;

    constructor(layer: VectorLayer) {
        super(layer);

        // setting up canvas
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 800;
        canvas.style.position = 'absolute';


        // preparing data
        const source = layer.getSource();
        const features = source.getFeatures() as Feature<Point>[];
        const aObservation = this.pointsToObservations(features);

        const gl = canvas.getContext('webgl');
        const rect = rectangle(2.0, 2.0);



        // --------- Step 1: interpolating field between data points. ------------------------------------------

        const interpolProgram = new Program(gl, `
            attribute vec4 a_observation;
            uniform mat3 u_world2pix;
            uniform mat3 u_pix2canv;
            varying vec2 v_value;

            void main() {
                vec3 pixelPosition = u_world2pix * vec3(a_observation.x, a_observation.y, 1.);
                vec3 canvasPosition = u_pix2canv * pixelPosition;
                v_value = (a_observation.zw / 2.0) + 0.5;
                gl_Position = vec4(canvasPosition.xy, 0.0, 1.0);
            }
        `, `
            precision mediump float;
            varying vec2 v_value;

            void main() {
                gl_FragColor = vec4(v_value.xy, 0.0, 1.0);
            }
        `);

        const interpolShader = new Shader(interpolProgram, [
            new Attribute(gl, interpolProgram, 'a_observation', aObservation)
        ], [
            new Uniform(gl, interpolProgram, 'u_world2pix', 'matrix3fv', flattenMatrix([
                [1., 0., 0.],
                [0., 1., 0.],
                [0., 0., 1.]
            ])),
            new Uniform(gl, interpolProgram, 'u_pix2canv', 'matrix3fv', flattenMatrix([
                [1. /  (canvas.width / 2),  0.,                        0. ],
                [0,                        -1. / (canvas.height / 2),  0. ],
                [-1.,                      1.,                         1. ]
            ]))
        ], []);

        const interpolFb = new Framebuffer(gl, canvas.width, canvas.height);




        // ------------------ Step 2: moving particles along force field ------------------------------------

        const particleFb1 = new Framebuffer(gl, canvas.width, canvas.height);
        const particleFb2 = new Framebuffer(gl, canvas.width, canvas.height);

        const particleProgram = new Program(gl, `
            attribute vec3 a_vertex;
            attribute vec2 a_textureCoord;
            varying vec2 v_textureCoord;
            void main() {
                v_textureCoord = a_textureCoord;
                gl_Position = vec4(a_vertex.xyz, 1.0);
            }
        `, `
            precision mediump float;
            uniform sampler2D u_forceTexture;
            uniform sampler2D u_particleTexture;
            uniform float u_deltaT;
            varying vec2 v_textureCoord;

            float rand(vec2 co){
                return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
            }

            void main() {
                vec2 speed = ((texture2D(u_forceTexture, v_textureCoord) - 0.5 ) * 2.0).xy;
                vec2 samplePoint = v_textureCoord - speed * u_deltaT * 0.1;
                samplePoint = mod(samplePoint, 1.0);
                gl_FragColor = texture2D(u_particleTexture, samplePoint);

                float randVal = rand(v_textureCoord * abs(sin(u_deltaT)) * 0.01);
                if (randVal > 0.999) {  // spawn
                    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
                } if (randVal < 0.3) {   // die off
                    gl_FragColor = texture2D(u_forceTexture, v_textureCoord);
                } if (texture2D(u_forceTexture, v_textureCoord) == vec4(0.0, 0.0, 0.0, 0.0)) {
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
                }
            }
        `);

        const particleShader = new Shader(particleProgram, [
            new Attribute(gl, particleProgram, 'a_vertex', rect.vertices),
            new Attribute(gl, particleProgram, 'a_textureCoord', rect.texturePositions)
        ], [
            new Uniform(gl, particleProgram, 'u_deltaT', '1f', [0.01])
        ], [
            new Texture(gl, particleProgram, 'u_forceTexture', interpolFb.fbo.texture, 0),
            new Texture(gl, particleProgram, 'u_particleTexture', particleFb1.fbo.texture, 1)
        ]);




        // ------------------ Step 3: Mixing background-field and particles ------------------------------------

        const textureMixProgram = new Program(gl, `
            attribute vec3 a_vertex;
            attribute vec2 a_textureCoord;
            varying vec2 v_textureCoord;
            void main() {
                v_textureCoord = a_textureCoord;
                gl_Position = vec4(a_vertex.xyz, 1.0);
            }
        `, `
            precision mediump float;
            uniform sampler2D u_bgTexture;
            uniform sampler2D u_particleTexture;
            varying vec2 v_textureCoord;
            void main() {
                vec4 bgColor = texture2D(u_bgTexture, v_textureCoord);
                vec4 particleColor = texture2D(u_particleTexture, v_textureCoord);
                vec4 colorMix = max(particleColor, bgColor);
                gl_FragColor = colorMix;
            }
        `);
        const textureMixShader = new Shader(textureMixProgram, [
            new Attribute(gl, textureMixProgram, 'a_vertex', rect.vertices),
            new Attribute(gl, textureMixProgram, 'a_textureCoord', rect.texturePositions)
        ], [], [
            new Texture(gl, textureMixProgram, 'u_bgTexture', interpolFb.fbo.texture, 0),
            new Texture(gl, textureMixProgram, 'u_particleTexture', particleFb1.fbo.texture, 1)
        ]);


        // Setup
        interpolShader.bind(gl);
        interpolShader.render(gl, [0, 0, 0, 0], interpolFb.fbo);
        textureMixShader.bind(gl);
        textureMixShader.render(gl);
        particleShader.bind(gl);

        // Animation loop
        let i = 0;
        let fbIn;
        let fbOut;
        renderLoop(30, (deltaT: number) => {
            i += 1;

            // framebuffer ping-pong
            if (i % 2 === 1) {
                fbIn = particleFb1;
                fbOut = particleFb2;
            } else {
                fbIn = particleFb2;
                fbOut = particleFb1;
            }

            // particle shader
            particleShader.textures[1].texture = fbIn.fbo.texture;
            particleShader.updateUniformData(gl, 'u_deltaT', [deltaT]);
            particleShader.bind(gl);
            particleShader.render(gl, null, fbOut.fbo);

            // texture to output
            textureMixShader.textures[1].texture = fbOut.fbo.texture;
            textureMixShader.bind(gl);
            textureMixShader.render(gl);
        });


        // making data available for later
        this.canvas = canvas;
        this.gl = gl;
        this.interpolationShader = interpolShader;
        this.particleShader = particleShader;
        this.interpolFb = interpolFb;
    }


    prepareFrame(frameState: FrameState): boolean {
        const c2pT = frameState.coordinateToPixelTransform;
        const worldToPixelTransform = [
            [c2pT[0],   c2pT[1],    0. ],
            [c2pT[2],   c2pT[3],    0. ],
            [c2pT[4],   c2pT[5],    1. ]
        ];
        this.interpolationShader.updateUniformData(this.gl, 'u_world2pix', flattenMatrix(worldToPixelTransform));
        this.interpolationShader.bind(this.gl);
        this.interpolationShader.render(this.gl, [0, 0, 0, 0], this.interpolFb.fbo);
        return true;
    }


    renderFrame(frameState: FrameState, target: HTMLElement): HTMLElement {
        this.transformCanvas(frameState);
        return this.canvas;
    }


    private pointsToObservations(features: Feature<Point>[]): number[][] {

        const pointToObservation = (feature: Feature<Point>): number[] => {
            const coordinates = feature.getGeometry().getCoordinates();
            const props = feature.getProperties();
            return [coordinates[0], coordinates[1], props.wind[0], props.wind[1]];
        };

        const coordinates = features.map(f => f.getGeometry().getCoordinates());
        const delauney = Delaunator.from(coordinates);
        const indices = delauney.triangles;
        const aObservations = [];
        for (const i of indices) {
            const o = pointToObservation(features[i]);
            aObservations.push(o);
        }

        return aObservations;
    }

    private transformCanvas(frameState: FrameState): void {
        const layerState = frameState.layerStatesArray[frameState.layerIndex];
        const pixelRatio = frameState.pixelRatio;
        const size = frameState.size;
        const width = Math.round(size[0] * pixelRatio);
        const height = Math.round(size[1] * pixelRatio);
        const opacity = layerState.opacity;

        // this.canvas.width = width;
        // this.canvas.height = height;
        this.canvas.style.opacity = opacity;

        // @TODO: update shader parameters
    }

}
