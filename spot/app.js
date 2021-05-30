'use strict'

import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/build/three.module.js';

import {
  OrbitControls
} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/controls/OrbitControls.js';

import {
  GUI
} from 'https://threejsfundamentals.org/threejs/../3rdparty/dat.gui.module.js';

function main() {
  const canvas = document.querySelector('#canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas
  });

  // camera
  const fov = 45;
  const aspect = 2;
  const near = 0.1;
  const far = 100;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0, 10, 20);

  // orbit controls
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 5, 0); // camera나 object의 .lookAt()처럼 OrbitControls의 타겟? 시점?의 위치를 바꿔주는 것.
  controls.update(); // OrbitControls에서 카메라 이동에 관하여 어떤 값이던 수정해줬으면 .update()를 호출해줘야 그 값이 적용됨.

  // scene을 생성하고 배경색을 black으로 할당함.
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('black');

  // 텍스쳐를 로드한 뒤, 땅의 역할을 할 PlaneGeometry를 만들어서 material에 할당함.
  {
    const planeSize = 40;

    const loader = new THREE.TextureLoader();
    const texture = loader.load('./image/checker.png');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    const repeats = planeSize / 2;
    texture.repeat.set(repeats, repeats);
    // 2*2의 텍스쳐를 40*40 평면 지오메트리에 x, y축 각각에 20회씩 반복하도록 설정했으니 평면 한 칸에 텍스쳐 하나가 정확히 렌더될거임.

    const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
    const planeMat = new THREE.MeshPhongMaterial({
      map: texture,
      side: THREE.DoubleSide // 평면 지오메트리에 사용되는 머티리얼이기 때문에 양면 모두 렌더링하는 옵션을 지정해준 것.
    });
    const mesh = new THREE.Mesh(planeGeo, planeMat);
    mesh.rotation.x = Math.PI * -0.5; // planeGeometry는 기본적으로 XY축을 기준으로 하니까, XZ축을 기준으로 하려면 평면을 X축으로 -90도 회전시켜야 함. 이거는 기억해두기!
    scene.add(mesh);
  }

  // create cube
  {
    const cubeSize = 4;
    const cubeGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const cubeMat = new THREE.MeshPhongMaterial({
      color: '#8AC'
    });
    const mesh = new THREE.Mesh(cubeGeo, cubeMat);
    mesh.position.set(cubeSize + 1, cubeSize / 2, 0);
    scene.add(mesh);
  }

  // create sphere
  {
    const sphereRadius = 3;
    const sphereWidthDivision = 32;
    const sphereHeightDivision = 16;
    const sphereGeo = new THREE.SphereGeometry(sphereRadius, sphereWidthDivision, sphereHeightDivision);
    const sphereMat = new THREE.MeshPhongMaterial({
      color: '#CA8'
    });
    const mesh = new THREE.Mesh(sphereGeo, sphereMat);
    mesh.position.set(-sphereRadius - 1, sphereRadius + 2, 0);
    scene.add(mesh);
  }

  // dat.GUI를 이용해서 light의 color, intensity값을 조절할 수 있는 ui를 만들기 위해 color에 관한 헬퍼 클래스를 만든 것.
  class ColorGUIHelper {
    constructor(object, prop) {
      this.object = object;
      this.prop = prop;
    }

    get value() {
      return `#${this.object[this.prop].getHexString()}`
      // Color.getHexString()은 컬러값을 어떤 형태로 넣든 'ffffff' 이런식으로 #을 제외한 문자열로 변환해서 return해줌.
      // 근데 이걸 변환해서 light.color.set()에다가 넣으려면 '#ffffff'이 형태로 넣어줘야 하기 때문에
      // getter 메소드에서 gui로부터 받은 컬러값을 '#ffffff' 이 형태로 변환한 다음에 setter로 리턴해주는 거임.
    }

    set value(hexString) {
      this.object[this.prop].set(hexString);
    }
  }

  // 원뿔의 내각을 dat.GUI로 받아오면 그거를 라디안으로 변환해서 SpotLight.angle값에 넣어주는 헬퍼 클래스를 만듦.
  class DegRadHelper {
    constructor(obj, prop) {
      this.obj = obj;
      this.prop = prop;
    }

    get value() {
      return THREE.MathUtils.radToDeg(this.obj[this.prop]);
    }

    set value(v) {
      this.obj[this.prop] = THREE.MathUtils.degToRad(v);
    }
  }

  // 조명과 타겟의 위치를 둘다 gui로 값을 조절할 수 있도록 해봄. 
  function makeXYZGUI(gui, vector3, name, onChangeFn) {
    const folder = gui.addFolder(name); // 조명과 타겟 각각의 위치값 입력폼을 폴더 형태로 만들어주고,
    folder.add(vector3, 'x', -10, 10).onChange(onChangeFn);
    folder.add(vector3, 'y', -10, 10).onChange(onChangeFn);
    folder.add(vector3, 'z', -10, 10).onChange(onChangeFn);
    // 폴더 안에 vector3 객체를 인자로 받아 vector3의 x,y,z값을 dat.GUI의 입력폼으로 각각 받을 수 있도록 할거임.
    // 이 때, 시각화 헬퍼 객체의 바뀐 위치값을 씬에서 적용하려면 헬퍼 객체의 .update() 메서드를 수동으로 호출해줘야 함.
    // 그래서 값이 바뀔때마다 호출되는 onChange 메소드에 onChangeFn 함수인자 자리에 후술할 updateLight() 함수를 넣어줘서
    // 값이 바뀔 때마다 updateLight() 함수가 호출되어 helper.update()를 수동으로 해주는거임.
    folder.open(); // 폴더 입력폼은 처음부터 열려있는 상태로 시작할거임. 
  }

  // spot light: 원뿔 안의 point light. point light과의 차이점은 원뿔 안에서만 빛이 난다는 점.
  // spot light의 원뿔은 외부 원뿔/내부 원뿔로 나뉨.
  // 빛의 밝기는 내부 원뿔에서 가장 세고, 외부 원뿔에 가까워질수록 0까지 낮아짐. 
  {
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.SpotLight(color, intensity);
    light.position.set(0, 10, 0);
    light.target.position.set(-5, 0, 0);
    scene.add(light);
    scene.add(light.target);
    // spot light도 directional light처럼 목표 위치를 정해주고, 그거를 따로 씬에 추가해줘야 함.
    // 이렇게 하면 원뿔의 밑면이 해당 목표물을 바라보게 조명이 렌더됨.

    // spot light도 헬퍼 객체가 존재함.
    const helper = new THREE.SpotLightHelper(light);
    scene.add(helper);

    function updateLight() {
      light.target.updateMatrixWorld();
      helper.update();
    }
    updateLight(); // 일단 앞에서 light.taget과 helper의 초기값이 지정된 상태니까 한 번 update를 호출해줘야 겠지.

    const gui = new GUI();
    gui.addColor(new ColorGUIHelper(light, 'color'), 'value').name('color'); // GUI.addColor() 메소드는 일반적인 입력폼이 아니라 color picker 입력폼을 생성해 줌.
    gui.add(light, 'intensity', 0, 2, 0.01);
    gui.add(light, 'distance', 0, 40).onChange(updateLight);
    gui.add(new DegRadHelper(light, 'angle'), 'value', 0, 90).name('angle').onChange(updateLight); // angle값이 바뀌면 헬퍼 객체를 따로 업데이트해줘야 변경된 각도값이 반영되서 시각화됨.
    gui.add(light, 'penumbra', 0, 1, 0.01);
    // penumbra(반음영) 속성도 입력폼을 받아서 값을 조절할 수 있도록 함.
    // 얘는 뭐냐면 내부 원뿔의 크기 = penumbra(반음영)이 외부 원뿔에 대해 어느 지점에 위치하는지의 비율로 지정해 사용함.
    // 즉, penumbra가 0이면 반음영이 외부원뿔과 크기가 동일함을, 1이면 반음영이 중앙에 위치하여 빛이 중앙에서부터 외부 원뿔까지 희미해짐을 의미.
    // 만약 0.5라면 중앙과 외부 원뿔 사이 50% 지점에 반음영이 시작하여 빛이 점점 희미해짐을 의미.

    makeXYZGUI(gui, light.position, 'position', updateLight);
    makeXYZGUI(gui, light.target.position, 'target', updateLight);
  }

  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  function animate() {
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    renderer.render(scene, camera);

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

main();