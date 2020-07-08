import { Feature } from 'ol';
import { FrameState } from 'ol/PluggableMap';
import LayerRenderer from 'ol/renderer/Layer';
import VectorLayer from 'ol/layer/Vector';
import { WebGLRenderer, PerspectiveCamera, Scene, BoxGeometry, MeshBasicMaterial, Mesh, Renderer, Camera, DirectionalLight, MeshPhongMaterial } from 'three';

export class BarsLayer extends VectorLayer {
    constructor(options) {
        super(options);
    }

    createRenderer(): LayerRenderer {
        return new ThreeJsRenderer(this);
    }
}


export class ThreeJsRenderer extends LayerRenderer {

    readonly canvas: HTMLCanvasElement;
    readonly scene: Scene;
    readonly renderer: Renderer;
    readonly camera: Camera;

    constructor(layer: VectorLayer) {
        super(layer);

        // setting up canvas
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 800;
        canvas.style.position = 'absolute';

        // setting up three js
        const renderer = new WebGLRenderer({canvas, alpha: true});
        const camera = new PerspectiveCamera(75, 2, 0.1, 5);
        camera.position.z = 2;
        const scene = new Scene();
        const geometry = new BoxGeometry(1, 1, 1);
        const material = new MeshPhongMaterial({color: 0x44aa88});
        const cube = new Mesh(geometry, material);
        scene.add(cube);
        const light = new DirectionalLight(0xFFFFFF, 1);
        light.position.set(-1, 2, 4);
        scene.add(light);

        // keeping for later
        this.canvas = canvas;
        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;
    }

    prepareFrame(frameState: FrameState): boolean {
        const c2pT = frameState.coordinateToPixelTransform;
        const worldToPixelTransform = [
            [c2pT[0],   c2pT[1],    0. ],
            [c2pT[2],   c2pT[3],    0. ],
            [c2pT[4],   c2pT[5],    1. ]
        ];
        return true;
    }


    renderFrame(frameState: FrameState, target: HTMLElement): HTMLElement {
        this.renderer.render(this.scene, this.camera);
        return this.canvas;
    }

}
