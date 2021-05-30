'use strict'

import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/build/three.module.js';

import {
  OrbitControls
} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/controls/OrbitControls.js';

// rect area light은 OrbitControls처럼 별도로 데이터를 불러와야 하고, 헬퍼 객체도 별도로 불러와야 함.
import {
  RectAreaLightUniformsLib
} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/lights/RectAreaLightUniformsLib.js';

import {
  RectAreaLightHelper
} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/helpers/RectAreaLightHelper.js';

import {
  GUI
} from 'https://threejsfundamentals.org/threejs/../3rdparty/dat.gui.module.js';

function main() {
  const canvas = document.querySelector('#canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas
  });
  RectAreaLightUniformsLib.init(); // 모듈을 불러온 후 init ㅔㅁ소드를 호출해서 데이터를 불러와야 함.

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
    // rect area light은 standard 및 physical material만 지원하기 때문에 모든 퐁-머티리얼을 스탠다드 머티리얼로 바꿔줄 것.
    const planeMat = new THREE.MeshStandardMaterial({
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
    const cubeMat = new THREE.MeshStandardMaterial({
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
    const sphereMat = new THREE.MeshStandardMaterial({
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

  // dat.GUI에서 각도값을 받아온 뒤 라디안으로 변환하여 해당 속성에 할당해주는 헬퍼 클래스
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

  // rect area light: 이름 그대로 사각 형태의 조명. 형광등, 천장 유리를 통과하는 태양빛을 주로 표현.
  // 사각형 조명이기 때문에 width, height값을 받아야 함.
  {
    const color = 0xFFFFFF;
    const intensity = 5;
    const width = 12;
    const height = 4;
    const light = new THREE.RectAreaLight(color, intensity, width, height);
    light.position.set(0, 10, 0);
    light.rotation.x = THREE.MathUtils.degToRad(-90); // planeMesh와 마찬가지로 XZ축을 기준으로 하기 위해서 조명의 각도를 X축에서 -90도만큼 회전시킨 것.
    scene.add(light);
    // 참고로 rect area light는 target을 사용하지 않음.

    // rect area light도 헬퍼 객체가 존재함
    const helper = new RectAreaLightHelper(light);
    light.add(helper);
    // 다른 조명들은 헬퍼 객체가 직접 조명을 자식으로 두지만, RectAreaLightHelper는 해당 조명의 자식으로 직접 추가해줘야 함.
    // 대신 씬에다가 헬퍼를 따로 추가할 필요는 없어지겠지.

    const gui = new GUI();
    gui.addColor(new ColorGUIHelper(light, 'color'), 'value').name('color'); // GUI.addColor() 메소드는 일반적인 입력폼이 아니라 color picker 입력폼을 생성해 줌.
    gui.add(light, 'intensity', 0, 10, 0.01);
    gui.add(light, 'width', 0, 20);
    gui.add(light, 'height', 0, 20); // intensity, width, height 모두 입력폼으로 받을 수 있도록 추가해 줌.
    gui.add(new DegRadHelper(light.rotation, 'x'), 'value', -180, 180).name('x rotation');
    gui.add(new DegRadHelper(light.rotation, 'y'), 'value', -180, 180).name('y rotation');
    gui.add(new DegRadHelper(light.rotation, 'z'), 'value', -180, 180).name('z rotation');

    makeXYZGUI(gui, light.position, 'position'); // 타겟이 필요없는 조명이니 위치값만 입력폼으로 받으면 됨.
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